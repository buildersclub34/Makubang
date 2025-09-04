import { WebSocketService } from '../websocket';
import { ObjectId } from 'mongodb';
import connectDB, { getDB } from '../db-mongo';

// Define OrderStatus enum locally to avoid import issues
enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  ASSIGNED = 'ASSIGNED'
}

interface OrderWithRelations {
  _id: ObjectId;
  id: string;
  userId: ObjectId | string;
  restaurantId: ObjectId | string;
  deliveryPartnerId: ObjectId | string | null;
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
  metadata?: Record<string, any>; 
  rating: number | null;
  review: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    _id: ObjectId;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  restaurant: {
    _id: ObjectId;
    name: string;
    address: string;
    phone: string;
  } | null;
  items: Array<{
    _id: ObjectId;
    menuItemId: ObjectId;
    quantity: number;
    price: string;
    specialInstructions: string | null;
    menuItem: {
      _id: ObjectId;
      name: string;
      description: string | null;
    } | null;
  }>;
}

export class OrderUpdateService {
  private static instance: OrderUpdateService;
  private wsService: WebSocketService;
  private db: any;

  private constructor() {
    this.wsService = WebSocketService.getInstance();
    this.initializeDatabase();
  }

  public static getInstance(): OrderUpdateService {
    if (!OrderUpdateService.instance) {
      OrderUpdateService.instance = new OrderUpdateService();
    }
    return OrderUpdateService.instance;
  }

