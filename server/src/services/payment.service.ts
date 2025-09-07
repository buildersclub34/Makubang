import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { orders, payments, orderStatusHistory } from '../../../shared/schema';
import { and, eq } from 'drizzle-orm';
import logger from '../utils/logger';
import axios from 'axios';
import crypto from 'crypto';

// Payment provider configuration (example using Razorpay)
const PAYMENT_CONFIG = {
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    baseUrl: process.env.RAZORPAY_BASE_URL || 'https://api.razorpay.com/v1',
  },
  // Add other payment providers here (e.g., Stripe, PayU, etc.)
};

// Payment statuses
export const PAYMENT_STATUS = {
  CREATED: 'created',
  ATTEMPTED: 'attempted',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

// Payment methods
export const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
  EMI: 'emi',  
  COD: 'cod',
};

// Create a payment intent/order with the payment provider
export const createPayment = async (orderId: string, amount: number, currency = 'INR') => {
  try {
    // Get order details
    const order = await db.query.orders.findFirst({
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
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Convert amount to paise (smallest currency unit for INR)
    const amountInPaise = Math.round(amount * 100);
    const paymentId = `pay_${uuidv4().replace(/-/g, '')}`;
    
    // Create payment record in database
    const [payment] = await db.insert(payments).values({
      id: paymentId,
      orderId: order.id,
      amount: amount.toFixed(2),
      currency,
      status: PAYMENT_STATUS.CREATED,
      paymentMethod: null,
      paymentProvider: 'razorpay',
      providerPaymentId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Create payment order with Razorpay
    const razorpayOrder = await createRazorpayOrder({
      amount: amountInPaise,
      currency,
      receipt: order.orderNumber,
      notes: {
        order_id: order.id,
        payment_id: payment.id,
        restaurant_id: order.restaurantId,
        restaurant_name: order.restaurant?.name || 'Restaurant',
      },
    });

    // Update payment with provider order ID
    await db
      .update(payments)
      .set({
        providerOrderId: razorpayOrder.id,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    return {
      paymentId: payment.id,
      orderId: razorpayOrder.id,
      amount: amountInPaise / 100,
      currency,
      key: PAYMENT_CONFIG.razorpay.keyId,
      name: 'Makubang',
      description: `Payment for order #${order.orderNumber}`,
      prefill: {
        name: order.user?.name || '',
        email: order.user?.email || '',
        contact: order.user?.phone || '',
      },
      theme: {
        color: '#F37254',
      },
      handler: (response: any) => {
        // This would be called on the client side after payment
        console.log('Payment successful:', response);
      },
    };
  } catch (error) {
    logger.error('Error creating payment:', error);
    throw new Error('Failed to create payment');
  }
};

// Verify payment and update order status
export const verifyPayment = async (paymentId: string, paymentResponse: any) => {
  const payment = await db.transaction(async (tx) => {
    // Get payment record
    const [payment] = await tx.query.payments.findMany({
      where: eq(payments.id, paymentId),
      with: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Skip if payment is already processed
    if (payment.status === PAYMENT_STATUS.PAID) {
      return payment;
    }

    // Verify payment with Razorpay
    const isSignatureValid = verifyRazorpaySignature(
      `${payment.orderId}|${paymentResponse.razorpay_payment_id}`,
      paymentResponse.razorpay_signature,
      PAYMENT_CONFIG.razorpay.keySecret
    );

    if (!isSignatureValid) {
      throw new Error('Invalid payment signature');
    }

    // Get payment details from Razorpay
    const paymentDetails = await getRazorpayPayment(paymentResponse.razorpay_payment_id);

    // Update payment status
    const updatedPayment = await tx
      .update(payments)
      .set({
        status: PAYMENT_STATUS.PAID,
        paymentMethod: paymentDetails.method,
        providerPaymentId: paymentDetails.id,
        metadata: {
          ...payment.metadata,
          paymentDetails,
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Update order status
    await tx
      .update(orders)
      .set({
        paymentStatus: 'completed',
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, payment.orderId));

    // Add order status history
    await tx.insert(orderStatusHistory).values({
      id: uuidv4(),
      orderId: payment.orderId,
      status: 'confirmed',
      notes: 'Payment received, order confirmed',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return updatedPayment[0];
  });

  return payment;
};

// Process refund for an order
export const processRefund = async (orderId: string, amount?: number, reason = 'Refund requested') => {
  const order = await db.transaction(async (tx) => {
    // Get order with payment details
    const [order] = await tx.query.orders.findMany({
      where: eq(orders.id, orderId),
      with: {
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.payment || order.payment.status !== PAYMENT_STATUS.PAID) {
      throw new Error('No paid payment found for this order');
    }

    const refundAmount = amount ? Math.min(amount, parseFloat(order.payment.amount)) : parseFloat(order.payment.amount);
    
    // Process refund with Razorpay
    const refund = await createRazorpayRefund({
      paymentId: order.payment.providerPaymentId!,
      amount: Math.round(refundAmount * 100), // Convert to paise
      notes: {
        reason,
        order_id: orderId,
      },
    });

    // Update payment status
    const newStatus = refundAmount < parseFloat(order.payment.amount) 
      ? PAYMENT_STATUS.PARTIALLY_REFUNDED 
      : PAYMENT_STATUS.REFUNDED;

    await tx
      .update(payments)
      .set({
        status: newStatus,
        metadata: {
          ...order.payment.metadata,
          refunds: [
            ...(order.payment.metadata?.refunds || []),
            {
              id: refund.id,
              amount: refund.amount / 100,
              currency: refund.currency,
              status: refund.status,
              createdAt: new Date(),
              reason,
            },
          ],
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, order.payment.id));

    // Update order status if fully refunded
    if (newStatus === PAYMENT_STATUS.REFUNDED) {
      await tx
        .update(orders)
        .set({
          paymentStatus: 'refunded',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Add order status history
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId,
        status: 'cancelled',
        notes: 'Order cancelled and refund processed',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return order;
  });

  return order;
};

// Handle payment webhook
export const handlePaymentWebhook = async (payload: any, signature: string) => {
  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_CONFIG.razorpay.webhookSecret || '')
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const event = payload.event;
    const paymentId = payload.payload.payment?.entity?.id;

    if (!paymentId) {
      throw new Error('No payment ID in webhook payload');
    }

    // Get payment from database using providerPaymentId
    const payment = await db.query.payments.findFirst({
      where: eq(payments.providerPaymentId, paymentId),
      with: {
        order: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment not found for provider ID: ${paymentId}`);
    }

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        // Payment was captured (authorized and captured)
        await db
          .update(payments)
          .set({
            status: PAYMENT_STATUS.PAID,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        await db
          .update(orders)
          .set({
            paymentStatus: 'completed',
            status: 'confirmed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
        
        // Add order status history
        await db.insert(orderStatusHistory).values({
          id: uuidv4(),
          orderId: payment.orderId,
          status: 'confirmed',
          notes: 'Payment captured, order confirmed',
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;

      case 'payment.failed':
        // Payment failed
        await db
          .update(payments)
          .set({
            status: PAYMENT_STATUS.FAILED,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        await db
          .update(orders)
          .set({
            paymentStatus: 'failed',
            status: 'payment_failed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
        
        // Add order status history
        await db.insert(orderStatusHistory).values({
          id: uuidv4(),
          orderId: payment.orderId,
          status: 'payment_failed',
          notes: 'Payment failed',
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;

      case 'refund.processed':
        // Refund was processed
        const refund = payload.payload.refund.entity;
        
        await db
          .update(payments)
          .set({
            status: refund.amount === payment.amount * 100 ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED,
            updatedAt: new Date(),
            metadata: {
              ...payment.metadata,
              refunds: [
                ...(payment.metadata?.refunds || []),
                {
                  id: refund.id,
                  amount: refund.amount / 100,
                  currency: refund.currency,
                  status: refund.status,
                  createdAt: new Date(refund.created_at * 1000),
                  notes: refund.notes || {},
                },
              ],
            },
          })
          .where(eq(payments.id, payment.id));

        if (refund.amount === payment.amount * 100) {
          await db
            .update(orders)
            .set({
              paymentStatus: 'refunded',
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(orders.id, payment.orderId));
          
          // Add order status history
          await db.insert(orderStatusHistory).values({
            id: uuidv4(),
            orderId: payment.orderId,
            status: 'cancelled',
            notes: 'Order cancelled and refund processed',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        break;

      default:
        logger.info(`Unhandled webhook event: ${event}`, { paymentId });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error processing payment webhook:', error);
    throw error;
  }
};

// Helper function to create a Razorpay order
async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, any>;
}) {
  try {
    const response = await axios.post(
      `${PAYMENT_CONFIG.razorpay.baseUrl}/orders`,
      {
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
        payment_capture: 1, // Auto-capture payment
      },
      {
        auth: {
          username: PAYMENT_CONFIG.razorpay.keyId || '',
          password: PAYMENT_CONFIG.razorpay.keySecret || '',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Error creating Razorpay order:', error.response?.data || error.message);
    throw new Error('Failed to create payment order');
  }
}

// Helper function to verify Razorpay signature
function verifyRazorpaySignature(orderId: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(orderId);
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
  } catch (error) {
    logger.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

// Helper function to get payment details from Razorpay
async function getRazorpayPayment(paymentId: string) {
  try {
    const response = await axios.get(
      `${PAYMENT_CONFIG.razorpay.baseUrl}/payments/${paymentId}`,
      {
        auth: {
          username: PAYMENT_CONFIG.razorpay.keyId || '',
          password: PAYMENT_CONFIG.razorpay.keySecret || '',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Error fetching Razorpay payment:', error.response?.data || error.message);
    throw new Error('Failed to fetch payment details');
  }
}

// Helper function to create a refund in Razorpay
async function createRazorpayRefund(params: {
  paymentId: string;
  amount: number;
  notes?: Record<string, any>;
  speed?: 'normal' | 'optimum';
}) {
  try {
    const response = await axios.post(
      `${PAYMENT_CONFIG.razorpay.baseUrl}/payments/${params.paymentId}/refund`,
      {
        amount: params.amount,
        speed: params.speed || 'normal',
        notes: params.notes,
      },
      {
        auth: {
          username: PAYMENT_CONFIG.razorpay.keyId || '',
          password: PAYMENT_CONFIG.razorpay.keySecret || '',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Error creating Razorpay refund:', error.response?.data || error.message);
    throw new Error('Failed to process refund');
  }
}

// Get payment details by ID
export const getPaymentById = async (paymentId: string) => {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
    with: {
      order: {
        columns: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  return payment;
};

// Get payments for a user
export const getUserPayments = async (userId: string, { page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  
  const paymentsList = await db.query.payments.findMany({
    where: (payments, { eq }) => eq(payments.userId, userId),
    orderBy: [payments.createdAt],
    limit,
    offset,
    with: {
      order: {
        columns: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(eq(payments.userId, userId))
    .then((res) => parseInt(res[0]?.count) || 0);

  return {
    data: paymentsList,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};
