import { Server as WebSocketServer, WebSocket } from 'ws';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { orders, users, restaurants } from '../../shared/schema';
import type { InferSelectModel, SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { OrderTrackingData } from '../../shared/types/order';

type OrdersTable = typeof orders;
type RestaurantsTable = typeof restaurants;

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: any;
  location?: { lat: number; lng: number };
};

type Restaurant = {
  id: string;
  name: string;
  phone: string;
  location?: { lat: number; lng: number };
};

interface Order {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
  userId: string;
  restaurantId: string;
  total: number;
  estimatedDeliveryTime?: Date | null;
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    location?: {
      lat: number;
      lng: number;
    };
    [key: string]: any;
  };
  metadata?: Record<string, unknown>;
}

export interface OrderWithRelations extends Order {
  user?: User;
  restaurant?: Restaurant;
  items?: any[];
}

export interface Location {
  lat: number;
  lng: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

// OrderTrackingData interface moved to shared/types/order.ts

export class OrderTrackingService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private orderSubscriptions: Map<string, Set<string>> = new Map(); // orderId -> Set of clientIds
  private partnerLocations: Map<string, Location> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupWebSocketHandlers();
    
    // Handle upgrade from HTTP server
    server.on('upgrade', (request: any, socket: any, head: any) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      logger.info(`New WebSocket connection: ${clientId}`);

      // Handle incoming messages
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(clientId, data);
        } catch (error) {
          logger.error('Error handling WebSocket message:', error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });
    });
  }

  private async handleMessage(clientId: string, data: WebSocketMessage) {
    const { type, payload } = data;
    
    if (!type) {
      this.sendError(clientId, 'Message type is required');
      return;
    }

    switch (type) {
      case 'SUBSCRIBE_ORDER':
        await this.handleSubscribeOrder(clientId, payload.orderId);
        break;
      case 'UNSUBSCRIBE_ORDER':
        this.handleUnsubscribeOrder(clientId, payload.orderId);
        break;
      case 'UPDATE_LOCATION':
        await this.handleUpdateLocation(clientId, payload);
        break;
      default:
        this.sendError(clientId, 'Unknown message type');
    }
  }

  private async handleSubscribeOrder(clientId: string, orderId: string): Promise<void> {
    try {
      // Verify order exists and user has permission
      const order = await this.getOrderWithRestaurant(orderId);

      if (!order) {
        this.sendError(clientId, 'Order not found');
        return;
      }

      // Add client to order's subscription list
      if (!this.orderSubscriptions.has(orderId)) {
        this.orderSubscriptions.set(orderId, new Set());
      }
      this.orderSubscriptions.get(orderId)?.add(clientId);

      // Send current order status
      const orderData: OrderTrackingData = {
        orderId: order.id,
        status: order.status,
        updatedAt: order.updatedAt || new Date(),
        estimatedDeliveryTime: order.estimatedDeliveryTime || undefined,
        restaurantLocation: order.restaurant?.location,
        customerLocation: order.deliveryAddress?.location,
      };

      this.sendToClient(clientId, {
        type: 'ORDER_UPDATE',
        payload: orderData,
      });

      logger.info(`Client ${clientId} subscribed to order ${orderId}`);
    } catch (error) {
      logger.error('Error subscribing to order:', error);
      this.sendError(clientId, 'Failed to subscribe to order');
    }
  }

  private handleUnsubscribeOrder(clientId: string, orderId: string) {
    const subscriptions = this.orderSubscriptions.get(orderId);
    if (subscriptions) {
      subscriptions.delete(clientId);
      logger.info(`Client ${clientId} unsubscribed from order ${orderId}`);
    }
  }

  private async handleUpdateLocation(
    clientId: string,
    payload: { orderId: string; location: { lat: number; lng: number } }
  ) {
    const { orderId, location } = payload;
    
    // In a real app, verify the client is a delivery partner with access to this order
    this.partnerLocations.set(orderId, location);
    
    // Broadcast location update to all clients subscribed to this order
    this.broadcastOrderUpdate(orderId, {
      deliveryPartner: {
        id: clientId,
        location,
        // Additional partner details would be added here
      },
    });
  }

  public async updateOrderStatus(
    orderId: string,
    status: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      // Update order in database
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
          metadata: {
            ...metadata,
            lastStatusUpdate: new Date().toISOString(),
          },
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Broadcast update to all subscribed clients
      this.broadcastOrderUpdate(orderId, {
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        estimatedDeliveryTime: updatedOrder.estimatedDeliveryTime,
        metadata: updatedOrder.metadata,
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  private broadcastOrderUpdate(orderId: string, update: Partial<OrderTrackingData>): void {
    const subscribers = this.orderSubscriptions.get(orderId);
    if (subscribers) {
      subscribers.forEach((clientId) => {
        this.sendToClient(clientId, { type: 'ORDER_UPDATE', payload: update });
      });
    }
  }

  private sendToClient(clientId: string, message: unknown): void {
    const client = this.clients.get(clientId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private sendError(clientId: string, message: string): void {
    this.sendToClient(clientId, {
      type: 'ERROR',
      payload: { message },
    });
  }

  private handleDisconnect(clientId: string): void {
    // Remove client from all subscriptions
    this.orderSubscriptions.forEach((subscribers, orderId) => {
      if (subscribers.has(clientId)) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.orderSubscriptions.delete(orderId);
        }
      }
    });
    
    // Remove client from active connections
    this.clients.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`);
  }

  private async getOrderWithRestaurant(orderId: string): Promise<OrderWithRelations | null> {
    try {
      const order = await db.query.orders.findFirst({
        where: (ordersTable, { eq }) => 
          eq(ordersTable.id, orderId),
        with: {
          user: true,
          restaurant: true,
          items: true,
        },
      }) as OrderWithRelations | undefined;

      if (!order) return null;

      // Get restaurant details if not included
      let restaurant = order.restaurant as Restaurant | undefined;
      if (!restaurant && order.restaurantId) {
        const restaurantResult = await db.query.restaurants.findFirst({
          where: (r, { eq }) => 
            eq(r.id, order.restaurantId)
        });
        if (restaurantResult) {
          restaurant = restaurantResult as unknown as Restaurant;
        }
      }

      return order;
    } catch (error) {
      logger.error('Error getting order with restaurant:', error);
      return null;
    }
  }

}

// Singleton instance
let orderTrackingService: OrderTrackingService | null = null;

export function initializeOrderTracking(server: any) {
  if (!orderTrackingService) {
    orderTrackingService = new OrderTrackingService(server);
  }
  return orderTrackingService;
}

export function getOrderTrackingService(): OrderTrackingService {
  if (!orderTrackingService) {
    throw new Error('OrderTrackingService not initialized');
  }
  return orderTrackingService;
}
