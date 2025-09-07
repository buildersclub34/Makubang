import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { 
  orders, 
  orderItems, 
  orderItemAddons, 
  orderStatusHistory,
  restaurants,
  users,
  menuItems,
  addons as addonsTable
} from '../../../shared/schema';
import { and, eq, desc, sql, inArray } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/express';
import { calculateGST } from '../utils/gstCalculator';
import logger from '../utils/logger';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../services/email.service';
import { sendPushNotification } from '../services/notification.service';

// Helper function to format order response
const formatOrderResponse = (order: any) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  userId: order.userId,
  restaurantId: order.restaurantId,
  status: order.status,
  orderType: order.orderType,
  deliveryAddress: order.deliveryAddress,
  deliveryInstructions: order.deliveryInstructions,
  scheduledFor: order.scheduledFor,
  subtotal: parseFloat(order.subtotal),
  tax: parseFloat(order.tax),
  deliveryFee: parseFloat(order.deliveryFee),
  discount: parseFloat(order.discount || 0),
  total: parseFloat(order.total),
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  paymentId: order.paymentId,
  isPrepaid: order.isPrepaid,
  items: order.items?.map((item: any) => ({
    id: item.id,
    menuItemId: item.menuItemId,
    name: item.menuItem?.name || item.name,
    description: item.menuItem?.description || item.description,
    price: parseFloat(item.price),
    quantity: item.quantity,
    specialInstructions: item.specialInstructions,
    addons: item.addons?.map((addon: any) => ({
      id: addon.addonId,
      name: addon.addon?.name || addon.name,
      price: parseFloat(addon.price),
      quantity: addon.quantity,
    })) || [],
  })) || [],
  statusHistory: order.statusHistory?.map((status: any) => ({
    status: status.status,
    timestamp: status.timestamp,
    notes: status.notes,
  })) || [],
  restaurant: order.restaurant ? {
    id: order.restaurant.id,
    name: order.restaurant.name,
    logo: order.restaurant.logo,
    contactNumber: order.restaurant.contactNumber,
    address: order.restaurant.address,
    city: order.restaurant.city,
    state: order.restaurant.state,
  } : null,
  user: order.user ? {
    id: order.user.id,
    name: order.user.name,
    email: order.user.email,
    phone: order.user.phone,
  } : null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

