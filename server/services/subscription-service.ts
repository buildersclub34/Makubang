import { db } from '../db';
import {
  subscriptionPlans,
  subscriptions,
  subscriptionInvoices, 
  subscriptionUsage,
  type InferSelectModel
} from '../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, isAfter, isBefore, differenceInDays } from 'date-fns';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/error-handler';
import razorpayService from './razorpay-service';

// Import types
import type { 
  SubscriptionPlan as ISubscriptionPlan,
  Subscription as ISubscription,
  SubscriptionInvoice as ISubscriptionInvoice,
  SubscriptionUsage as ISubscriptionUsage
} from '../types/subscription';

type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';

// Define database row types
type DbSubscriptionPlan = InferSelectModel<typeof subscriptionPlans>;
type DbSubscription = InferSelectModel<typeof subscriptions>;
type DbSubscriptionInvoice = InferSelectModel<typeof subscriptionInvoices>;
type DbSubscriptionUsage = InferSelectModel<typeof subscriptionUsage>;

type RazorpayOrderOptions = {
  amount: number;
  currency: string;
  receipt: string;
  payment_capture: 0 | 1; // Must be 0 or 1 for Razorpay
  notes?: Record<string, any>;
};

export type BillingCycle = 'monthly' | 'yearly' | 'one_time';

// Use the imported types from shared schema
export type SubscriptionPlan = ISubscriptionPlan;
export type Subscription = ISubscription;
export type SubscriptionInvoice = ISubscriptionInvoice;

export interface SubscriptionUsage extends ISubscriptionUsage {
  limit: number;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date | null;
}

export class SubscriptionService {
  private razorpayService = razorpayService;

