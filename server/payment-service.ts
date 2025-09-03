
import Stripe from 'stripe';
import { storage } from './storage';
import { orders } from '../shared/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface PaymentData {
  amount: number;
  currency: string;
  orderId: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export class PaymentService {
  static async createPaymentIntent(paymentData: PaymentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency,
        metadata: {
          orderId: paymentData.orderId,
          ...paymentData.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update order with payment intent ID
      await storage.db.update(orders)
        .set({ 
          stripePaymentIntentId: paymentIntent.id,
          updatedAt: new Date()
        })
        .where(eq(orders.id, paymentData.orderId));

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Payment creation error:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  static async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const orderId = paymentIntent.metadata.orderId;
        
        // Update order status
        await storage.db.update(orders)
          .set({ 
            paymentStatus: 'paid',
            status: 'confirmed',
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));

        return { success: true, orderId };
      }
      
      return { success: false, status: paymentIntent.status };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  static async handleWebhook(signature: string, body: Buffer) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await this.confirmPayment(paymentIntent.id);
          break;
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          const orderId = failedPayment.metadata.orderId;
          
          await storage.db.update(orders)
            .set({ 
              paymentStatus: 'failed',
              status: 'cancelled',
              updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }

  static async createSubscriptionPayment(restaurantId: string, planType: string) {
    const plans = {
      starter: { amount: 100000, name: 'Starter Plan' }, // ₹1,000
      premium: { amount: 300000, name: 'Premium Plan' }, // ₹3,000
      enterprise: { amount: 500000, name: 'Enterprise Plan' }, // ₹5,000
    };

    const plan = plans[planType as keyof typeof plans];
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: plan.amount,
        currency: 'inr',
        metadata: {
          type: 'subscription',
          restaurantId,
          planType,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Subscription payment error:', error);
      throw new Error('Failed to create subscription payment');
    }
  }
}
