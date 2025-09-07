import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db';
import { payments, paymentStatus, paymentMethod, subscriptionPlans, restaurantSubscriptions } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Types
type RazorpayOrderStatus = 'created' | 'attempted' | 'paid' | 'cancelled' | 'expired';
type RazorpayPaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';

// Interfaces
export interface RazorpayOrderOptions {
  amount: number; // Amount in paise (e.g., 100 = ₹1)
  currency?: string;
  receipt: string;
  payment_capture: 0 | 1;
  notes?: Record<string, any>;
  partial_payment?: boolean;
  method?: string[];
  callback_url?: string;
  callback_method?: 'get' | 'post';
  payment?: {
    capture: 'automatic' | 'manual';
    capture_options?: {
      automatic_expiry_period?: number;
      manual_expiry_period?: number;
      refund_speed?: 'normal' | 'optimum';
    };
  };
}

export interface RazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: RazorpayOrderStatus;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: RazorpayPaymentStatus;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, any>;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: Record<string, any>;
  created_at: number;
}

export interface RazorpayError extends Error {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: Record<string, any>;
    field: string | null;
  };
  http_code: number;
  statusCode?: number;
}

// Custom Errors
class RazorpayServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RazorpayServiceError';
  }
}

export class PaymentVerificationError extends RazorpayServiceError {
  constructor(message: string, code: string = 'PAYMENT_VERIFICATION_FAILED') {
    super(message, code, 400);
    this.name = 'PaymentVerificationError';
  }
}

export class PaymentCaptureError extends RazorpayServiceError {
  constructor(
    message: string,
    code: string = 'PAYMENT_CAPTURE_FAILED',
    public readonly paymentId?: string
  ) {
    super(message, code, 400);
    this.name = 'PaymentCaptureError';
  }
}

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Create a new Razorpay order
 * @param options Order creation options
 * @returns Razorpay order details
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrderResponse> {
  try {
    logger.info(`Creating Razorpay order for amount: ${options.amount} ${options.currency}`);
    
    const order = await razorpay.orders.create({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt,
      payment_capture: options.payment_capture,
      notes: options.notes,
      partial_payment: options.partial_payment,
      method: options.method,
      callback_url: options.callback_url,
      callback_method: options.callback_method,
    });

    logger.info(`Razorpay order created: ${order.id}`);
    return order as RazorpayOrderResponse;
  } catch (error) {
    const err = error as RazorpayError;
    logger.error('Failed to create Razorpay order', {
      error: err.error,
      code: err.http_code,
    });
    
    throw new RazorpayServiceError(
      err.error?.description || 'Failed to create Razorpay order',
      'RAZORPAY_ORDER_CREATION_FAILED',
      err.http_code || 500,
      err.error
    );
  }
}

/**
 * Verify Razorpay payment signature
 * @param orderId Razorpay order ID
 * @param paymentId Razorpay payment ID
 * @param signature Payment signature to verify
 * @returns boolean indicating if signature is valid
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;
    
    if (!isValid) {
      logger.warn('Invalid payment signature', {
        orderId,
        paymentId,
        expected: generatedSignature,
        received: signature,
      });
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying payment signature', { error });
    return false;
  }
}

/**
 * Capture a Razorpay payment
 * @param paymentId Razorpay payment ID
 * @param amount Amount to capture in paise
 * @param currency Currency code (default: 'INR')
 * @returns Captured payment details
 */
export async function capturePayment(
  paymentId: string,
  amount: number,
  currency: string = 'INR'
): Promise<RazorpayPaymentResponse> {
  try {
    logger.info(`Capturing payment: ${paymentId} for amount: ${amount} ${currency}`);
    
    const payment = await razorpay.payments.capture(paymentId, amount, currency);
    
    logger.info(`Payment captured successfully: ${paymentId}`);
    return payment as RazorpayPaymentResponse;
  } catch (error) {
    const err = error as RazorpayError;
    logger.error('Failed to capture payment', {
      paymentId,
      error: err.error,
      code: err.http_code,
    });
    
    throw new PaymentCaptureError(
      err.error?.description || 'Failed to capture payment',
      'RAZORPAY_PAYMENT_CAPTURE_FAILED',
      paymentId
    );
  }
}