  // Plan Management
  async createPlan(data: Omit<ISubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISubscriptionPlan> {
    try {
      const planData: SubscriptionPlan = {
        id: `plan_${uuidv4()}`,
        name: data.name,
        description: data.description || null,
        price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
        currency: data.currency || 'USD',
        durationDays: data.durationDays || 30,
        maxOrders: data.maxOrders || null,
        features: Array.isArray(data.features) ? data.features : [],
        isActive: data.isActive ?? true,
        trialDays: data.trialDays || 0,
        billingCycle: data.billingCycle || 'monthly',
        maxUsage: (data as any).maxUsage || null,
        createdAt: new Date(),
        updatedAt: null
      };
      
      const [plan] = await db.insert(subscriptionPlans)
        .values(planData)
        .returning();

      return {
        ...planData,
        ...plan
      };
    } catch (error) {
      logger.error('Error creating subscription plan', { error });
      throw new InternalServerError('Failed to create subscription plan');
    }
  }

  async getPlans(): Promise<ISubscriptionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true));
      
      return plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
        currency: plan.currency || 'USD',
        durationDays: plan.durationDays || 30,
        maxOrders: plan.maxOrders || null,
        features: Array.isArray(plan.features) ? plan.features : [],
        isActive: plan.isActive ?? true,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        billingCycle: plan.billingCycle === 'yearly' ? 'yearly' : 'monthly',
        trialDays: plan.trialDays || 0,
        maxUsage: (plan as any).maxUsage || null
      }));
    } catch (error) {
      logger.error('Failed to fetch subscription plans', { error });
      throw new InternalServerError('Failed to fetch subscription plans');
    }
  }

  async getPlan(planId: string): Promise<ISubscriptionPlan> {
    try {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: (plans, { eq }) => eq(plans.id, planId),
      });

      if (!plan) {
        throw new NotFoundError('Subscription plan not found');
      }

      return {
        ...plan,
        price: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
        features: Array.isArray(plan.features) ? plan.features : [],
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        billingCycle: plan.billingCycle === 'yearly' ? 'yearly' : 'monthly',
        trialDays: plan.trialDays || 0,
        maxUsage: plan.maxUsage || null
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to fetch subscription plan', { planId, error });
      throw new InternalServerError('Failed to fetch subscription plan');
    }
  }

  async updatePlan(planId: string, updates: Partial<Omit<ISubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ISubscriptionPlan> {
    try {
      const updateData: Partial<typeof subscriptionPlans.$inferInsert> = {
        ...updates,
        updatedAt: new Date()
      };
      
      const [updatedPlan] = await db
        .update(subscriptionPlans)
        .set(updateData)
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      if (!updatedPlan) {
        throw new NotFoundError('Subscription plan not found');
      }

      return updatedPlan;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error updating subscription plan', { error, planId });
      throw new InternalServerError('Failed to update subscription plan');
    }
  }

  async listPlans(filter: {
    isActive?: boolean;
    billingCycle?: 'monthly' | 'yearly';
  } = {}): Promise<ISubscriptionPlan[]> {
    const where = [];
    
    if (filter.isActive !== undefined) {
      where.push(eq(subscriptionPlans.isActive, filter.isActive));
    }
    
    if (filter.billingCycle) {
      where.push(eq(subscriptionPlans.billingCycle, filter.billingCycle));
    }

    return db.query.subscriptionPlans.findMany({
      where: where.length > 0 ? and(...where) : undefined,
      orderBy: (plans, { asc }) => [asc(plans.price)],
    });
  }

  // Subscription Management
  async createSubscription(data: {
    userId: string;
    planId: string;
    paymentMethodId: string;
    trialDays?: number;
    metadata?: Record<string, any>;
  }): Promise<ISubscription> {
    const { userId, planId, paymentMethodId, trialDays, metadata } = data;
    
    // Start a database transaction
    return db.transaction(async (tx) => {
      // 1. Get the plan details
      const plan = await this.getPlan(planId);
      
      // 2. Check if user already has an active subscription
      const existingSubscription = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      if (existingSubscription.length > 0) {
        throw new ConflictError('User already has an active subscription');
      }

      // 3. Calculate subscription dates
      const trialDaysToUse = trialDays ?? plan.trialDays ?? 0;
      const startDate = new Date();
      const endDate = trialDaysToUse > 0 
        ? addDays(startDate, trialDaysToUse) 
        : addMonths(startDate, plan.billingCycle === 'yearly' ? 12 : 1);

      const subscriptionData = {
        id: `sub_${uuidv4()}`,
        userId,
        planId,
        status: 'active' as const,
        startDate,
        endDate,
        cancelAtPeriodEnd: false,
        paymentMethodId,
        trialStart: trialDaysToUse > 0 ? startDate : null,
        trialEnd: trialDaysToUse > 0 ? endDate : null,
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: null
      };

      // 4. Create subscription record
      const [newSubscription] = await tx
        .insert(subscriptions)
        .values(subscriptionData)
        .returning();

      return newSubscription as ISubscription;
    });
  }

  /**
   * Process payment for a subscription
   */
  private async processPayment(input: { userId: string, plan: ISubscriptionPlan, paymentMethodId: string, subscriptionId: string, metadata?: Record<string, unknown> }): Promise<{
    orderId: string;
    paymentRecordId: string;
    clientSecret?: string;
  }> {
    const { userId, plan, paymentMethodId, subscriptionId, metadata } = input;
    
    try {
      // 1. Create a payment intent with Razorpay
      const orderOptions: RazorpayOrderOptions = {
        amount: Math.round(plan.price * 100), // Convert to paise
        currency: plan.currency || 'INR',
        receipt: `sub_${subscriptionId}_${Date.now()}`,
        payment_capture: 1, // Auto-capture payment
        notes: {
          userId,
          planId: plan.id,
          subscriptionId,
          ...(metadata || {})
        }
      };
      
      const order = await razorpayService.createRazorpayOrder(orderOptions);

      if (!order || !order.id) {
        throw new Error('Failed to create Razorpay order');
      }

      // 2. Create a payment record in our database
      const paymentRecord = await razorpayService.createPaymentRecord({
        orderId: order.id,
        amount: plan.price,
        currency: plan.currency || 'INR',
        status: 'created',
        userId,
        metadata: {
          planName: plan.name,
          subscriptionId,
          ...(metadata || {})
        }
      });

      // 3. Return the payment intent client secret
      return {
        orderId: order.id,
        paymentRecordId: paymentRecord.id,
        clientSecret: (order as any).razorpay_payment_id // Type assertion as Razorpay types might not be fully typed
      };
    } catch (error) {
      logger.error('Failed to process payment', { error, userId, subscriptionId });

          // Process the payment for the subscription
          await this.processPayment({
            userId: subscription.userId,
            plan: await this.getPlan(subscription.planId),
            paymentMethodId: subscription.paymentMethodId || '',
            subscriptionId: subscription.id
          });

          // Update subscription with new period
          await db.update(subscriptions)
            .set({
              startDate: new Date(),
              endDate: new Date(Date.now() + (subscription.plan.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000), // 30 days or 1 year from now
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, subscription.id));
        } catch (error) {
          console.error(`Failed to process subscription ${subscription.id}:`, error);
          // Mark subscription as past due if payment fails
          await db.update(subscriptions)
            .set({
              status: 'past_due',
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, subscription.id));
        }
      }
    } catch (error) {
      console.error('Error in processRecurringBilling:', error);
      throw new Error('Failed to process recurring billing');
    }
  }

  /**
   * Get current usage for a subscription feature
   */
  public async getUsage(subscriptionId: string, feature: string): Promise<number> {
    try {
      // First, verify the subscription exists
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      const now = new Date();
      
      // Get current usage period (typically monthly or yearly based on plan)
      const [usage] = await db
        .select()
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.subscriptionId, subscriptionId),
            eq(subscriptionUsage.feature, feature),
            gte(subscriptionUsage.periodEnd, now)
          )
        )
        .limit(1);

      return usage?.used ?? 0;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      logger.error('Failed to get usage', { subscriptionId, feature, error });
      throw new InternalServerError('Failed to retrieve usage data');
    }
  }

