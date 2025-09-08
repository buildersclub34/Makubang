import { Types } from 'mongoose';
import { AppError } from '../middleware/error-handler.js';
import { SubscriptionPlan } from '../models/subscription-plan.model.js';
import { RestaurantSubscription } from '../models/restaurant-subscription.model.js';
import { SubscriptionUsage } from '../models/subscription-usage.model.js';
import { addDays, addMonths } from 'date-fns';

// Custom error classes
class NotFoundError extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 404;
    this.status = 'not_found';
    this.isOperational = true;
  }
}

class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 403;
    this.status = 'forbidden';
    this.isOperational = true;
  }
}

class InternalServerError extends AppError {
  constructor(message: string) {
    super(message);
    this.statusCode = 500;
    this.status = 'error';
    this.isOperational = true;
  }
}

class SubscriptionService {
  // Plan Management
  async createPlan(planData: Omit<ISubscriptionPlan, 'createdAt' | 'updatedAt'>) {
    try {
      const plan = new SubscriptionPlan(planData);
      return await plan.save();
    } catch (error) {
      throw new InternalServerError('Failed to create subscription plan');
    }
  }

  async getPlan(planId: string) {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }
    return plan;
  }

  async updatePlan(planId: string, updates: Partial<ISubscriptionPlan>) {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!plan) {
      throw new NotFoundError('Subscription plan not found');
    }
    
    return plan;
  }

  // Subscription Management
  async createSubscription(restaurantId: string, planId: string, paymentId?: string) {
    const plan = await this.getPlan(planId);
    const now = new Date();
    
    const subscription = new RestaurantSubscription({
      restaurantId: new Types.ObjectId(restaurantId),
      planId: plan._id,
      startDate: now,
      endDate: addDays(now, plan.durationDays),
      paymentId: paymentId ? new Types.ObjectId(paymentId) : undefined,
      remainingOrders: plan.maxOrders,
      status: 'active'
    });

    return await subscription.save();
  }

  async getSubscription(subscriptionId: string) {
    const subscription = await RestaurantSubscription.findById(subscriptionId)
      .populate('planId')
      .populate('restaurantId');
      
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }
    
    return subscription;
  }

  // Usage Tracking
  async trackUsage(subscriptionId: string, feature: string, quantity: number = 1) {
    const subscription = await this.getSubscription(subscriptionId);
    
    if (subscription.status !== 'active') {
      throw new ForbiddenError('Subscription is not active');
    }

    const now = new Date();
    
    // Find or create usage record for current period
    let usage = await SubscriptionUsage.findOne({
      subscriptionId: subscription._id,
      feature,
      periodStart: { $lte: now },
      periodEnd: { $gte: now }
    });

    if (!usage) {
      // Create new usage record for the period
      const plan = await this.getPlan(subscription.planId.toString());
      const periodStart = now;
      const periodEnd = addMonths(now, 1); // Default to monthly period
      
      usage = new SubscriptionUsage({
        subscriptionId: subscription._id,
        feature,
        used: 0,
        limit: plan.features?.[feature]?.limit || 1000, // Default limit if not specified
        periodStart,
        periodEnd,
        resetAt: periodEnd
      });
    }

    // Update usage
    const newUsage = usage.used + quantity;
    if (newUsage > usage.limit) {
      throw new ForbiddenError(`Usage limit exceeded for feature: ${feature}`);
    }

    usage.used = newUsage;
    usage.updatedAt = now;
    
    return await usage.save();
  }

  // Check subscription status and limits
  async checkFeatureAccess(subscriptionId: string, feature: string) {
    const subscription = await this.getSubscription(subscriptionId);
    
    if (subscription.status !== 'active') {
      return { hasAccess: false, reason: 'Subscription is not active' };
    }

    const now = new Date();
    const usage = await SubscriptionUsage.findOne({
      subscriptionId: subscription._id,
      feature,
      periodStart: { $lte: now },
      periodEnd: { $gte: now }
    });

    if (!usage) {
      return { hasAccess: true, remaining: Infinity };
    }

    const remaining = usage.limit - usage.used;
    return {
      hasAccess: remaining > 0,
      remaining,
      limit: usage.limit,
      resetAt: usage.resetAt
    };
  }

  // Process subscription renewal
  async renewSubscription(subscriptionId: string, paymentId?: string) {
    const subscription = await this.getSubscription(subscriptionId);
    const plan = await this.getPlan(subscription.planId.toString());
    
    // Update subscription dates
    const now = new Date();
    subscription.startDate = now;
    subscription.endDate = addDays(now, plan.durationDays);
    subscription.remainingOrders = plan.maxOrders;
    subscription.status = 'active';
    
    if (paymentId) {
      subscription.paymentId = new Types.ObjectId(paymentId);
    }
    
    return await subscription.save();
  }
}

export const subscriptionService = new SubscriptionService();

export interface ISubscriptionPlan {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  maxOrders?: number;
  features?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
