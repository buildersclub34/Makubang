import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/server/db';
import { orders, orderItems, restaurants, users } from '@shared/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getOrderTrackingService } from '@/server/lib/websocket/order-tracking';
import { Order, OrderItem } from '@shared/types/order';

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
};

class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

interface CreateOrderRequest {
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: string;
  specialInstructions?: string;
}

// Create a new order
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to create an order');
  }

  try {
    const data: CreateOrderRequest = await request.json();
    const { restaurantId, items, deliveryAddress, paymentMethod, specialInstructions } = data;

    // Validate required fields
    if (!restaurantId || !items?.length || !deliveryAddress) {
      throw new BadRequestError('Missing required fields');
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // 1. Get restaurant details
      const restaurant = await tx.query.restaurants.findFirst({
        where: (restaurants: any, { eq }: { eq: any }) => eq(restaurants.id, restaurantId),
      });

      if (!restaurant) {
        throw new NotFoundError('Restaurant not found');
      }

      // 2. Calculate order total and validate items
      let subtotal = 0;
      const orderItemsData: Array<{
        id: string;
        menuItemId: string;
        quantity: number;
        price: number;
        specialInstructions?: string;
      }> = [];

      for (const item of items) {
        const menuItem = await (tx as any).query.menuItems.findFirst({
          where: (items: any, { eq }: { eq: any }) => eq(items.id, item.menuItemId),
        });

        if (!menuItem) {
          throw new NotFoundError(`Menu item not found: ${item.menuItemId}`);
        }

        if (menuItem.restaurantId !== restaurantId) {
          throw new BadRequestError('All items must be from the same restaurant');
        }

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          id: uuidv4(),
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price,
          specialInstructions: item.specialInstructions,
        });
      }

      // 3. Calculate taxes and fees
      const taxRate = 0.18; // 18% GST
      const tax = Number((subtotal * taxRate).toFixed(2));
      const deliveryFee = restaurant.deliveryFee ? Number(restaurant.deliveryFee) : 0;
      const total = Number((subtotal + tax + deliveryFee).toFixed(2));

      // 4. Create order
      const [order] = await tx
        .insert(orders)
        .values({
          id: `ord_${uuidv4()}`,
          userId: session.user.id,
          restaurantId,
          status: 'pending',
          subtotal,
          tax,
          deliveryFee,
          total,
          deliveryAddress,
          paymentMethod,
          specialInstructions,
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
        })
        .returning();

      // 5. Add order items
      await tx.insert(orderItems).values(
        orderItemsData.map((item) => ({
          ...item,
          orderId: order.id,
        }))
      );

      // 6. Update order status to 'confirmed' (in a real app, this might happen after payment)
      const trackingService = getOrderTrackingService();
      await trackingService.updateOrderStatus(order.id, 'confirmed');

      // 7. Return the created order
      const createdOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          items: true,
          restaurant: true,
        },
      });

      return NextResponse.json(createdOrder, { status: 201 });
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    
    if (error instanceof BadRequestError || 
        error instanceof UnauthorizedError || 
        error instanceof NotFoundError) {
      throw error;
    }
    
    throw new InternalServerError('Failed to create order');
  }
}

// Get user's orders
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to view orders');
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const query = db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, session.user.id),
          status ? eq(orders.status, status) : undefined
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const userOrders = await query;

    return NextResponse.json(userOrders);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    throw new InternalServerError('Failed to fetch orders');
  }
}

// Update order status (for restaurant/delivery partner)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to update an order');
  }

  try {
    const { orderId, status, metadata } = await request.json();

    if (!orderId || !status) {
      throw new BadRequestError('Missing orderId or status');
    }

    // Verify the user has permission to update this order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        restaurant: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // In a real app, add more sophisticated permission checks here
    const isRestaurantOwner = order.restaurant.ownerId === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isRestaurantOwner && !isAdmin) {
      throw new UnauthorizedError('You do not have permission to update this order');
    }

    // Update order status through the tracking service
    const trackingService = getOrderTrackingService();
    const updatedOrder = await trackingService.updateOrderStatus(orderId, status, metadata);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    logger.error('Error updating order status:', error);
    
    if (error instanceof BadRequestError || 
        error instanceof UnauthorizedError || 
        error instanceof NotFoundError) {
      throw error;
    }
    
    throw new InternalServerError('Failed to update order status');
  }
}

// Get order details
export async function GET_ORDER(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to view order details');
  }

  try {
    const order = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, params.id),
      with: {
        items: {
          with: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify the user has permission to view this order
    const isOrderOwner = order.userId === session.user.id;
    const isRestaurantOwner = order.restaurant.ownerId === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isOrderOwner && !isRestaurantOwner && !isAdmin) {
      throw new UnauthorizedError('You do not have permission to view this order');
    }

    // Get real-time tracking data if available
    const trackingService = getOrderTrackingService();
    const trackingData = await trackingService.getOrderStatus(order.id);

    return NextResponse.json({
      ...order,
      tracking: trackingData,
    });
  } catch (error) {
    logger.error('Error fetching order details:', error);
    
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      throw error;
    }
    
    throw new InternalServerError('Failed to fetch order details');
  }
}

// Cancel an order
export async function DELETE_ORDER(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to cancel an order');
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.id),
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify the user has permission to cancel this order
    if (order.userId !== session.user.id && session.user.role !== 'admin') {
      throw new UnauthorizedError('You do not have permission to cancel this order');
    }

    // Check if order can be cancelled
    const nonCancellableStatuses = ['delivered', 'cancelled', 'rejected'];
    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestError(`Order cannot be cancelled in its current state: ${order.status}`);
    }

    // Update order status to cancelled
    const trackingService = getOrderTrackingService();
    const updatedOrder = await trackingService.updateOrderStatus(
      order.id,
      'cancelled',
      { cancelledBy: session.user.id, cancelledAt: new Date().toISOString() }
    );

    // TODO: Process refund if payment was made

    return NextResponse.json(updatedOrder);
  } catch (error) {
    logger.error('Error cancelling order:', error);
    
    if (error instanceof BadRequestError || 
        error instanceof UnauthorizedError || 
        error instanceof NotFoundError) {
      throw error;
    }
    
    throw new InternalServerError('Failed to cancel order');
  }
}

// Add this to handle dynamic routes
export { GET_ORDER as GET, DELETE_ORDER as DELETE };
