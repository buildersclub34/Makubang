import { WebSocketService } from '../websocket';
import { Types, startSession, ClientSession, Document, ObjectId, Model, UpdateWriteOpResult } from 'mongoose';
import { Order, IOrder as IOrderBase, IOrderItem as IOrderItemBase } from '../models/order.model';
import { logger } from '../utils/logger';

// Define model type
type AnyModel = Model<any>;

// Define types to match the order model
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
type PaymentMethod = 'cash' | 'card' | 'online';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Define interfaces for order relationships
interface IOrderUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
}

interface IOrderRestaurant {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
}

interface IOrderDeliveryPartner {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
}

interface IOrderMenuItem {
  _id: Types.ObjectId;
  name: string;
  description: string | null;
}

interface IOrderItem extends IOrderItemBase {
  _id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  [key: string]: any; // Add index signature to handle any additional properties
}

interface IOrderItemWithMenu extends IOrderItem {
  menuItem: IOrderMenuItem | null;
  addons?: Array<{
    id: Types.ObjectId;
    name: string;
    price: number;
  }>;
}

// Define a union type for document or ObjectId references
type DocumentOrId<T> = T | Types.ObjectId;

// Define the base order interface that matches the model
interface IOrderWithRelations extends Omit<IOrderBase, 'user' | 'restaurant' | 'deliveryPartner' | 'items'> {
  user: IOrderUser | Types.ObjectId;
  restaurant: IOrderRestaurant | Types.ObjectId;
  deliveryPartner?: IOrderDeliveryPartner | Types.ObjectId | null;
  items: (IOrderItem & { 
    menuItemId: IOrderMenuItem | Types.ObjectId;
    menuItem?: IOrderMenuItem | null;
  })[];
  orderNumber?: string;
}

// Define model interfaces for better type safety
interface IDeliveryPartnerModel {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email: string;
  status: string;
}

interface IMenuItemModel {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
}

interface INotificationModel {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dummy model class that implements basic Mongoose Model methods
class DummyModel<T extends Document> extends Model<T> {
  static async findById(id: string | Types.ObjectId): Promise<any> {
    return { _id: new Types.ObjectId(id) } as any;
  }

  static async findOne(conditions?: any): Promise<any> {
    return { _id: new Types.ObjectId() } as any;
  }

  static async find(conditions?: any): Promise<any[]> {
    return [];
  }

  static async countDocuments(conditions?: any): Promise<number> {
    return 0;
  }

  static async create(doc: any): Promise<any> {
    return { ...doc, _id: new Types.ObjectId() };
  }

  static async findByIdAndUpdate(
    id: string | Types.ObjectId,
    update: any,
    options?: any
  ): Promise<any> {
    return { ...update, _id: new Types.ObjectId(id) };
  }

  static async findOneAndUpdate(
    conditions: any,
    update: any,
    options?: any
  ): Promise<any> {
    return { ...update, _id: new Types.ObjectId() };
  }

  static async findByIdAndDelete(id: string | Types.ObjectId): Promise<any> {
    return { _id: new Types.ObjectId(id) };
  }

  static async deleteMany(conditions?: any): Promise<{ deletedCount: number }> {
    return { deletedCount: 0 };
  }

  static async deleteOne(conditions?: any): Promise<{ deletedCount: number }> {
    return { deletedCount: 0 };
  }

  static async updateOne(
    conditions: any,
    update: any,
    options?: any
  ): Promise<{ nModified: number }> {
    return { nModified: 0 };
  }