/**
 * Create a payment record in the database
 * @param paymentData Payment data to store
 * @returns Created payment record
 */
export async function createPaymentRecord(paymentData: {
  userId: string;
  orderId: string;
  amount: number | string;
  currency?: string;
  status?: string;
  method?: string;
  externalPaymentId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const [payment] = await db
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        userId: paymentData.userId,
        orderId: paymentData.orderId,
        amount: typeof paymentData.amount === 'string' 
          ? paymentData.amount 
          : paymentData.amount.toString(),
        currency: paymentData.currency || 'INR',
        status: (paymentData.status as any) || 'pending',
        paymentMethod: (paymentData.method as any) || 'razorpay',
        externalPaymentId: paymentData.externalPaymentId,
        metadata: paymentData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`Created payment record: ${payment.id}`);
    return payment;
  } catch (error) {
    logger.error('Failed to create payment record', { error });
    throw new RazorpayServiceError(
      'Failed to create payment record',
      'PAYMENT_RECORD_CREATION_FAILED',
      500,
      error
    );
  }
}

/**
 * Update payment status in the database
 * @param paymentId Payment ID to update
 * @param status New status
 * @param metadata Additional metadata to update
 * @returns Updated payment record
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  metadata: Record<string, any> = {}
) {
  try {
    const [payment] = await db
      .update(payments)
      .set({
        status: status as any,
        metadata: { ...metadata, updatedAt: new Date() },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    if (!payment) {
      throw new RazorpayServiceError(
        'Payment not found',
        'PAYMENT_NOT_FOUND',
        404
      );
    }

    logger.info(`Updated payment status: ${paymentId} to ${status}`);
    return payment;
  } catch (error) {
    logger.error('Failed to update payment status', { paymentId, status, error });
    throw new RazorpayServiceError(
      'Failed to update payment status',
      'PAYMENT_STATUS_UPDATE_FAILED',
      500,
      error
    );
  }
}

/**
 * Process subscription payment
 * @param planId Subscription plan ID
 * @param userId User ID
 * @param restaurantId Restaurant ID
 * @returns Payment details and order information
 */
export async function processSubscriptionPayment(
  planId: string,
  userId: string,
  restaurantId: string
) {
  try {
    // Get subscription plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));

    if (!plan) {
      throw new RazorpayServiceError('Subscription plan not found', 'PLAN_NOT_FOUND', 404);
    }

    // Calculate subscription end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // Create a payment record
    const payment = await createPaymentRecord({
      userId,
      orderId: `sub_${Date.now()}`,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      method: 'razorpay',
      metadata: {
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        restaurantId,
      },
    });

    // Create Razorpay order
    const order = await createRazorpayOrder({
      amount: Math.round(Number(plan.price) * 100), // Convert to paise
      currency: plan.currency,
      receipt: payment.id,
      payment_capture: 1, // Auto-capture payment
      notes: {
        planId: plan.id,
        restaurantId,
        userId,
      },
    });

    // Update payment with Razorpay order ID
    await updatePaymentStatus(payment.id, 'pending', {
      razorpayOrderId: order.id,
      orderId: order.receipt,
    });

    return {
      orderId: order.id,
      amount: order.amount / 100, // Convert back to rupees
      currency: order.currency,
      receipt: order.receipt,
      key: process.env.RAZORPAY_KEY_ID,
      name: 'Makubang Subscription',
      description: `${plan.name} - ${plan.description || ''}`.trim(),
      prefill: {
        contact: '', // Will be filled in the frontend
        email: '',   // Will be filled in the frontend
      },
      theme: {
        color: '#2563eb',
      },
    };
  } catch (error) {
    logger.error('Failed to process subscription payment', { error });
    throw error;
  }
}

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  capturePayment,
  createPaymentRecord,
  updatePaymentStatus,
  processSubscriptionPayment,
};