// Create a new order
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      restaurantId,
      orderType = 'delivery',
      deliveryAddress,
      deliveryInstructions,
      scheduledFor,
      paymentMethod = 'cod',
      isPrepaid = false,
      items = [],
      promoCode,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!restaurantId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID and at least one menu item are required',
      });
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Delivery address is required for delivery orders',
      });
    }

    // Check if restaurant exists and is open
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.isActive, true)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or not accepting orders',
      });
    }

    if (!restaurant.isOpen && !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant is currently closed. Please try again later or schedule your order.',
      });
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get all menu item IDs from the order
    const menuItemIds = items.map((item: any) => item.menuItemId);
    
    // Get all menu items with their current prices and availability
    const menuItemsList = await db.query.menuItems.findMany({
      where: and(
        inArray(menuItems.id, menuItemIds),
        eq(menuItems.restaurantId, restaurantId),
        eq(menuItems.isAvailable, true)
      ),
      with: {
        variants: true,
      },
    });

    // Create a map for quick lookup
    const menuItemsMap = new Map(menuItemsList.map(item => [item.id, item]));

    // Validate all items and calculate subtotal
    let subtotal = 0;
    const orderItemsWithPrices = [];
    const addonIds = [];

    for (const item of items) {
      const menuItem = menuItemsMap.get(item.menuItemId);
      
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          error: `Menu item with ID ${item.menuItemId} not found or not available`,
        });
      }

      // Find selected variant if any
      let variantPrice = 0;
      if (item.variantId && menuItem.variants) {
        const variant = menuItem.variants.find(v => v.id === item.variantId);
        if (!variant) {
          return res.status(400).json({
            success: false,
            error: `Variant with ID ${item.variantId} not found for menu item ${menuItem.name}`,
          });
        }
        variantPrice = Number(variant.price);
      }

      // Calculate item total (base price + variant price) * quantity
      const itemPrice = (Number(menuItem.price) + variantPrice) * item.quantity;
      subtotal += itemPrice;

      // Add to order items
      orderItemsWithPrices.push({
        ...item,
        price: Number(menuItem.price) + variantPrice,
        name: menuItem.name,
        description: menuItem.description,
      });

      // Collect addon IDs for validation
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach((addon: any) => {
          addonIds.push(addon.addonId);
        });
      }
    }

    // Validate and calculate addon prices if any
    let addonsTotal = 0;
    const addonsList = [];
    
    if (addonIds.length > 0) {
      const uniqueAddonIds = [...new Set(addonIds)];
      const addonsData = await db.query.addons.findMany({
        where: and(
          inArray(addonsTable.id, uniqueAddonIds),
          or(
            eq(addonsTable.restaurantId, restaurantId),
            isNull(addonsTable.restaurantId) // Global addons
          ),
          eq(addonsTable.isAvailable, true)
        ),
      });

      const addonsMap = new Map(addonsData.map(addon => [addon.id, addon]));

      // Validate addons and calculate total
      for (const item of orderItemsWithPrices) {
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            const addonData = addonsMap.get(addon.addonId);
            
            if (!addonData) {
              return res.status(400).json({
                success: false,
                error: `Addon with ID ${addon.addonId} not found or not available`,
              });
            }

            // Validate min/max selection
            if (addon.quantity < addonData.minSelection || addon.quantity > addonData.maxSelection) {
              return res.status(400).json({
                success: false,
                error: `Invalid quantity for addon ${addonData.name}. Must be between ${addonData.minSelection} and ${addonData.maxSelection}`,
              });
            }

            const addonTotal = Number(addonData.price) * addon.quantity;
            addonsTotal += addonTotal;

            addonsList.push({
              orderItemId: item.id || uuidv4(),
              addonId: addon.addonId,
              name: addonData.name,
              price: Number(addonData.price),
              quantity: addon.quantity,
              total: addonTotal,
            });
          }
        }
      }
    }

    // Calculate delivery fee (simplified - in a real app, this would be more complex)
    const deliveryFee = orderType === 'delivery' ? 
      (restaurant.deliveryFee || 0) : 0;

    // Apply promo code if provided (simplified)
    let discount = 0;
    if (promoCode) {
      // In a real app, validate promo code against database
      discount = 0; // Calculate based on promo code rules
    }

    // Calculate tax (using GST as an example)
    const tax = calculateGST(subtotal + addonsTotal - discount);

    // Calculate total
    const total = subtotal + addonsTotal + deliveryFee + tax - discount;

    // Generate order number (YYYYMMDD-XXXXXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `${dateStr}-${randomNum}`;

    // Start transaction for order creation
    const [newOrder] = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx.insert(orders).values({
        id: uuidv4(),
        orderNumber,
        userId,
        restaurantId,
        status: isPrepaid ? 'payment_pending' : 'confirmed',
        orderType,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        deliveryInstructions: deliveryInstructions || null,
        scheduledFor: scheduledFor || null,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        paymentMethod,
        paymentStatus: isPrepaid ? 'pending' : paymentMethod === 'cod' ? 'pending' : 'completed',
        paymentId: null, // Will be updated after payment processing
        isPrepaid,
        specialInstructions: specialInstructions || null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      // Create order items
      const createdItems = [];
      for (const item of orderItemsWithPrices) {
        const [orderItem] = await tx.insert(orderItems).values({
          id: uuidv4(),
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          description: item.description,
          price: item.price.toFixed(2),
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || null,
          variantId: item.variantId || null,
          variantName: item.variantName || null,
          createdAt: now,
          updatedAt: now,
        }).returning();

        createdItems.push(orderItem);
      }

      // Create order item addons
      for (const addon of addonsList) {
        const orderItem = createdItems.find(item => item.id === addon.orderItemId);
        if (orderItem) {
          await tx.insert(orderItemAddons).values({
            id: uuidv4(),
            orderItemId: orderItem.id,
            addonId: addon.addonId,
            name: addon.name,
            price: addon.price.toFixed(2),
            quantity: addon.quantity,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Create initial status history
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId: order.id,
        status: isPrepaid ? 'payment_pending' : 'confirmed',
        notes: 'Order created',
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      });

      return order;
    });

    // Get the full order with all relations
    const fullOrder = await getOrderById(newOrder.id);

    // Send order confirmation email (in background)
    try {
      await sendOrderConfirmationEmail(user.email, {
        orderNumber: fullOrder.orderNumber,
        userName: user.name,
        restaurantName: restaurant.name,
        orderDate: fullOrder.createdAt.toLocaleString(),
        orderType: fullOrder.orderType,
        deliveryAddress: fullOrder.deliveryAddress,
        items: fullOrder.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          addons: item.addons || [],
        })),
        subtotal: parseFloat(fullOrder.subtotal),
        tax: parseFloat(fullOrder.tax),
        deliveryFee: parseFloat(fullOrder.deliveryFee),
        discount: parseFloat(fullOrder.discount || '0'),
        total: parseFloat(fullOrder.total),
      });
    } catch (emailError) {
      logger.error('Failed to send order confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send push notification to restaurant (in a real app, this would be a WebSocket or push notification)
    try {
      await sendPushNotification({
        userId: restaurant.ownerId,
        title: 'New Order Received',
        body: `New ${fullOrder.orderType} order #${fullOrder.orderNumber}`,
        data: {
          type: 'new_order',
          orderId: fullOrder.id,
          orderNumber: fullOrder.orderNumber,
        },
      });
    } catch (notifError) {
      logger.error('Failed to send push notification:', notifError);
    }

    res.status(201).json({
      success: true,
      data: formatOrderResponse(fullOrder),
    });

  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
    });
  }
};

