import { WebSocketService } from '../lib/websocket/server';
import { db } from '../db';
import { orders, orderItems, orderStatusHistory } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError, ForbiddenError } from '../middleware/error-handler';

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface OrderPosition {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

export class OrderTrackingService {
  private wsService: WebSocketService;
  private orderPositions: Map<string, OrderPosition[]> = new Map();
  private deliveryAgentPositions: Map<string, OrderPosition> = new Map();

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.initializeEventHandlers();
  }

  private initializeEventHandlers() {
    // Order status updates
    this.wsService.on('order:status:update', async (client, data) => {
      try {
        if (!client.userId) {
          throw new ForbiddenError('Authentication required');
        }

        const { orderId, status, metadata } = data;
        
        // Verify the order exists and the user has permission to update it
        const order = await this.verifyOrderAccess(orderId, client.userId, client.roles);
        
        // Update order status in database
        await this.updateOrderStatus(orderId, status, client.userId, metadata);
        
        // Broadcast status update
        this.broadcastOrderUpdate(orderId, {
          type: 'order:status:updated',
          data: {
            orderId,
            status,
            updatedBy: client.userId,
            timestamp: new Date().toISOString(),
            metadata,
          },
        });

      } catch (error) {
        this.handleError(client, error, 'order:status:update');
      }
    });

    // Order location updates (from delivery agent)
    this.wsService.on('order:location:update', async (client, data) => {
      try {
        if (!client.userId) {
          throw new ForbiddenError('Authentication required');
        }

        const { orderId, latitude, longitude, accuracy, speed, heading, altitude } = data;
        
        // Verify the order exists and the user has permission to update it
        await this.verifyOrderAccess(orderId, client.userId, ['delivery_agent', 'admin']);
        
        // Update order position
        const position: OrderPosition = {
          latitude,
          longitude,
          timestamp: new Date(),
          accuracy,
          speed,
          heading,
          altitude,
        };
        
        this.updateOrderPosition(orderId, position, client.userId);
        
        // Broadcast position update
        this.broadcastOrderUpdate(orderId, {
          type: 'order:location:updated',
          data: {
            orderId,
            position,
            updatedBy: client.userId,
          },
        });

      } catch (error) {
        this.handleError(client, error, 'order:location:update');
      }
    });

    // Order subscription (client wants to receive updates for an order)
    this.wsService.on('order:subscribe', async (client, data) => {
      try {
        if (!client.userId) {
          throw new ForbiddenError('Authentication required');
        }

        const { orderId } = data;
        
        // Verify the order exists and the user has permission to view it
        await this.verifyOrderAccess(orderId, client.userId, client.roles);
        
        // Subscribe to order updates
        this.wsService.subscribe(client, `order:${orderId}`);
        
        // Send current order status
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
        });
        
        if (order) {
          this.wsService.send(client, {
            type: 'order:subscribed',
            data: {
              orderId,
              status: order.status,
              currentPosition: this.getLatestPosition(orderId),
            },
          });
        }

      } catch (error) {
        this.handleError(client, error, 'order:subscribe');
      }
    });
  }

  // Public API

  /**
   * Update order status and broadcast to subscribers
   */
  async updateOrderStatus(
    orderId: string, 
    status: string, 
    userId: string,
    metadata?: Record<string, any>
  ): Promise<OrderStatusUpdate> {
    return db.transaction(async (tx) => {
      // Update order status in database
      const [updatedOrder] = await tx.update(orders)
        .set({ 
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new NotFoundError('Order not found');
      }

      // Record status change in history
      const [statusUpdate] = await tx.insert(orderStatusHistory).values({
        id: `status_${uuidv4()}`,
        orderId,
        status,
        changedBy: userId,
        metadata: metadata || {},
        createdAt: new Date(),
      }).returning();

      // Broadcast update to all subscribers
      this.broadcastOrderUpdate(orderId, {
        type: 'order:status:updated',
        data: {
          orderId,
          status,
          updatedBy: userId,
          timestamp: statusUpdate.createdAt.toISOString(),
          metadata,
        },
      });

      return {
        orderId,
        status,
        timestamp: statusUpdate.createdAt,
        userId,
        metadata,
      };
    });
  }

  /**
   * Update order position (for delivery tracking)
   */
  updateOrderPosition(
    orderId: string, 
    position: OrderPosition, 
    updatedBy: string
  ): OrderPosition {
    // Store position in memory (in a production app, you might want to persist this)
    const positions = this.orderPositions.get(orderId) || [];
    positions.push(position);
    this.orderPositions.set(orderId, positions);
    
    // Also update the delivery agent's position
    this.deliveryAgentPositions.set(updatedBy, position);
    
    return position;
  }

  /**
   * Get the latest position for an order
   */
  getLatestPosition(orderId: string): OrderPosition | null {
    const positions = this.orderPositions.get(orderId);
    return positions && positions.length > 0 
      ? positions[positions.length - 1] 
      : null;
  }

  /**
   * Get position history for an order
   */
  getPositionHistory(orderId: string): OrderPosition[] {
    return this.orderPositions.get(orderId) || [];
  }

  /**
   * Get the current position of a delivery agent
   */
  getDeliveryAgentPosition(agentId: string): OrderPosition | null {
    return this.deliveryAgentPositions.get(agentId) || null;
  }

  // Helper methods

  private async verifyOrderAccess(
    orderId: string, 
    userId: string, 
    userRoles: string[] = []
  ) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Allow access if user is an admin, the order owner, or an assigned delivery agent
    const isAdmin = userRoles.includes('admin');
    const isOwner = order.userId === userId;
    const isDeliveryAgent = order.deliveryAgentId === userId && userRoles.includes('delivery_agent');

    if (!isAdmin && !isOwner && !isDeliveryAgent) {
      throw new ForbiddenError('You do not have permission to access this order');
    }

    return order;
  }

  private broadcastOrderUpdate(orderId: string, message: any) {
    this.wsService.publish(`order:${orderId}`, message);
  }

  private handleError(client: any, error: any, context: string) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorCode = error.code || 'internal_error';
    
    logger.error(`Error in ${context}:`, { 
      error: errorMessage, 
      userId: client.userId,
      clientId: client.id,
    });
    
    this.wsService.sendError(
      client,
      errorCode,
      errorMessage
    );
  }
}

