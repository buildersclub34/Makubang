
import { db } from './db';
import { orders, orderItems, menuItems, restaurants, users } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { WebSocketService } from './websocket';
import { DeliveryService } from './delivery-service';
import { NotificationService } from './notification-service';

export class OrderService {
  static async createOrder(orderData: {
    userId: string;
    restaurantId: string;
    items: Array<{ menuItemId: string; quantity: number; customizations?: string }>;
    deliveryAddress: any;
    paymentMethod: string;
    totalAmount: number;
    notes?: string;
  }) {
    const [order] = await db.insert(orders).values({
      userId: orderData.userId,
      restaurantId: orderData.restaurantId,
      status: 'pending',
      totalAmount: orderData.totalAmount,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      notes: orderData.notes,
      createdAt: new Date(),
    }).returning();

    // Insert order items
    for (const item of orderData.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        customizations: item.customizations,
      });
    }

    // Notify restaurant
    await NotificationService.sendOrderNotification(orderData.restaurantId, {
      type: 'new_order',
      orderId: order.id,
      message: `New order #${order.id} received`,
    });

    return order;
  }

  static async updateOrderStatus(orderId: string, status: string, userId?: string) {
    const [updatedOrder] = await db.update(orders)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    // Send real-time update
    const wsService = global.wsService as WebSocketService;
    if (wsService) {
      wsService.notifyOrderUpdate(orderId, {
        status,
        timestamp: new Date(),
      });
    }

    // Handle status-specific actions
    if (status === 'confirmed') {
      // Find and assign delivery partner
      await DeliveryService.assignDeliveryPartner(orderId);
    } else if (status === 'ready_for_pickup') {
      // Notify delivery partner
      await NotificationService.notifyDeliveryPartner(orderId, 'Order ready for pickup');
    } else if (status === 'delivered') {
      // Process payment and commissions
      await this.processOrderCompletion(orderId);
    }

    return updatedOrder;
  }

  static async getOrderDetails(orderId: string) {
    const [order] = await db.select({
      order: orders,
      restaurant: restaurants,
      user: users,
    })
    .from(orders)
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);

    if (!order) {
      throw new Error('Order not found');
    }

    const items = await db.select({
      orderItem: orderItems,
      menuItem: menuItems,
    })
    .from(orderItems)
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(eq(orderItems.orderId, orderId));

    return {
      ...order.order,
      restaurant: order.restaurant,
      user: order.user,
      items,
    };
  }

  static async getUserOrders(userId: string, limit: number = 20) {
    return db.select({
      order: orders,
      restaurant: restaurants,
    })
    .from(orders)
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  }

  static async getRestaurantOrders(restaurantId: string, status?: string) {
    let query = db.select({
      order: orders,
      user: users,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.restaurantId, restaurantId));

    if (status) {
      query = query.where(and(
        eq(orders.restaurantId, restaurantId),
        eq(orders.status, status)
      ));
    }

    return query.orderBy(desc(orders.createdAt));
  }

  private static async processOrderCompletion(orderId: string) {
    const order = await this.getOrderDetails(orderId);
    
    if (!order) return;

    // Calculate commissions
    const platformCommission = order.order.totalAmount * 0.15; // 15% platform fee
    const deliveryCommission = order.order.totalAmount * 0.05; // 5% delivery fee
    const restaurantAmount = order.order.totalAmount - platformCommission - deliveryCommission;

    // In production, process actual payments here
    console.log('Order completion processed:', {
      orderId,
      platformCommission,
      deliveryCommission,
      restaurantAmount,
    });

    // Send completion notifications
    await NotificationService.sendOrderCompletionNotification(order.order.userId, orderId);
  }

  static async cancelOrder(orderId: string, reason: string, cancelledBy: string) {
    const [cancelledOrder] = await db.update(orders)
      .set({ 
        status: 'cancelled',
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!cancelledOrder) {
      throw new Error('Order not found');
    }

    // Process refund if applicable
    await this.processRefund(orderId, reason);

    // Notify all parties
    await NotificationService.sendOrderCancellationNotification(orderId, reason);

    return cancelledOrder;
  }

  private static async processRefund(orderId: string, reason: string) {
    // In production, integrate with payment gateway for refunds
    console.log('Processing refund for order:', orderId, 'Reason:', reason);
  }

  static async getOrderAnalytics(restaurantId?: string, startDate?: Date, endDate?: Date) {
    // Implement comprehensive order analytics
    const analytics = {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      ordersByStatus: {},
      ordersByHour: {},
      topItems: [],
      cancellationRate: 0,
    };

    // In production, implement detailed analytics queries
    return analytics;
  }
}