// Get order by ID
export const getOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get order with relations
    const order = await getOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if user has permission to view this order
    if (userRole !== 'admin' && order.userId !== userId && order.restaurant.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this order',
      });
    }

    res.status(200).json({
      success: true,
      data: formatOrderResponse(order),
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
    });
  }
};

// Get orders for current user
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      restaurantId,
      startDate,
      endDate,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [eq(orders.userId, userId)];

    if (status) {
      conditions.push(eq(orders.status, status as string));
    }

    if (restaurantId) {
      conditions.push(eq(orders.restaurantId, restaurantId as string));
    }

    if (startDate) {
      conditions.push(gte(orders.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, end));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...conditions))
      .then((res) => parseInt(res[0]?.count) || 0);

    // Get paginated orders
    const ordersList = await db.query.orders.findMany({
      where: and(...conditions),
      orderBy: [desc(orders.createdAt)],
      limit: Number(limit),
      offset,
      with: {
        restaurant: {
          columns: {
            id: true,
            name: true,
            logo: true,
          },
        },
        items: {
          with: {
            addons: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: ordersList.map(formatOrderResponse),
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
};

// Get orders for restaurant
export const getRestaurantOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      orderType,
      startDate,
      endDate,
    } = req.query;

    // Check if user owns the restaurant
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission',
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [eq(orders.restaurantId, restaurantId)];

    if (status) {
      conditions.push(eq(orders.status, status as string));
    }

    if (orderType) {
      conditions.push(eq(orders.orderType, orderType as string));
    }

    if (startDate) {
      conditions.push(gte(orders.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, end));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...conditions))
      .then((res) => parseInt(res[0]?.count) || 0);

    // Get paginated orders
    const ordersList = await db.query.orders.findMany({
      where: and(...conditions),
      orderBy: [desc(orders.createdAt)],
      limit: Number(limit),
      offset,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          with: {
            addons: true,
          },
        },
        statusHistory: {
          orderBy: [orderStatusHistory.timestamp],
        },
      },
    });

    res.status(200).json({
      success: true,
      data: ordersList.map(formatOrderResponse),
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get restaurant orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant orders',
    });
  }
};