// Example usage:
/*
// Initialize WebSocket server
const wss = new WebSocketServer({ port: 8080 });
const wsService = new WebSocketService(wss);

// Initialize order tracking service
const orderTrackingService = new OrderTrackingService(wsService);

// Client-side example (pseudo-code):
const ws = new WebSocket('ws://localhost:8080');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth:authenticate',
  data: { token: 'user-jwt-token' },
}));

// Subscribe to order updates
ws.send(JSON.stringify({
  type: 'order:subscribe',
  data: { orderId: 'order-123' },
}));

// Update order status (restaurant staff or admin)
ws.send(JSON.stringify({
  type: 'order:status:update',
  data: { 
    orderId: 'order-123',
    status: 'preparing',
    metadata: { estimatedTime: '30 minutes' },
  },
}));

// Update delivery location (delivery agent)
ws.send(JSON.stringify({
  type: 'order:location:update',
  data: { 
    orderId: 'order-123',
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  },
}));
*/

// In your API routes, you can inject the orderTrackingService and use it like this:
/*
// Update order status via HTTP API
export async function updateOrderStatus(
  req: Request,
  res: Response,
  orderTrackingService: OrderTrackingService
) {
  const { orderId } = req.params;
  const { status, metadata } = req.body;
  const userId = req.user.id; // From auth middleware
  
  try {
    const update = await orderTrackingService.updateOrderStatus(
      orderId,
      status,
      userId,
      metadata
    );
    
    res.json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
*/
