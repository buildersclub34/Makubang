import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

export class SubscriptionEnforcementService {
  private static instance: SubscriptionEnforcementService;

  static getInstance(): SubscriptionEnforcementService {
    if (!SubscriptionEnforcementService.instance) {
      SubscriptionEnforcementService.instance = new SubscriptionEnforcementService();
    }
    return SubscriptionEnforcementService.instance;
  }

  async checkOrderQuota(restaurantId: string): Promise<{ allowed: boolean; remaining: number; plan: string }> {
    const db = getDB();
    
    // Get active subscription
    const subscription = await db.collection('restaurant_subscriptions').findOne({
      restaurantId: new ObjectId(restaurantId),
      status: 'active',
      endDate: { $gte: new Date() }
    });

    if (!subscription) {
      return { allowed: false, remaining: 0, plan: 'none' };
    }

    // Get plan details
    const plan = await db.collection('subscription_plans').findOne({
      _id: new ObjectId(subscription.planId)
    });

    if (!plan) {
      return { allowed: false, remaining: 0, plan: 'unknown' };
    }

    // Check if unlimited plan
    if (plan.name.toLowerCase().includes('unlimited')) {
      return { allowed: true, remaining: -1, plan: plan.name };
    }

    // Check order count for current period
    const currentOrders = subscription.orderCount || 0;
    const orderLimit = subscription.orderLimit || plan.orderLimit || 0;
    const remaining = Math.max(0, orderLimit - currentOrders);

    return {
      allowed: remaining > 0,
      remaining,
      plan: plan.name
    };
  }

  async consumeOrderQuota(restaurantId: string): Promise<boolean> {
    const db = getDB();
    
    const result = await db.collection('restaurant_subscriptions').updateOne(
      {
        restaurantId: new ObjectId(restaurantId),
        status: 'active',
        endDate: { $gte: new Date() }
      },
      {
        $inc: { orderCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  async getSubscriptionPlans(): Promise<any[]> {
    const db = getDB();
    return await db.collection('subscription_plans')
      .find({ isActive: true })
      .sort({ price: 1 })
      .toArray();
  }

  async createSubscription(restaurantId: string, planId: string, paymentId: string): Promise<any> {
    const db = getDB();
    
    const plan = await db.collection('subscription_plans').findOne({
      _id: new ObjectId(planId)
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    // End any existing active subscriptions
    await db.collection('restaurant_subscriptions').updateMany(
      { restaurantId: new ObjectId(restaurantId), status: 'active' },
      { $set: { status: 'cancelled', updatedAt: new Date() } }
    );

    // Create new subscription
    const subscription = {
      _id: new ObjectId(),
      restaurantId: new ObjectId(restaurantId),
      planId: new ObjectId(planId),
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000),
      paymentId,
      orderLimit: plan.orderLimit,
      orderCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('restaurant_subscriptions').insertOne(subscription);
    return subscription;
  }

  async getActiveSubscription(restaurantId: string): Promise<any> {
    const db = getDB();
    return await db.collection('restaurant_subscriptions').findOne({
      restaurantId: new ObjectId(restaurantId),
      status: 'active',
      endDate: { $gte: new Date() }
    });
  }
}

export const subscriptionEnforcement = SubscriptionEnforcementService.getInstance();
