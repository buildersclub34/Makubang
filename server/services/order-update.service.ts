import { db } from '../db';
import { orders, orderItems, restaurants, users, menuItems } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { WebSocketService } from '../websocket';
import { OrderStatus } from '../../shared/types/order';

type OrderWithRelations = {
  id: string;
  userId: string;
  restaurantId: string;
  deliveryPartnerId: string | null;
  status: string;
  totalAmount: string;
  deliveryFee: string;
  platformFee: string;
  taxes: string;
  discountAmount: string;
  deliveryAddress: any;
  pickupAddress: any;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  estimatedDeliveryTime: Date | null;
  actualDeliveryTime: Date | null;
  trackingData: any;
  metadata?: Record<string, any>; // Add metadata field
  rating: number | null;
  review: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  restaurant: {
    id: string;
    name: string;
    phone: string;
  } | null;
  items: Array<{
    id: string;
    menuItemId: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    customizations: string | null;
    specialInstructions: string | null;
    menuItem: {
      id: string;
      name: string;
      description: string | null;
    } | null;
  }>;
};

export class OrderUpdateService {
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  /**
   * Update order status and notify relevant parties
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, metadata: any = {}) {
    try {
      // Update order status in database
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Handle specific status updates
      if (status === OrderStatus.DELIVERED) {
        updateData.actualDeliveryTime = new Date();
      } else if (status === OrderStatus.OUT_FOR_DELIVERY) {
        updateData.estimatedDeliveryTime = metadata.estimatedDeliveryTime || new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes
      }

      // Store metadata in trackingData
      if (Object.keys(metadata).length > 0) {
        const existingOrder = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
          columns: {
            trackingData: true
          }
        });

        updateData.trackingData = {
          ...(existingOrder?.trackingData || {}),
          [status]: {
            ...metadata,
            updatedAt: new Date().toISOString()
          }
        };
      }

      const [updatedOrder] = await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new Error('Order not found');
      }

      // Get order details with relations
      const orderWithDetails = await this.getOrderWithDetails(orderId);

      // Notify all connected clients about the status update
      this.wsService.notifyOrderUpdate(orderWithDetails);

      // Handle specific status updates
      await this.handleStatusSpecificUpdates(updatedOrder, status, metadata);

      return orderWithDetails;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get order details with relations
   */
  private async getOrderWithDetails(orderId: string): Promise<OrderWithRelations> {
    // Get order with user and restaurant details
    const orderResult = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          columns: {
            id: true,
            menuItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            customizations: true,
            specialInstructions: true,
          },
          with: {
            menuItem: {
              columns: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!orderResult) {
      throw new Error('Order not found');
    }

    return orderResult as unknown as OrderWithRelations;
  }

  /**
   * Handle status-specific updates and notifications
   */
  private async handleStatusSpecificUpdates(order: any, status: OrderStatus, metadata: any) {
    switch (status) {
      case OrderStatus.ACCEPTED:
        await this.handleOrderAccepted(order, metadata);
        break;
      case OrderStatus.PREPARING:
        await this.handleOrderPreparing(order, metadata);
        break;
      case OrderStatus.READY_FOR_PICKUP:
        await this.handleOrderReady(order, metadata);
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        await this.handleOrderOutForDelivery(order, metadata);
        break;
      case OrderStatus.DELIVERED:
        await this.handleOrderDelivered(order, metadata);
        break;
      case OrderStatus.CANCELLED:
        await this.handleOrderCancelled(order, metadata);
        break;
    }
  }

  private async handleOrderAccepted(order: any, metadata: any) {
    // Notify customer that their order has been accepted
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_ACCEPTED',
      data: {
        orderId: order.id,
        estimatedReadyTime: metadata.estimatedReadyTime,
        message: 'Your order has been accepted and is being prepared.'
      }
    });
  }

  private async handleOrderPreparing(order: any, metadata: any) {
    // Notify customer that their order is being prepared
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_PREPARING',
      data: {
        orderId: order.id,
        message: 'Your order is being prepared.'
      }
    });
  }

  private async handleOrderReady(order: any, metadata: any) {
    // Notify customer that their order is ready for pickup
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_READY',
      data: {
        orderId: order.id,
        message: 'Your order is ready for pickup!',
        pickupInstructions: metadata.pickupInstructions
      }
    });

    // If this is a delivery order, assign a delivery partner
    if (order.deliveryType === 'DELIVERY') {
      await this.assignDeliveryPartner(order.id, metadata);
    }
  }

  private async handleOrderOutForDelivery(order: any, metadata: any) {
    // Notify customer that their order is out for delivery
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_OUT_FOR_DELIVERY',
      data: {
        orderId: order.id,
        deliveryPartner: metadata.deliveryPartner,
        estimatedDeliveryTime: metadata.estimatedDeliveryTime,
        message: 'Your order is on its way!',
        trackingUrl: metadata.trackingUrl
      }
    });
  }

  private async handleOrderDelivered(order: OrderWithRelations, metadata: any) {
    // Update order with delivery completion details
    await db.update(orders)
      .set({
        status: OrderStatus.DELIVERED,
        actualDeliveryTime: new Date(),
        updatedAt: new Date(),
        trackingData: {
          ...(order.trackingData || {}),
          delivered: {
            ...metadata,
            deliveredAt: new Date().toISOString()
          }
        }
      })
      .where(eq(orders.id, order.id));

    // Notify customer that their order has been delivered
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_DELIVERED',
      data: {
        orderId: order.id,
        deliveredAt: new Date().toISOString(),
        message: 'Your order has been delivered!',
        ratingPrompt: true
      }
    });
  }

  private async handleOrderCancelled(order: any, metadata: any) {
    // Notify customer that their order has been cancelled
    this.wsService.sendToUser(order.userId, {
      type: 'ORDER_CANCELLED',
      data: {
        orderId: order.id,
        reason: metadata.reason,
        refundStatus: metadata.refundStatus,
        message: 'Your order has been cancelled.'
      }
    });
  }

  /**
   * Assign a delivery partner to an order
   */
  private async assignDeliveryPartner(orderId: string, metadata: any) {
    // In a real implementation, this would integrate with a delivery service API
    // and assign the nearest available delivery partner
    
    // For now, we'll simulate finding a delivery partner
    const deliveryPartner = {
      id: 'dp_' + Math.random().toString(36).substr(2, 9),
      name: 'Delivery Partner',
      phone: '+1234567890',
      vehicle: 'Bike',
      rating: 4.8,
      estimatedArrivalTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      currentLocation: {
        lat: 12.9716 + (Math.random() * 0.02 - 0.01), // Random location near the restaurant
        lng: 77.5946 + (Math.random() * 0.02 - 0.01)
      }
    };

    // Update order with delivery partner info
    const updateData = {
      deliveryPartnerId: deliveryPartner.id,
      status: OrderStatus.OUT_FOR_DELIVERY,
      estimatedDeliveryTime: deliveryPartner.estimatedArrivalTime,
      updatedAt: new Date(),
      trackingData: {
        ...(metadata?.trackingData || {}),
        assignedToDelivery: {
          partner: deliveryPartner,
          assignedAt: new Date().toISOString(),
          metadata: metadata || {}
        }
      }
    };

    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    // Notify the delivery partner (in a real app, this would be a push notification)
    this.wsService.sendToUser(deliveryPartner.id, {
      type: 'NEW_DELIVERY_ASSIGNED',
      data: {
        orderId,
        pickupLocation: metadata.pickupLocation,
        deliveryLocation: metadata.deliveryLocation,
        customer: metadata.customer,
        items: metadata.items,
        estimatedEarnings: metadata.estimatedEarnings
      }
    });

    return deliveryPartner;
  }

  /**
   * Update delivery partner's location
   */
  async updateDeliveryLocation(orderId: string, location: { lat: number; lng: number }) {
    const order = await this.getOrderWithDetails(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Get existing tracking data
    const orderData = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        trackingData: true
      }
    });

    // Update delivery partner's location in tracking data
    await db.update(orders)
      .set({
        updatedAt: new Date(),
        trackingData: {
          ...(orderData?.trackingData || {}),
          deliveryLocation: {
            ...(orderData?.trackingData?.deliveryLocation || {}),
            current: location,
            updatedAt: new Date().toISOString(),
            history: [
              ...(orderData?.trackingData?.deliveryLocation?.history || []),
              {
                location,
                timestamp: new Date().toISOString()
              }
            ].slice(-50) // Keep last 50 location updates
          }
        }
      })
      .where(eq(orders.id, orderId));

    // Notify the customer about the delivery partner's location
    this.wsService.sendToUser(order.userId, {
      type: 'DELIVERY_LOCATION_UPDATE',
      data: {
        orderId,
        location,
        updatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * Get real-time order status
   */
  async getOrderStatus(orderId: string, userId: string) {
    const order = await this.getOrderWithDetails(orderId);
    
    // Verify user has permission to view this order
    if (order.userId !== userId && order.restaurant?.id !== userId) {
      throw new Error('Unauthorized');
    }

    return {
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryPartner: order.metadata?.deliveryPartner,
      lastUpdated: order.updatedAt
    };
  }
}

export default OrderUpdateService;