  static aggregate(pipeline: any[]): any {
    return {
      exec: () => Promise.resolve([]),
      then: (onFulfilled: any) => Promise.resolve([]).then(onFulfilled),
      catch: (onRejected: any) => Promise.resolve([]).catch(onRejected)
    };
  }
}

// Initialize models with proper typing using type assertion
let DeliveryPartner = DummyModel as unknown as Model<IDeliveryPartnerModel>;
let MenuItem = DummyModel as unknown as Model<IMenuItemModel>;
let Notification = DummyModel as unknown as Model<INotificationModel>;

// Load models asynchronously
(async () => {
  const modelConfigs = [
    { 
      model: 'DeliveryPartner', 
      paths: ['../models/delivery-partner.model', '../models/DeliveryPartner'] 
    },
    { 
      model: 'MenuItem', 
      paths: ['../models/menuItem.model', '../models/MenuItem'] 
    },
    { 
      model: 'Notification', 
      paths: ['../models/notification.model', '../models/Notification'] 
    }
  ];

  for (const config of modelConfigs) {
    let loaded = false;
    for (const path of config.paths) {
      try {
        const module = await import(path);
        const model = module.default || module[config.model];
        if (model) {
          switch(config.model) {
            case 'DeliveryPartner':
              DeliveryPartner = model;
              break;
            case 'MenuItem':
              MenuItem = model;
              break;
            case 'Notification':
              Notification = model;
              break;
          }
          loaded = true;
          logger.info(`Successfully loaded model: ${config.model}`);
          break;
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }
    if (!loaded) {
      logger.warn(`Could not load model: ${config.model}, using dummy implementation`);
    }
  }
})();

export class OrderUpdateService {
  private wsService: WebSocketService;
  private session: Awaited<ReturnType<typeof startSession>> | null = null;

  constructor() {
    this.wsService = WebSocketService.getInstance();
  }

  private async startSession(): Promise<ClientSession> {
    if (!this.session) {
      this.session = await startSession();
      this.session.startTransaction();
    }
    return this.session;
  }

  private async endSession(): Promise<void> {
    if (this.session) {
      await this.session.endSession();
      this.session = null;
    }
  }

  /**
   * Update order status and notify relevant parties
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string, userRole: string, metadata: Record<string, unknown> = {}): Promise<IOrderWithRelations> {
    const session = await this.startSession();
    
    try {
      // Get the current order with user and restaurant details
      const order = await this.getOrderWithDetails(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Verify user has permission to update this order
      if (
        userRole !== 'admin' &&
        userRole !== 'support' &&
        order.user?._id.toString() !== userId &&
        order.restaurant?._id.toString() !== userId &&
        (order.deliveryPartner && order.deliveryPartner._id.toString() !== userId)
      ) {
        throw new Error('Unauthorized to update this order');
      }

      // Update the order status
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { 
          $set: { 
            status,
            updatedAt: new Date(),
            ...(Object.keys(metadata).length > 0 && { metadata })
          } 
        },
        { 
          new: true,
          session,
          populate: [
            { path: 'userId', select: 'name email phone' },
            { path: 'restaurantId', select: 'name address phone' },
            { path: 'deliveryPartnerId', select: 'name phone' }
          ]
        }
      ).lean().exec();
      
      if (!updatedOrder) {
        throw new Error('Failed to update order');
      }
      
      // Get the full order with relations
      const orderWithDetails = await this.getOrderWithDetails(orderId);
      
      if (!orderWithDetails) {
        throw new Error('Failed to retrieve updated order details');
      }
      
      try {
        // Handle status-specific logic
        await this.handleStatusSpecificUpdates(orderWithDetails, status, metadata);
        
        // Notify relevant parties
        await this.notifyOrderUpdate(orderWithDetails, status, metadata);
        
        await session.commitTransaction();
        return orderWithDetails;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      }
      
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      logger.error('Error updating order status:', error);
      throw error;
    } finally {
      await this.endSession();
    }
  }

  /**
   * Get order details with relations
   */
  async getOrderWithDetails(orderId: string): Promise<IOrderWithRelations | null> {
    try {
      if (!orderId || !Types.ObjectId.isValid(orderId)) {
        logger.warn(`Invalid orderId: ${orderId}`);
        return null;
      }
      
      const order = await Order.findById(orderId)
        .populate<{ userId: IOrderUser }>('userId', 'name email phone')
        .populate<{ restaurantId: IOrderRestaurant }>('restaurantId', 'name address phone')
        .populate<{ deliveryPartnerId?: IOrderDeliveryPartner }>('deliveryPartnerId', 'name phone')
        .populate<{ 'items.menuItemId': IOrderMenuItem | null }>('items.menuItemId', 'name description')
        .lean()
        .exec();

      if (!order) {
        logger.warn(`Order not found with id: ${orderId}`);
        return null;
      }

      type PopulatedOrder = IOrderBase & {
        userId: IOrderUser | Types.ObjectId;
        restaurantId: IOrderRestaurant | Types.ObjectId;
        deliveryPartnerId?: IOrderDeliveryPartner | Types.ObjectId | null;
        items: Array<IOrderItem & { menuItemId: IOrderMenuItem | Types.ObjectId | null }>;
      };

      const typedOrder = order as unknown as PopulatedOrder;

      const isObjectId = (value: any): value is Types.ObjectId => {
        return value && (value._bsontype === 'ObjectID' || value instanceof Types.ObjectId);
      };

      // Helper to safely get user data
      const getUserData = (userId: IOrderUser | Types.ObjectId): IOrderUser => {
        if (isObjectId(userId)) {
          return {
            _id: userId,
            name: 'Unknown',
            email: '',
            phone: ''
          } as IOrderUser;
        }
        return {
          _id: userId._id,
          name: userId.name,
          email: userId.email,
          phone: userId.phone || ''
        };
      };

      // Helper to safely get restaurant data
      const getRestaurantData = (restaurantId: IOrderRestaurant | Types.ObjectId): IOrderRestaurant => {
        if (isObjectId(restaurantId)) {
          return {
            _id: restaurantId,
            name: 'Unknown',
            address: '',
            phone: ''
          } as IOrderRestaurant;
        }
        return {
          _id: restaurantId._id,
          name: restaurantId.name,
          address: restaurantId.address || '',
          phone: restaurantId.phone || ''
        };
      };

      // Helper to safely get menu item data
      const getMenuItemData = (menuItemId: IOrderMenuItem | Types.ObjectId | null): IOrderMenuItem | null => {
        if (!menuItemId || isObjectId(menuItemId)) {
          return null;
        }
        return {
          _id: menuItemId._id,
          name: menuItemId.name,
          description: menuItemId.description || null
        };
      };

      // Helper to safely get delivery partner data
      const getDeliveryPartnerData = (deliveryPartnerId?: IOrderDeliveryPartner | Types.ObjectId | null) => {
        if (!deliveryPartnerId) return undefined;
        if (isObjectId(deliveryPartnerId)) {
          return {
            _id: deliveryPartnerId,
            name: 'Unknown',
            phone: ''
          };
        }
        return {
          _id: deliveryPartnerId._id,
          name: deliveryPartnerId.name,
          phone: deliveryPartnerId.phone || ''
        };
      };

      const result: IOrderWithRelations = {
        ...typedOrder,
        _id: typedOrder._id,
        status: typedOrder.status as OrderStatus,
        paymentStatus: typedOrder.paymentStatus as PaymentStatus,
        paymentMethod: typedOrder.paymentMethod as PaymentMethod,
        totalAmount: typedOrder.totalAmount,
        createdAt: typedOrder.createdAt,
        updatedAt: typedOrder.updatedAt,
        user: getUserData(typedOrder.userId),
        restaurant: getRestaurantData(typedOrder.restaurantId),
        items: typedOrder.items.map((item) => {
          const menuItem = getMenuItemData(item.menuItemId);
          return {
            ...item,
            _id: item._id || new Types.ObjectId(),
            menuItemId: menuItem ? menuItem._id : (isObjectId(item.menuItemId) ? item.menuItemId : new Types.ObjectId()),
            menuItem: menuItem
          } as IOrderItemWithMenu;
        }),
        deliveryPartner: getDeliveryPartnerData(typedOrder.deliveryPartnerId)
      };

      return result;
    } catch (error) {
      logger.error(`Error getting order details: ${error}`);
      throw error;
    }
  }

  /**
   * Update delivery location for an order
   */
  async updateDeliveryLocation(orderId: string, location: { lat: number; lng: number }, userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(orderId) || !Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid order or user ID');
      }

      const updated = await Order.updateOne(
        { _id: orderId },
        { 
          $set: { 
            'deliveryLocation': {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            updatedAt: new Date()
          } 
        }
      ).exec();

      if (updated.modifiedCount === 0) {
        logger.warn(`Failed to update delivery location for order ${orderId}`);
        return false;
      }

      // Notify relevant parties about the location update
      this.wsService.emit(`order:${orderId}`, {
        event: 'deliveryLocationUpdated',
        data: {
          orderId,
          location,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      logger.error('Error updating delivery location:', error);
      return false;
    }
  }

  /**
   * Get current order status
   */
  async getOrderStatus(orderId: string): Promise<{ status: OrderStatus; updatedAt: Date } | null> {
    try {
      if (!Types.ObjectId.isValid(orderId)) {
        throw new Error('Invalid order ID');
      }

      const order = await Order.findById(orderId, 'status updatedAt')
        .lean()
        .exec();

      if (!order) {
        return null;
      }

      return {
        status: order.status as OrderStatus,
        updatedAt: order.updatedAt
      };
    } catch (error) {
      logger.error('Error getting order status:', error);
      return null;
    }
  }

  /**
   * Handle status-specific updates and notifications
   */
  private async handleStatusSpecificUpdates(order: IOrderWithRelations, status: OrderStatus, metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      switch (status) {
        case 'confirmed':
          await this.handleOrderAccepted(order, metadata);
          break;
        case 'preparing':
          await this.handleOrderPreparing(order, metadata);
          break;
        case 'ready_for_pickup':
          await this.handleOrderReady(order, metadata);
          break;
        case 'out_for_delivery':
          await this.handleOutForDelivery(order, metadata);
          break;
        case 'delivered':
          await this.handleOrderDelivered(order, metadata);
          break;
        case 'cancelled':
          await this.handleOrderCancelled(order, metadata);
          break;
        default:
          logger.warn(`No specific handler for status: ${status}`);
          break;
      }
    } catch (error) {
      logger.error(`Error in handleStatusSpecificUpdates for status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Notify relevant parties about order update
   */
  private async notifyOrderUpdate(order: IOrderWithRelations, status: OrderStatus, metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      const notification = {
        userId: order.user._id,
        orderId: order._id,
        type: 'order_update',
        title: `Order ${status.toLowerCase()}`,
        message: `Your order #${order.orderNumber} has been updated to: ${status}`,
        read: false,
        metadata: {
          orderStatus: status,
          ...metadata
        }
      };

      // Save notification to database
      await Notification.create(notification);

      // Send real-time update via WebSocket
      this.wsService.sendToUser(
        order.user._id.toString(),
        'order:updated',
        { orderId: order._id, status, ...metadata }
      );
    } catch (error) {
      logger.error('Error notifying order update:', error);
      // Don't throw error to prevent blocking the main operation
    }
  }

  // Status-specific handler methods
  private async handleOrderAccepted(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any order accepted specific logic here
    logger.info(`Order ${order._id} accepted with metadata:`, metadata);
  }

  private async handleOrderPreparing(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any order preparing specific logic here
    logger.info(`Order ${order._id} is being prepared with metadata:`, metadata);
  }

  private async handleOrderReady(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any order ready specific logic here
    logger.info(`Order ${order._id} is ready for pickup with metadata:`, metadata);
  }

  private async handleOutForDelivery(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any out for delivery specific logic here
    logger.info(`Order ${order._id} is out for delivery with metadata:`, metadata);
  }

  private async handleOrderDelivered(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any order delivered specific logic here
    logger.info(`Order ${order._id} has been delivered with metadata:`, metadata);
  }

  private async handleOrderCancelled(order: IOrderWithRelations, metadata: Record<string, unknown> = {}): Promise<void> {
    // Add any order cancelled specific logic here
    logger.info(`Order ${order._id} has been cancelled with metadata:`, metadata);
  }
}

// Single instance is already created and exported above
