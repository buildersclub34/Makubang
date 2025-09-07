
import { storage } from './storage';
import { restaurants, subscriptions } from '../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { PaymentService } from './payment-service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  orderLimit: number;
  features: string[];
  duration: number; // in days
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    price: 1000,
    orderLimit: 20,
    features: [
      'Up to 20 orders per month',
      'Basic analytics',
      'Standard support',
      'Video content promotion'
    ],
    duration: 30
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    price: 3000,
    orderLimit: 100,
    features: [
      'Up to 100 orders per month',
      'Advanced analytics',
      'Priority support',
      'Featured video placement',
      'Creator collaboration tools'
    ],
    duration: 30
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 5000,
    orderLimit: -1, // unlimited
    features: [
      'Unlimited orders',
      'Premium analytics dashboard',
      '24/7 dedicated support',
      'Top video placement',
      'Custom creator partnerships',
      'White-label options'
    ],
    duration: 30
  }
};

export class SubscriptionService {
  static async createSubscription(restaurantId: string, planId: string) {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    try {
      // Create payment intent
      const payment = await PaymentService.createSubscriptionPayment(restaurantId, planId);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duration);

      // Create subscription record
      const subscription = await storage.db.insert(subscriptions).values({
        restaurantId,
        planId,
        planName: plan.name,
        price: plan.price,
        orderLimit: plan.orderLimit,
        ordersUsed: 0,
        features: plan.features,
        status: 'pending_payment',
        expiresAt,
        paymentIntentId: payment.paymentIntentId,
      }).returning();

      return {
        subscription: subscription[0],
        paymentClientSecret: payment.clientSecret,
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  static async activateSubscription(paymentIntentId: string) {
    try {
      const subscription = await storage.db.select()
        .from(subscriptions)
        .where(eq(subscriptions.paymentIntentId, paymentIntentId))
        .limit(1);

      if (!subscription.length) {
        throw new Error('Subscription not found');
      }

      const sub = subscription[0];
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (sub.features.length * 24 * 60 * 60 * 1000));

      await storage.db.update(subscriptions)
        .set({
          status: 'active',
          activatedAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, sub.id));

      // Update restaurant status
      await storage.db.update(restaurants)
        .set({
          subscriptionStatus: 'active',
          subscriptionPlan: sub.planId,
          subscriptionExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(restaurants.id, sub.restaurantId));

      return { success: true, subscription: sub };
    } catch (error) {
      console.error('Subscription activation error:', error);
      throw error;
    }
  }

  static async checkSubscriptionLimits(restaurantId: string) {
    try {
      const activeSubscription = await storage.db.select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.restaurantId, restaurantId),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!activeSubscription.length) {
        return {
          hasActiveSubscription: false,
          canTakeOrders: false,
          message: 'No active subscription. Please upgrade to receive orders.',
        };
      }

      const sub = activeSubscription[0];
      
      if (sub.orderLimit === -1) {
        return {
          hasActiveSubscription: true,
          canTakeOrders: true,
          ordersRemaining: -1,
          message: 'Unlimited orders available',
        };
      }

      const ordersRemaining = sub.orderLimit - (sub.ordersUsed || 0);
      
      return {
        hasActiveSubscription: true,
        canTakeOrders: ordersRemaining > 0,
        ordersRemaining,
        message: ordersRemaining > 0 
          ? `${ordersRemaining} orders remaining in current plan`
          : 'Order limit reached. Please upgrade your plan.',
      };
    } catch (error) {
      console.error('Subscription check error:', error);
      throw error;
    }
  }

  static async incrementOrderCount(restaurantId: string) {
    try {
      const activeSubscription = await storage.db.select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.restaurantId, restaurantId),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (activeSubscription.length) {
        await storage.db.update(subscriptions)
          .set({
            ordersUsed: (activeSubscription[0].ordersUsed || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, activeSubscription[0].id));
      }
    } catch (error) {
      console.error('Order count increment error:', error);
    }
  }
}
