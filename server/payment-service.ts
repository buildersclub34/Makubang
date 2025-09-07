
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from './db';
import { payments, orders } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface PaymentRequest {
  amount: number;
  currency?: string;
  orderId: string;
  userId: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not found in environment variables');
    }

    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  // Create Razorpay order
  async createOrder(paymentRequest: PaymentRequest) {
    try {
      const options = {
        amount: Math.round(paymentRequest.amount * 100), // Convert to paise
        currency: paymentRequest.currency || 'INR',
        receipt: `order_${paymentRequest.orderId}`,
        notes: {
          orderId: paymentRequest.orderId,
          userId: paymentRequest.userId,
          ...paymentRequest.metadata,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      // Store payment record in database
      const [payment] = await db.insert(payments).values({
        id: crypto.randomUUID(),
        orderId: paymentRequest.orderId,
        userId: paymentRequest.userId,
        amount: paymentRequest.amount.toString(),
        currency: paymentRequest.currency || 'INR',
        status: 'pending',
        paymentMethod: 'razorpay',
        externalPaymentId: razorpayOrder.id,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          description: paymentRequest.description,
          ...paymentRequest.metadata,
        },
        createdAt: new Date(),
      }).returning();

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        paymentId: payment.id,
        key: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment signature
  async verifyPayment(verification: PaymentVerification): Promise<boolean> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verification;
      
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  // Update payment status after verification
  async updatePaymentStatus(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    status: 'succeeded' | 'failed'
  ) {
    try {
      const [payment] = await db
        .update(payments)
        .set({
          status,
          externalPaymentId: razorpayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(payments.externalPaymentId, razorpayOrderId))
        .returning();

      if (payment && status === 'succeeded') {
        // Update order status
        await db
          .update(orders)
          .set({
            paymentStatus: 'completed',
            status: 'confirmed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
      }

      return payment;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  // Calculate GST
  static calculateGST(amount: number, gstRate: number = 18): {
    baseAmount: number;
    gstAmount: number;
    totalAmount: number;
  } {
    const baseAmount = amount / (1 + gstRate / 100);
    const gstAmount = amount - baseAmount;
    
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: amount,
    };
  }

  // Process refund
  async processRefund(paymentId: string, amount?: number, reason?: string) {
    try {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment || !payment.externalPaymentId) {
        throw new Error('Payment not found');
      }

      const refundAmount = amount ? Math.round(amount * 100) : undefined;
      
      const refund = await this.razorpay.payments.refund(payment.externalPaymentId, {
        amount: refundAmount,
        notes: {
          reason: reason || 'Order cancelled',
          orderId: payment.orderId,
        },
      });

      // Update payment status
      await db
        .update(payments)
        .set({
          status: 'refunded',
          metadata: {
            ...payment.metadata,
            refund: {
              id: refund.id,
              amount: refund.amount,
              reason,
              createdAt: new Date(),
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId: string) {
    try {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get Razorpay payment details if available
      let razorpayDetails = null;
      if (payment.externalPaymentId) {
        try {
          razorpayDetails = await this.razorpay.payments.fetch(payment.externalPaymentId);
        } catch (error) {
          console.warn('Could not fetch Razorpay payment details:', error);
        }
      }

      return {
        ...payment,
        razorpayDetails,
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  // Handle webhook events
  async handleWebhook(body: any, signature: string) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }

      const { event, payload } = body;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        case 'order.paid':
          await this.handleOrderPaid(payload.order.entity);
          break;
        default:
          console.log('Unhandled webhook event:', event);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Failed to handle webhook');
    }
  }

  private async handlePaymentCaptured(payment: any) {
    await this.updatePaymentStatus(payment.order_id, payment.id, 'succeeded');
  }

  private async handlePaymentFailed(payment: any) {
    await this.updatePaymentStatus(payment.order_id, payment.id, 'failed');
  }

  private async handleOrderPaid(order: any) {
    // Handle order paid event
    console.log('Order paid:', order.id);
  }
}
