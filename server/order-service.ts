
import { db } from './db';
import { orders, orderItems, menuItems, restaurants, users } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { PaymentService } from './payment-service';
import { DeliveryService } from './delivery-service';
import { pushNotificationService } from './push-notification-service';
import { WebSocketService } from './websocket';

export interface OrderRequest {
  userId: string;
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: string;
    specialInstructions?: string;
  }>;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
    landmark?: string;
  };
  paymentMethodId?: string;
  notes?: string;
  promocode?: string;
}

export interface OrderCalculation {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  breakdown: {
    itemTotal: number;
    taxes: number;
    fees: number;
    savings: number;
  };
}

export class OrderService {
  private paymentService: PaymentService;
  private deliveryService: DeliveryService;
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.paymentService = new PaymentService();
    this.deliveryService = new DeliveryService(wsService);
    this.wsService = wsService;
  }

  // Calculate order total with all fees and taxes
  async calculateOrderTotal(orderRequest: OrderRequest): Promise<OrderCalculation> {
    try {
      let subtotal = 0;
      const itemBreakdown = [];

      // Calculate item totals
      for (const item of orderRequest.items) {
        const [menuItem] = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.id, item.menuItemId))
          .limit(1);

        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }

        const itemTotal = parseFloat(menuItem.price) * item.quantity;
        subtotal += itemTotal;
        itemBreakdown.push({
          menuItemId: item.menuItemId,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity: item.quantity,
          total: itemTotal,
        });
      }

      // Calculate delivery fee
      const deliveryFee = this.calculateDeliveryFee(subtotal, orderRequest.deliveryAddress);

      // Calculate platform fee
      const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '5') / 100;
      const platformFee = subtotal * platformFeeRate;

      // Calculate GST
      const gstRate = parseFloat(process.env.GST_RATE || '18') / 100;
      const itemsWithGst = subtotal + platformFee;
      const gstAmount = itemsWithGst * gstRate;

      // Apply discounts (placeholder - implement promocode logic)
      const discountAmount = 0;

      const totalAmount = subtotal + deliveryFee + platformFee + gstAmount - discountAmount;

      return {
        subtotal,
        deliveryFee,
        platformFee,
        gstAmount,
        discountAmount,
        totalAmount,
        breakdown: {
          itemTotal: subtotal,
          taxes: gstAmount,
          fees: deliveryFee + platformFee,
          savings: discountAmount,
        },
      };
    } catch (error) {
      console.error('Error calculating order total:', error);
      throw new Error('Failed to calculate order total');
    }
  }

  // Create new order
  async createOrder(orderRequest: OrderRequest): Promise<any> {
    try {
      // Validate restaurant and menu items
      await this.validateOrderRequest(orderRequest);

      // Calculate order total
      const calculation = await this.calculateOrderTotal(orderRequest);

      // Check minimum order amount
      const minOrderAmount = parseFloat(process.env.MIN_ORDER_AMOUNT || '100');
      if (calculation.subtotal < minOrderAmount) {
        throw new Error(`Minimum order amount is ₹${minOrderAmount}`);
      }

      // Get restaurant details
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, orderRequest.restaurantId))
        .limit(1);

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Create order
      const orderId = crypto.randomUUID();
      const [order] = await db
        .insert(orders)
        .values({
          id: orderId,
          userId: orderRequest.userId,
          restaurantId: orderRequest.restaurantId,
          status: 'pending_payment',
          totalAmount: calculation.totalAmount.toString(),
          deliveryFee: calculation.deliveryFee.toString(),
          platformFee: calculation.platformFee.toString(),
          taxes: calculation.gstAmount.toString(),
          discountAmount: calculation.discountAmount.toString(),
          deliveryAddress: JSON.stringify(orderRequest.deliveryAddress),
          pickupAddress: JSON.stringify({
            street: restaurant.address,
            lat: parseFloat(restaurant.latitude || '0'),
            lng: parseFloat(restaurant.longitude || '0'),
          }),
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
          notes: orderRequest.notes,
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60000), // 45 minutes
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create order items
      const orderItemsData = [];
      for (const item of orderRequest.items) {
        const [menuItem] = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.id, item.menuItemId))
          .limit(1);

        orderItemsData.push({
          id: crypto.randomUUID(),
          orderId: orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          totalPrice: (parseFloat(menuItem.price) * item.quantity).toString(),
          customizations: item.customizations,
          specialInstructions: item.specialInstructions,
        });
      }

      await db.insert(orderItems).values(orderItemsData);

      // Create payment order
      const paymentOrder = await this.paymentService.createOrder({
        amount: calculation.totalAmount,
        orderId: orderId,
        userId: orderRequest.userId,
        description: `Order from ${restaurant.name}`,
        metadata: {
          restaurantId: orderRequest.restaurantId,
          restaurantName: restaurant.name,
          itemCount: orderRequest.items.length,
        },
      });

      // Return order with payment details
      return {
        order: {
          ...order,
          items: orderItemsData,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            image: restaurant.image,
          },
          calculation,
        },
        payment: paymentOrder,
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  // Confirm order after payment
  async confirmOrder(orderId: string, paymentDetails: any): Promise<any> {
    try {
      // Update order status
      const [order] = await db
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!order) {
        throw new Error('Order not found');
      }

      // Notify restaurant
      this.wsService.broadcastUpdate(`restaurant_${order.restaurantId}`, {
        type: 'new_order',
        orderId: orderId,
        order: order,
      });

      // Send confirmation notification to user
      await pushNotificationService.sendOrderNotification(
        order.userId,
        orderId,
        'confirmed'
      );

      // Auto-assign delivery partner after 5 minutes (simulation)
      setTimeout(async () => {
        try {
          await this.deliveryService.assignOrder(orderId);
        } catch (error) {
          console.error('Auto-assignment failed:', error);
        }
      }, 5 * 60 * 1000);

      return order;
    } catch (error) {
      console.error('Error confirming order:', error);
      throw new Error('Failed to confirm order');
    }
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<any> {
    try {
      const [order] = await db
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (!order) {
        throw new Error('Order not found');
      }

      // Broadcast update to all relevant parties
      this.wsService.broadcastUpdate(`order_${orderId}`, {
        type: 'status_update',
        orderId: orderId,
        status: status,
        timestamp: new Date(),
        notes: notes,
      });

      // Send notification to user
      await pushNotificationService.sendOrderNotification(
        order.userId,
        orderId,
        status
      );

      // If order is ready, notify delivery partner
      if (status === 'ready_for_pickup') {
        this.wsService.broadcastUpdate(`delivery_partner_${order.deliveryPartnerId}`, {
          type: 'order_ready',
          orderId: orderId,
          order: order,
        });
      }

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  // Cancel order
  async cancelOrder(orderId: string, reason: string, cancelledBy: 'user' | 'restaurant' | 'admin'): Promise<any> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      const cancellableStatuses = ['pending_payment', 'confirmed', 'preparing'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status
      await db
        .update(orders)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Process refund if payment was completed
      if (order.paymentStatus === 'completed') {
        // Implement refund logic
        console.log('Processing refund for order:', orderId);
      }

      // Notify all parties
      this.wsService.broadcastUpdate(`order_${orderId}`, {
        type: 'order_cancelled',
        orderId: orderId,
        reason: reason,
        cancelledBy: cancelledBy,
        timestamp: new Date(),
      });

      // Send notification to user
      await pushNotificationService.sendOrderNotification(
        order.userId,
        orderId,
        'cancelled'
      );

      return { success: true, order };
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  // Get order details
  async getOrder(orderId: string, userId?: string): Promise<any> {
    try {
      const [order] = await db
        .select({
          id: orders.id,
          status: orders.status,
          totalAmount: orders.totalAmount,
          deliveryFee: orders.deliveryFee,
          platformFee: orders.platformFee,
          taxes: orders.taxes,
          discountAmount: orders.discountAmount,
          deliveryAddress: orders.deliveryAddress,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          notes: orders.notes,
          estimatedDeliveryTime: orders.estimatedDeliveryTime,
          actualDeliveryTime: orders.actualDeliveryTime,
          createdAt: orders.createdAt,
          restaurant: {
            id: restaurants.id,
            name: restaurants.name,
            image: restaurants.image,
            phone: restaurants.phone,
          },
          user: {
            id: users.id,
            name: users.name,
            phone: users.phone,
          },
        })
        .from(orders)
        .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .where(
          userId 
            ? and(eq(orders.id, orderId), eq(orders.userId, userId))
            : eq(orders.id, orderId)
        )
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      // Get order items
      const items = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          customizations: orderItems.customizations,
          specialInstructions: orderItems.specialInstructions,
          menuItem: {
            id: menuItems.id,
            name: menuItems.name,
            image: menuItems.image,
            category: menuItems.category,
          },
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      return {
        ...order,
        items,
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new Error('Failed to fetch order');
    }
  }

  // Get user orders
  async getUserOrders(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const userOrders = await db
        .select({
          id: orders.id,
          status: orders.status,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          estimatedDeliveryTime: orders.estimatedDeliveryTime,
          restaurant: {
            id: restaurants.id,
            name: restaurants.name,
            image: restaurants.image,
            cuisine: restaurants.cuisineType,
          },
        })
        .from(orders)
        .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      return userOrders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  // Private helper methods
  private async validateOrderRequest(orderRequest: OrderRequest): Promise<void> {
    // Check if restaurant exists and is active
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(and(
        eq(restaurants.id, orderRequest.restaurantId),
        eq(restaurants.isActive, true)
      ))
      .limit(1);

    if (!restaurant) {
      throw new Error('Restaurant not found or inactive');
    }

    // Validate all menu items
    for (const item of orderRequest.items) {
      const [menuItem] = await db
        .select()
        .from(menuItems)
        .where(and(
          eq(menuItems.id, item.menuItemId),
          eq(menuItems.restaurantId, orderRequest.restaurantId),
          eq(menuItems.isAvailable, true)
        ))
        .limit(1);

      if (!menuItem) {
        throw new Error(`Menu item ${item.menuItemId} not found or unavailable`);
      }

      if (item.quantity <= 0) {
        throw new Error('Invalid quantity');
      }
    }
  }

  private calculateDeliveryFee(subtotal: number, deliveryAddress: any): number {
    const baseDeliveryFee = parseFloat(process.env.DELIVERY_FEE || '40');
    
    // Free delivery for orders above certain amount
    if (subtotal >= 500) {
      return 0;
    }

    // Distance-based delivery fee (simplified)
    // In production, calculate actual distance to restaurant
    return baseDeliveryFee;
  }
}
