
import { db } from './db';
import { orders, restaurants, dishes, users, notifications } from '../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrderData {
  userId: string;
  restaurantId: string;
  items: Array<{
    dishId: string;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }>;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  deliveryInstructions?: string;
  paymentMethod: string;
}

export interface OrderItem extends CreateOrderData['items'][0] {
  dishName: string;
  dishImage?: string;
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  userId: string;
  restaurantId: string;
  status: string;
  items: OrderItem[];
  subtotal: string;
  deliveryFee: string;
  tax: string;
  discount: string;
  totalAmount: string;
  currency: string;
  deliveryAddress: any;
  deliveryInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryPartnerId?: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  restaurant?: {
    id: string;
    name: string;
    logo?: string;
    phone?: string;
  };
  user?: {
    id: string;
    name: string;
    phone?: string;
    email: string;
  };
  deliveryPartner?: {
    id: string;
    name: string;
    phone?: string;
  };
}

class OrderService {
  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderData): Promise<{ order: OrderWithDetails; orderNumber: string }> {
    try {
      // Generate unique order number
      const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Get restaurant details for validation
      const restaurant = await db.query.restaurants.findFirst({
        where: eq(restaurants.id, orderData.restaurantId),
      });

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Get dish details and validate items
      const dishIds = orderData.items.map(item => item.dishId);
      const dishesData = await db.query.dishes.findMany({
        where: and(
          inArray(dishes.id, dishIds),
          eq(dishes.restaurantId, orderData.restaurantId),
          eq(dishes.isAvailable, true)
        ),
      });

      if (dishesData.length !== orderData.items.length) {
        throw new Error('Some dishes are not available or do not belong to this restaurant');
      }

      // Calculate order totals
      let subtotal = 0;
      const orderItems: OrderItem[] = orderData.items.map(item => {
        const dish = dishesData.find(d => d.id === item.dishId);
        if (!dish) {
          throw new Error(`Dish ${item.dishId} not found`);
        }
        
        const itemTotal = Number(dish.price) * item.quantity;
        subtotal += itemTotal;

        return {
          ...item,
          price: Number(dish.price),
          dishName: dish.name,
          dishImage: dish.images ? (dish.images as string[])[0] : undefined,
        };
      });

      const deliveryFee = Number(restaurant.deliveryFee) || 0;
      const tax = subtotal * 0.18; // 18% GST
      const discount = 0; // Can be calculated based on coupons/promotions
      const totalAmount = subtotal + deliveryFee + tax - discount;

      // Create the order
      const [newOrder] = await db.insert(orders).values({
        id: uuidv4(),
        orderNumber,
        userId: orderData.userId,
        restaurantId: orderData.restaurantId,
        status: 'pending',
        items: orderItems,
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        tax: tax.toFixed(2),
        discount: discount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        currency: 'INR',
        deliveryAddress: orderData.deliveryAddress,
        deliveryInstructions: orderData.deliveryInstructions,
        estimatedDeliveryTime: new Date(Date.now() + restaurant.estimatedDeliveryTime * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Get full order details
      const orderWithDetails = await this.getOrderById(newOrder.id);
      if (!orderWithDetails) {
        throw new Error('Failed to retrieve created order');
      }

      // Send notification to restaurant
      await this.sendOrderNotification(newOrder.id, 'new_order');

      return { order: orderWithDetails, orderNumber };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails | null> {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          restaurant: {
            columns: { id: true, name: true, logo: true, phone: true },
          },
          user: {
            columns: { id: true, name: true, phone: true, email: true },
          },
          deliveryPartner: {
            columns: { id: true, name: true, phone: true },
          },
        },
      });

      return order as OrderWithDetails | null;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, newStatus: string, updateData?: Partial<{
    deliveryPartnerId: string;
    actualDeliveryTime: Date;
    estimatedDeliveryTime: Date;
  }>): Promise<OrderWithDetails | null> {
    try {
      const updatePayload: any = {
        status: newStatus,
        updatedAt: new Date(),
        ...updateData,
      };

      if (newStatus === 'delivered' && !updateData?.actualDeliveryTime) {
        updatePayload.actualDeliveryTime = new Date();
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updatePayload)
        .where(eq(orders.id, orderId))
        .returning();

      if (!updatedOrder) {
        throw new Error('Order not found');
      }

      // Send status update notification
      await this.sendOrderNotification(orderId, 'status_update', { status: newStatus });

      return await this.getOrderById(orderId);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get orders for a user
   */
  async getUserOrders(userId: string, limit = 20, offset = 0): Promise<{
    orders: OrderWithDetails[];
    total: number;
  }> {
    try {
      const [ordersList, [{ count }]] = await Promise.all([
        db.query.orders.findMany({
          where: eq(orders.userId, userId),
          with: {
            restaurant: {
              columns: { id: true, name: true, logo: true, phone: true },
            },
          },
          orderBy: desc(orders.createdAt),
          limit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(eq(orders.userId, userId)),
      ]);

      return {
        orders: ordersList as OrderWithDetails[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return { orders: [], total: 0 };
    }
  }

  /**
   * Get orders for a restaurant
   */
  async getRestaurantOrders(restaurantId: string, status?: string, limit = 20, offset = 0): Promise<{
    orders: OrderWithDetails[];
    total: number;
  }> {
    try {
      const whereCondition = status 
        ? and(eq(orders.restaurantId, restaurantId), eq(orders.status, status))
        : eq(orders.restaurantId, restaurantId);

      const [ordersList, [{ count }]] = await Promise.all([
        db.query.orders.findMany({
          where: whereCondition,
          with: {
            user: {
              columns: { id: true, name: true, phone: true, email: true },
            },
            deliveryPartner: {
              columns: { id: true, name: true, phone: true },
            },
          },
          orderBy: desc(orders.createdAt),
          limit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(whereCondition),
      ]);

      return {
        orders: ordersList as OrderWithDetails[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      return { orders: [], total: 0 };
    }
  }

  /**
   * Get orders for delivery partner
   */
  async getDeliveryPartnerOrders(deliveryPartnerId: string, status?: string): Promise<OrderWithDetails[]> {
    try {
      const whereCondition = status
        ? and(eq(orders.deliveryPartnerId, deliveryPartnerId), eq(orders.status, status))
        : eq(orders.deliveryPartnerId, deliveryPartnerId);

      const ordersList = await db.query.orders.findMany({
        where: whereCondition,
        with: {
          restaurant: {
            columns: { id: true, name: true, logo: true, phone: true },
          },
          user: {
            columns: { id: true, name: true, phone: true },
          },
        },
        orderBy: desc(orders.createdAt),
      });

      return ordersList as OrderWithDetails[];
    } catch (error) {
      console.error('Error fetching delivery partner orders:', error);
      return [];
    }
  }

  /**
   * Assign delivery partner to order
   */
  async assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<OrderWithDetails | null> {
    try {
      // Verify delivery partner exists and has the right role
      const deliveryPartner = await db.query.users.findFirst({
        where: and(
          eq(users.id, deliveryPartnerId),
          eq(users.role, 'delivery_partner')
        ),
      });

      if (!deliveryPartner) {
        throw new Error('Delivery partner not found or invalid role');
      }

      return await this.updateOrderStatus(orderId, 'picked_up', {
        deliveryPartnerId,
      });
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<OrderWithDetails | null> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order in ${order.status} status`);
      }

      return await this.updateOrderStatus(orderId, 'cancelled');
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get order analytics for restaurant
   */
  async getRestaurantAnalytics(restaurantId: string, days = 30): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    popularDishes: Array<{ dishId: string; dishName: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total orders and revenue
      const [analytics] = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          totalRevenue: sql<number>`sum(CAST(${orders.totalAmount} AS DECIMAL))`,
          averageOrderValue: sql<number>`avg(CAST(${orders.totalAmount} AS DECIMAL))`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            sql`${orders.createdAt} >= ${startDate}`
          )
        );

      // Get orders by status
      const statusCounts = await db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            sql`${orders.createdAt} >= ${startDate}`
          )
        )
        .groupBy(orders.status);

      const ordersByStatus = statusCounts.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>);

      // TODO: Calculate popular dishes from order items
      const popularDishes: Array<{ dishId: string; dishName: string; count: number }> = [];

      return {
        totalOrders: analytics?.totalOrders || 0,
        totalRevenue: Number(analytics?.totalRevenue) || 0,
        averageOrderValue: Number(analytics?.averageOrderValue) || 0,
        ordersByStatus,
        popularDishes,
      };
    } catch (error) {
      console.error('Error fetching restaurant analytics:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {},
        popularDishes: [],
      };
    }
  }

  /**
   * Send order notification
   */
  private async sendOrderNotification(orderId: string, type: 'new_order' | 'status_update', data?: any) {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) return;

      let title: string;
      let message: string;
      let recipients: string[] = [];

      switch (type) {
        case 'new_order':
          title = 'New Order Received';
          message = `Order #${order.orderNumber} for ₹${order.totalAmount}`;
          recipients = [order.restaurant?.id || '']; // Notify restaurant owner
          break;
        case 'status_update':
          title = 'Order Status Updated';
          message = `Your order #${order.orderNumber} is now ${data?.status || order.status}`;
          recipients = [order.userId]; // Notify customer
          break;
      }

      // Insert notifications for recipients
      if (recipients.length > 0) {
        await db.insert(notifications).values(
          recipients.map(userId => ({
            id: uuidv4(),
            userId,
            type: type === 'new_order' ? 'order_created' : 'order_status_updated',
            title,
            message,
            metadata: { orderId: order.id, orderNumber: order.orderNumber },
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    } catch (error) {
      console.error('Error sending order notification:', error);
    }
  }
}

export const orderService = new OrderService();
export default orderService;