// ... (rest of the code remains the same)
  /**
   * Track usage of a subscription feature
   */
  async trackUsage(
    subscriptionId: string,
    userId: string,
    feature: string,
    quantity: number = 1
  ): Promise<SubscriptionUsage> {
    return db.transaction(async (tx) => {
      try {
        // Get subscription and plan
        const [subscription] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, subscriptionId))
          .limit(1);

        if (!subscription) {
          throw new NotFoundError('Subscription not found');
        }

        const plan = await this.getPlan(subscription.planId);
        
        // Check if subscription is active
        if (subscription.status !== 'active') {
          throw new ForbiddenError('Subscription is not active');
        }

        // Check if feature is included in the plan
        if (!plan.features || !plan.features.includes(feature)) {
          throw new ForbiddenError(`Feature ${feature} is not included in this plan`);
        }

        // Get or create usage record
        const today = new Date();
        const [usage] = await tx
          .select()
          .from(subscriptionUsage)
          .where(
            and(
              eq(subscriptionUsage.subscriptionId, subscriptionId),
              eq(subscriptionUsage.feature, feature),
              gte(subscriptionUsage.periodEnd, today)
            )
          )
          .limit(1);

        let updatedUsage: SubscriptionUsage;
        
        if (usage) {
          // Update existing usage
          [updatedUsage] = await tx
            .update(subscriptionUsage)
            .set({
              used: (usage.used || 0) + quantity,
              updatedAt: new Date()
            })
            .where(eq(subscriptionUsage.id, usage.id))
            .returning();
        } else {
          // Create new usage record
          [updatedUsage] = await tx
            .insert(subscriptionUsage)
            .values({
              id: `usage_${uuidv4()}`,
              subscriptionId,
              feature,
              used: quantity,
              limit: plan.maxUsage || null,
              periodStart: today,
              periodEnd: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
              resetAt: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
              createdAt: new Date(),
              updatedAt: null
            })
            .returning();
        }

        return updatedUsage;
      } catch (error) {
        logger.error('Error tracking subscription usage', { 
          error, 
          subscriptionId, 
          userId, 
          feature, 
          quantity 
        });
        throw new InternalServerError('Failed to track subscription usage');
      }
    });
  }

  /**
   * Get a subscription by ID
   */
  private async getSubscription(id: string): Promise<DbSubscription> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return subscription;
  }

  // Webhook event type