// Update order status
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    // Get current order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        restaurant: {
          columns: {
            id: true,
            ownerId: true,
            name: true,
          },
        },
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if user has permission to update this order
    if (req.user.role !== 'admin' && order.restaurant.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this order',
      });
    }

    // Validate status transition (simplified - in a real app, this would be more comprehensive)
    const validTransitions: Record<string, string[]> = {
      'payment_pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
      'ready_for_pickup': ['completed', 'picked_up'],
      'out_for_delivery': ['delivered', 'cancelled'],
      'delivered': ['completed'],
      'picked_up': ['completed'],
      'cancelled': [],
      'completed': [],
    };

    const currentStatus = order.status;
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status) && currentStatus !== status) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition order from ${currentStatus} to ${status}`,
        allowedTransitions,
      });
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Update order status
      await tx
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));

      // Add status history
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId: id,
        status,
        notes: notes || `Order status updated to ${status}`,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Get the updated order
    const updatedOrder = await getOrderById(id);

    // Send status update email to customer (in background)
    if (order.user?.email) {
      try {
        await sendOrderStatusUpdateEmail(order.user.email, {
          orderNumber: order.orderNumber,
          userName: order.user.name,
          restaurantName: order.restaurant.name,
          status,
          statusMessage: notes || `Your order is now ${status}`,
          orderLink: `${process.env.FRONTEND_URL}/orders/${order.id}`,
        });
      } catch (emailError) {
        logger.error('Failed to send status update email:', emailError);
      }
    }

    // Send push notification to customer (in a real app)
    try {
      await sendPushNotification({
        userId: order.userId,
        title: `Order ${status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        body: `Order #${order.orderNumber} is now ${status.replace(/_/g, ' ')}`,
        data: {
          type: 'order_status_update',
          orderId: order.id,
          status,
        },
      });
    } catch (notifError) {
      logger.error('Failed to send push notification:', notifError);
    }

    res.status(200).json({
      success: true,
      data: formatOrderResponse(updatedOrder),
    });

  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
};

// Cancel order
export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Get current order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        restaurant: {
          columns: {
            ownerId: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if user has permission to cancel this order
    if (req.user.role !== 'admin' && order.userId !== userId && order.restaurant.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to cancel this order',
      });
    }

    // Check if order can be cancelled
    const nonCancellableStatuses = ['cancelled', 'completed', 'delivered', 'picked_up'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Order cannot be cancelled as it is already ${order.status}`,
      });
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Update order status to cancelled
      await tx
        .update(orders)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));

      // Add status history
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId: id,
        status: 'cancelled',
        notes: `Order cancelled${reason ? `: ${reason}` : ''}`,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // If order was prepaid, initiate refund (simplified)
      if (order.isPrepaid && order.paymentStatus === 'completed') {
        // In a real app, this would call the payment provider's API
        // For now, we'll just log it
        logger.info(`Initiating refund for order ${id}...`);
        
        // Update payment status to refunded
        await tx
          .update(orders)
          .set({
            paymentStatus: 'refunded',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id));
      }
    });

    // Get the updated order
    const updatedOrder = await getOrderById(id);

    res.status(200).json({
      success: true,
      data: formatOrderResponse(updatedOrder),
    });

  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
};

// Helper function to get order by ID with all relations
async function getOrderById(orderId: string) {
  return db.query.orders.findFirst({
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
          logo: true,
          contactNumber: true,
          address: true,
          city: true,
          state: true,
          ownerId: true,
        },
      },
      items: {
        with: {
          menuItem: {
            columns: {
              id: true,
              name: true,
              description: true,
            },
          },
          addons: {
            with: {
              addon: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      statusHistory: {
        orderBy: [orderStatusHistory.timestamp],
      },
    },
  });
}