  private async initializeDatabase() {
    try {
      await connectDB();
      this.db = getDB();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string, userRole: string, metadata: any = {}) {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const session = this.db.client.startSession();
    
    try {
      session.startTransaction();
      
      // Get the current order with details
      const order = await this.getOrderWithDetails(orderId);
      
      // Verify user has permission to update this order
      if (
        userRole !== 'admin' &&
        userRole !== 'support' &&
        order.userId.toString() !== userId &&
        order.restaurantId.toString() !== userId &&
        (order.deliveryPartnerId && order.deliveryPartnerId.toString() !== userId)
      ) {
        throw new Error('Unauthorized to update this order');
      }

      // Update the order status
      const result = await this.db.collection('orders').findOneAndUpdate(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            status,
            updatedAt: new Date(),
            ...(metadata && { metadata })
          } 
        },
        { 
          returnDocument: 'after',
          session 
        }
      );
      
      const updatedOrder = result.value;
      if (!updatedOrder) {
        throw new Error('Order not found');
      }

      // Get the full order with relations
      const orderWithDetails = await this.getOrderWithDetails(orderId);
      
      // Handle status-specific logic
      await this.handleStatusSpecificUpdates(orderWithDetails, status, metadata);
      
      // Notify relevant parties
      await this.notifyOrderUpdate(orderWithDetails, status, metadata);
      
      await session.commitTransaction();
      return orderWithDetails;
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error updating order status:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async handleStatusSpecificUpdates(order: OrderWithRelations, status: OrderStatus, metadata: any) {
    switch (status) {
      case OrderStatus.CONFIRMED:
        await this.handleOrderAccepted(order, metadata);
        break;
      case OrderStatus.PREPARING:
        await this.handleOrderPreparing(order, metadata);
        break;
      case OrderStatus.READY_FOR_PICKUP:
        await this.handleOrderReadyForPickup(order, metadata);
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

  private async handleOrderAccepted(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.CONFIRMED,
      timestamp: new Date().toISOString(),
      data: {
        estimatedReadyTime: metadata.estimatedReadyTime,
        message: 'Your order has been accepted and is being prepared.'
      }
    });
  }

  private async handleOrderPreparing(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.PREPARING,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Your order is being prepared.',
        ...metadata
      }
    });
  }

  private async handleOrderReadyForPickup(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.READY_FOR_PICKUP,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Your order is ready for pickup!',
        ...metadata
      }
    });
  }

  private async handleOrderOutForDelivery(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.OUT_FOR_DELIVERY,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Your order is out for delivery!',
        ...metadata
      }
    });
  }

  private async handleOrderDelivered(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.DELIVERED,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Your order has been delivered!',
        ...metadata
      }
    });
  }

  private async handleOrderCancelled(order: OrderWithRelations, metadata: any) {
    const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
    this.wsService.sendToUser(userId, 'order:update', {
      orderId: order._id.toString(),
      status: OrderStatus.CANCELLED,
      timestamp: new Date().toISOString(),
      data: {
        reason: metadata.reason,
        refundStatus: metadata.refundStatus,
        message: 'Your order has been cancelled.'
      }
    });
  }

  private async notifyOrderUpdate(order: OrderWithRelations, status: OrderStatus, metadata: any) {
    try {
      const userId = order.userId instanceof ObjectId ? order.userId.toString() : order.userId;
      
      // Notify the customer
      if (userId) {
        this.wsService.sendToUser(userId, 'order:update', {
          orderId: order._id.toString(),
          status,
          timestamp: new Date().toISOString(),
          data: metadata
        });
      }

      // Notify the restaurant
      if (order.restaurantId) {
        const restaurantId = order.restaurantId instanceof ObjectId ? 
          order.restaurantId.toString() : order.restaurantId;
        this.wsService.sendToUser(restaurantId, 'order:update', {
          orderId: order._id.toString(),
          status,
          timestamp: new Date().toISOString(),
          data: metadata
        });
      }

      // Notify the delivery partner if assigned
      if (order.deliveryPartnerId) {
        const partnerId = order.deliveryPartnerId instanceof ObjectId ? 
          order.deliveryPartnerId.toString() : order.deliveryPartnerId;
        this.wsService.sendToUser(partnerId, 'order:update', {
          orderId: order._id.toString(),
          status,
          timestamp: new Date().toISOString(),
          data: metadata
        });
      }
    } catch (error) {
      console.error('Error notifying order update:', error);
      // Don't throw the error to prevent blocking the main operation
    }
  }

  async getOrderWithDetails(orderId: string): Promise<OrderWithRelations> {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const result = await this.db.collection('orders').aggregate([
      { $match: { _id: new ObjectId(orderId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $lookup: {
          from: 'orderItems',
          localField: '_id',
          foreignField: 'orderId',
          as: 'items'
        }
      },
      {
        $addFields: {
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    menuItem: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: {
                                      $lookup: {
                                        from: 'menuItems',
                                        localField: 'menuItemId',
                                        foreignField: '_id',
                                        as: 'menuItem'
                                      }
                                    },
                                    as: 'menuItem',
                                    cond: { $eq: ['$$menuItem._id', '$$item.menuItemId'] }
                                  }
                                },
                                as: 'm',
                                in: '$$m.menuItem'
                              }
                            },
                            as: 'menuItem',
                            cond: { $ne: ['$$menuItem', []] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]).next();

    if (!result) {
      throw new Error('Order not found');
    }

    return result as OrderWithRelations;
  }

  async updateDeliveryLocation(orderId: string, location: { lat: number; lng: number }, userId: string) {
    if (!this.db) {
      await this.initializeDatabase();
    }

    const order = await this.getOrderWithDetails(orderId);
    
    // Verify user has permission to update this order's location
    if (
      order.deliveryPartnerId && 
      order.deliveryPartnerId.toString() !== userId &&
      order.userId.toString() !== userId
    ) {
      throw new Error('Unauthorized to update delivery location');
    }

    const update = {
      $set: { 'trackingData.currentLocation': location },
      $push: {
        'trackingData.locationHistory': {
          $each: [{ ...location, timestamp: new Date() }],
          $slice: -50 // Keep last 50 location updates
        }
      }
    };

    const result = await this.db.collection('orders').findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      update,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Failed to update delivery location');
    }

    // Notify relevant parties about the location update
    await this.notifyOrderUpdate(
      await this.getOrderWithDetails(orderId),
      result.value.status as OrderStatus,
      { location, timestamp: new Date().toISOString() }
    );

    return {
      success: true,
      timestamp: new Date()
    };
  }
}

const orderUpdateService = OrderUpdateService.getInstance();
export default orderUpdateService;