type WebhookEvent = {
  type: 'payment.captured' | 'payment.failed' | 'subscription.updated' | 'subscription.cancelled';
  data: PaymentCapturedPayload | PaymentFailedPayload | SubscriptionUpdatedPayload | SubscriptionCancelledPayload;
};

type PaymentCapturedPayload = {
  payment_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
};

type PaymentFailedPayload = {
  payment_id: string;
  order_id: string;
  amount: number;
  currency: string;
  error_code: string;
  error_description: string;
  created_at: number;
};

type SubscriptionUpdatedPayload = {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
};

type SubscriptionCancelledPayload = {
  id: string;
  status: 'cancelled';
  cancel_at_period_end: boolean;
  canceled_at: number;
  ended_at: number | null;
  customer_id: string;
  created_at: number;
};

  /**
   * Handle webhook events from payment provider
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    if (!event?.type || !event.data) {
      throw new Error('Invalid webhook event');
    }

    try {
      switch (event.type) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event.data as PaymentCapturedPayload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.data as PaymentFailedPayload);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(event.data as SubscriptionUpdatedPayload);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(event.data as SubscriptionCancelledPayload);
          break;
        default:
          console.warn(`Unhandled webhook event type: ${(event as any).type}`);
      }
    } catch (error) {
      logger.error(`Error handling webhook event ${event.type}:`, error);
      throw new InternalServerError('Failed to process webhook event');
    }
  }

  /**
   * Handle payment captured event
   */
  private async handlePaymentCaptured(payload: PaymentCapturedPayload): Promise<void> {
    try {
      const { id: paymentId, amount, currency, status, order_id: orderId } = payload;
      
      // Update invoice status in database
      await db.update(subscriptionInvoices)
        .set({ 
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(subscriptionInvoices.paymentId, paymentId));
      
      logger.info(`Payment captured for order ${orderId}`, { 
        paymentId, 
        amount, 
        currency 
      });
      
    } catch (error) {
      logger.error('Error handling payment captured event', { 
        error, 
        paymentId: payload.id,
        orderId: payload.order_id
      });
          error: {
            code: error_code,
            description: error_description,
            failedAt: new Date().toISOString()
          }
        })
        .where(eq(subscriptionInvoices.id, invoice.id));
        
      logger.warn(`Payment failed for invoice ${invoice.id}`, { 
        paymentId, 
        errorCode: error_code, 
        errorDescription: error_description 
      });
        
      // Optionally notify user of payment failure
      await this.notifyPaymentFailure(invoice.userId, {
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        error: {
          code: error_code,
          description: error_description
              status: 'past_due',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));

          // TODO: Send payment failure notification
        }
      }
    }
  }
}

// Example usage:
/*
const subscriptionService = new SubscriptionService();

// Create a subscription plan
const plan = await subscriptionService.createPlan({
  name: 'Pro Monthly',
  description: 'Professional plan billed monthly',
  price: 29.99,
  currency: 'USD',
  billingCycle: 'monthly',
  trialDays: 14,
  isActive: true,
  features: [
    'Unlimited videos',
    'HD streaming',
    'No ads',
  ],
  metadata: {
    features: {
      storage: { limit: 1024 * 1024 * 1024 * 50 }, // 50GB
      videoQuality: 'hd',
      maxVideoLength: 60 * 60 * 2, // 2 hours
    },
  },
});

// Subscribe a user to a plan
const { subscription, paymentIntent } = await subscriptionService.subscribe(
  'user_123',
  plan.id,
  'pm_card_visa', // Payment method ID
  14 // Optional trial period override
);

// Record usage for a feature
await subscriptionService.recordUsage(
  subscription.id,
  'user_123',
  'video_uploads',
  1
);

// Cancel subscription at period end
await subscriptionService.cancelSubscription(subscription.id, 'user_123');

// Update subscription (e.g., change plan or quantity)
await subscriptionService.updateSubscription(subscription.id, 'user_123', {
  planId: 'new_plan_id',
  quantity: 2,
});

// Process recurring billing (run as a scheduled job)
await subscriptionService.processRecurringBilling();
*/
