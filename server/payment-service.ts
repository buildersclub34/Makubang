import { db } from './db';
import { 
  payments, 
  paymentStatus, 
  paymentMethod, 
  subscriptionPlans, 
  restaurantSubscriptions,
  restaurants
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { 
  createRazorpayOrder, 
  verifyPaymentSignature,
  capturePayment,
  createPaymentRecord,
  updatePaymentStatus,
  RazorpayOrderOptions,
  RazorpayPayment
} from './services/razorpay-service';

export interface PaymentData {
  amount: number;
  orderId: string;
  userId: string;
  currency?: string;
  metadata?: {
    restaurantName?: string;
    description?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    [key: string]: any;
  };
}

export async function createPaymentIntent(paymentData: PaymentData) {
  try {
    // Convert amount to paise for Razorpay (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(paymentData.amount) * 100);
    
    // Prepare order options
    const orderOptions: RazorpayOrderOptions = {
      amount: amountInPaise,
      currency: paymentData.currency || 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
      notes: {
        ...paymentData.metadata,
        orderId: paymentData.orderId,
        userId: paymentData.userId
      }
    };

    // Create Razorpay order
    const order = await createRazorpayOrder(amountInPaise, orderOptions);
    
    // Create payment record in database
    const payment = await createPaymentRecord({
      orderId: paymentData.orderId,
      userId: paymentData.userId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      paymentMethod: 'razorpay',
      status: 'pending',
      externalPaymentId: order.id,
      metadata: {
        ...paymentData.metadata,
        razorpayOrderId: order.id
      }
    });

    return {
      orderId: order.id,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment.id,
      name: paymentData.metadata?.restaurantName || 'Makubang Order',
      description: paymentData.metadata?.description || 'Payment for your order',
      prefill: {
        name: paymentData.metadata?.customerName || '',
        email: paymentData.metadata?.customerEmail || '',
        contact: paymentData.metadata?.customerPhone || ''
      },
      theme: {
        color: '#F37254'
      }
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

export async function verifyAndCapturePayment(
  paymentId: string, 
  orderId: string, 
  razorpayPaymentId: string, 
  razorpaySignature: string
) {
  try {
    // Verify payment signature
    const isValidSignature = await verifyPaymentSignature(orderId, razorpayPaymentId, razorpaySignature);
    
    if (!isValidSignature) {
      throw new Error('Invalid payment signature');
    }

    // Get payment record
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Convert amount to paise for Razorpay (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(payment.amount) * 100);
    
    // Capture payment
    const captureResponse = await capturePayment(razorpayPaymentId, amountInPaise);
    
    // Update payment status
    const updatedPayment = await updatePaymentStatus({
      paymentId,
      status: captureResponse.status === 'captured' ? 'succeeded' : 'failed',
      externalPaymentId: razorpayPaymentId
    });

    return {
      success: captureResponse.status === 'captured',
      payment: updatedPayment
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // Update payment status to failed
    if (paymentId) {
      await updatePaymentStatus({
        paymentId,
        status: 'failed',
        externalPaymentId: razorpayPaymentId || undefined
      });
    }
    
    throw new Error('Payment verification failed');
  }
}

export async function createSubscriptionPayment(restaurantId: string, planId: string, userId: string, metadata?: { [key: string]: any }) {
  try {
    // Create subscription payment intent
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .then(rows => rows[0]);

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Ensure price is a number
    const amount = typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price;
    
    // Create payment intent with subscription metadata
    const paymentIntent = await createPaymentIntent({
      amount,
      orderId: `sub_${Date.now()}`,
      userId,
      metadata: {
        type: 'subscription',
        planId: plan.id,
        planName: plan.name,
        description: `Subscription for ${plan.name} plan`,
        ...(metadata || {})
      }
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    throw error;
  }
}

export async function processWebhook(event: any) {
  try {
    const { event: eventType, payload } = event;
    
    if (eventType === 'payment.captured') {
      const { payment } = payload;
      const { order_id: orderId, id: razorpayPaymentId } = payment.entity;
      
      // Find payment record by order ID
      const [paymentRecord] = await db
        .select()
        .from(payments)
        .where(eq(payments.orderId, orderId));
      
      if (paymentRecord) {
        await updatePaymentStatus({
          paymentId: paymentRecord.id,
          status: 'succeeded',
          externalPaymentId: razorpayPaymentId
        });

        // If this was a subscription payment, update the subscription
        const metadata = paymentRecord.metadata as { 
          type?: string; 
          planId?: string;
          planName?: string;
        };
        
        if (metadata?.type === 'subscription' && metadata.planId) {
          // Get plan details
          const [plan] = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, metadata.planId));
            
          if (plan) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.durationDays);
            
            const subscriptionData = {
              id: `sub_${crypto.randomUUID()}`,
              restaurantId: paymentRecord.userId,
              planId: plan.id,
              status: 'active',
              startDate: new Date(),
              endDate,
              paymentId: paymentRecord.id,
              orderLimit: plan.maxOrders || null,
              orderCount: 0,
              metadata: {
                planName: metadata.planName || plan.name
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };

            await db.insert(restaurantSubscriptions)
              .values(subscriptionData)
              .onConflictDoUpdate({
                target: restaurantSubscriptions.id,
                set: {
                  planId: plan.id,
                  status: 'active',
                  startDate: new Date(),
                  endDate,
                  paymentId: paymentRecord.id,
                  orderLimit: plan.maxOrders || null,
                  metadata: {
                    planName: metadata.planName || plan.name
                  },
                  updatedAt: new Date()
                }
              });
              
            // Update restaurant's subscription tier
            await db.update(restaurants)
              .set({
                subscriptionTier: metadata.planName?.toLowerCase() || 'basic',
                subscriptionExpiresAt: endDate,
                updatedAt: new Date()
              })
              .where(eq(restaurants.id, paymentRecord.userId));
          }
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
