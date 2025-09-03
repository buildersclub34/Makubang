import { Request, Response } from 'express';
import { db } from '../config/db';
import { orders, payments } from '../../../shared/schema';
import { and, eq } from 'drizzle-orm';
import { 
  createPayment, 
  verifyPayment, 
  processRefund, 
  handlePaymentWebhook, 
  getPaymentById as getPayment,
  getUserPayments as getUserPaymentsService,
  PAYMENT_STATUS,
} from '../services/payment.service';
import { AuthenticatedRequest } from '../types/express';
import logger from '../utils/logger';

// Create payment intent for an order
export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, amount, currency = 'INR' } = req.body;
    const userId = req.user.id;

    // Verify order exists and belongs to user
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      ),
      columns: {
        id: true,
        status: true,
        paymentStatus: true,
        total: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or you do not have permission',
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Order is already paid',
      });
    }

    // Create payment intent
    const paymentIntent = await createPayment(orderId, parseFloat(amount), currency);

    res.status(200).json({
      success: true,
      data: paymentIntent,
    });
  } catch (error: any) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment intent',
    });
  }
};

// Verify payment and confirm order
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId, orderId, paymentMethod, paymentResponse } = req.body;
    const userId = req.user.id;

    // Verify order exists and belongs to user
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      ),
      columns: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or you do not have permission',
      });
    }

    // Verify payment
    const payment = await verifyPayment(paymentId, paymentResponse);

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        orderId: order.id,
      },
    });
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment verification failed',
    });
  }
};

// Handle Razorpay webhook
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    const payload = req.body;
    
    // Process the webhook event
    await handlePaymentWebhook(payload, signature);
    
    // Return a 200 response to acknowledge receipt of the webhook
    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).send('Webhook error');
  }
};

// Get payment details
export const getPaymentDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Get payment with order details
    const payment = await db.query.payments.findFirst({
      where: and(
        eq(payments.id, paymentId),
        eq(payments.userId, userId)
      ),
      with: {
        order: {
          columns: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            userId: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found or you do not have permission',
      });
    }

    // Verify the order belongs to the user
    if (payment.order.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details',
    });
  }
};

// Get user's payment history
export const getUserPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const result = await getUserPaymentsService(userId, {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
    });
  }
};

// Request refund for an order
export const requestRefund = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason, amount } = req.body;
    const userId = req.user.id;

    // Verify order exists and belongs to user
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      ),
      with: {
        payment: {
          columns: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or you do not have permission',
      });
    }

    // Check if order has a payment
    if (!order.payment) {
      return res.status(400).json({
        success: false,
        error: 'No payment found for this order',
      });
    }

    // Check if payment is eligible for refund
    if (order.payment.status !== PAYMENT_STATUS.PAID) {
      return res.status(400).json({
        success: false,
        error: 'Only paid orders can be refunded',
      });
    }

    // Process refund
    const refundAmount = amount ? parseFloat(amount) : parseFloat(order.payment.amount);
    await processRefund(orderId, refundAmount, reason || 'Refund requested by customer');

    res.status(200).json({
      success: true,
      message: 'Refund request submitted successfully',
    });
  } catch (error: any) {
    logger.error('Request refund error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process refund request',
    });
  }
};
