import { db } from '../db';
import {
  subscriptionPlans,
  subscriptions,
  subscriptionInvoices, 
  subscriptionUsage
} from '@shared/schema';
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
type DbSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
type DbSubscription = typeof subscriptions.$inferSelect;
type DbSubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
type DbSubscriptionUsage = typeof subscriptionUsage.$inferSelect;

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
export type SubscriptionUsage = ISubscriptionUsage;
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
      throw new InternalServerError('Failed to process payment');
    }
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<ISubscription> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      return subscription as ISubscription;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
   */
  /**
   * Get current usage for a subscription feature
   */
  public async getUsage(subscriptionId: string, feature: string): Promise<number> {
    try {
      // First, verify the subscription exists
      const subscription = await db.query.subscriptions.findFirst({
        where: (sub, { eq }) => eq(sub.id, subscriptionId)
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      const now = new Date();
      
      // Get current usage period (typically monthly or yearly based on plan)
      const usage = await db.query.subscriptionUsage.findFirst({
        where: (usage, { and, eq, gte }) => 
          and(
            eq(usage.subscriptionId, subscriptionId),
            eq(usage.feature, feature),
            gte(usage.periodEnd, now)
          )
      });

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
  ): Promise<ISubscriptionUsage> {
    return db.transaction(async (tx) => {
      // Get subscription and plan
      const subscription = await this.getSubscription(subscriptionId);
      const plan = await this.getPlan(subscription.planId);
      
      // Check if subscription is active
      if (subscription.status !== 'active') {
        throw new ForbiddenError('Subscription is not active');
      }

      // Check if feature is included in the plan
      if (!plan.features.includes(feature)) {
        throw new ForbiddenError(`Feature ${feature} is not included in this plan`);
      }

      // Check usage limits
      const currentUsage = await this.getUsage(subscriptionId, feature);
      const maxUsage = plan.maxUsage || 0;
      
      if (maxUsage > 0 && (currentUsage + quantity) > maxUsage) {
        throw new ForbiddenError(`Usage limit exceeded for feature ${feature}`);
      }

      // Record usage
      const now = new Date();
      const existingUsage = await tx.query.subscriptionUsage.findFirst({
        where: (usage, { and, eq, gte }) => 
          and(
            eq(usage.subscriptionId, subscriptionId),
            eq(usage.feature, feature),
            gte(usage.periodEnd, now)
          )
      });
      
      if (existingUsage) {
        // Update existing usage record
        const newUsage = (existingUsage.used || 0) + quantity;
        const [updatedUsage] = await tx
          .update(subscriptionUsage)
          .set({
            used: newUsage,
            updatedAt: now,
          })
          .where(eq(subscriptionUsage.id, existingUsage.id))
          .returning();

        return updatedUsage as ISubscriptionUsage;
      } else {
        // Create new usage record
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30); // Default 30-day period
        
        const [newUsage] = await tx
          .insert(subscriptionUsage)
          .values({
            id: `usage_${uuidv4()}`,
            subscriptionId,
            userId,
            feature,
            used: quantity,
            limit: maxUsage,
            periodStart: now,
            periodEnd,
            resetAt: periodEnd,
            metadata: {},
            createdAt: now,
            updatedAt: now,
          })
          .returning();
          
        return newUsage as ISubscriptionUsage;
      }
    });
  }

  // Webhook event types
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
          logger.warn(`Unhandled webhook event type: ${(event as any).type}`);
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
      throw new InternalServerError('Failed to process payment captured event');
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(payload: PaymentFailedPayload): Promise<void> {
    try {
      const { id: paymentId, error_code, error_description } = payload;
      
      // Find the invoice for this payment
      const invoice = await db.query.subscriptionInvoices.findFirst({
        where: (invoices, { eq }) => eq(invoices.paymentId, paymentId)
      });
      
      if (invoice) {
        // Update invoice status to failed
        await db.update(subscriptionInvoices)
          .set({ 
            status: 'failed',
            updatedAt: new Date(),
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
          }
        });
      } else {
        logger.warn('Received payment failed webhook for unknown payment', { paymentId });
      }
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id));
      
    logger.info('Subscription cancelled', { subscriptionId: id });
  }

  // Billing Cycle Management
  async processRecurringBilling(): Promise<void> {
    try {
      // Get all active subscriptions that are due for renewal
      const today = new Date();
      const dueSubscriptions = await db
        .select()
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.status, 'active'),
            lte(subscriptions.currentPeriodEnd, today)
          )
        );

      // Process each subscription
      for (const row of dueSubscriptions) {
        try {
          if (!row.subscriptionPlans) {
            logger.warn('Subscription plan not found for subscription', { subscriptionId: row.subscriptions.id });
            continue;
          }

          const subscription = row.subscriptions;
          const plan = row.subscriptionPlans;

          // Create invoice for the new billing period
          const invoice = await this.createInvoice({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            amount: typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price,
            currency: plan.currency || 'USD',
            description: `Recurring payment for ${plan.name} (${plan.billingCycle})`
          });

          // Process payment
          const payment = await this.razorpayService.createRazorpayOrder({
            amount: Math.round(invoice.amount * 100), // Convert to paise
            currency: invoice.currency,
            receipt: `invoice_${invoice.id}`,
            payment_capture: 1,
            notes: {
              invoiceId: invoice.id,
              subscriptionId: subscription.id,
              type: 'recurring_payment'
            }
          receipt: `inv_${invoice.id}`,
          notes: {
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            type: 'recurring',
          },
        });

        // Update invoice with payment info
        await db.update(subscriptionInvoices)
          .set({
            paymentIntentId: payment.id,
            status: payment.status === 'captured' ? 'paid' : 'open',
            paidAt: payment.status === 'captured' ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionInvoices.id, invoice.id));

        // Update subscription period
        const periodStart = subscription.currentPeriodEnd;
        const periodEnd = subscription.plan.billingCycle === 'yearly'
          ? addMonths(periodStart, 12)
          : addMonths(periodStart, 1);

        await db.update(subscriptions)
          .set({
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        // TODO: Send payment confirmation email

      } catch (error) {
        logger.error('Error processing recurring billing', {
          error,
          subscriptionId: subscription.id,
          userId: subscription.userId,
        });

        // Update subscription status if payment failed
        if (error instanceof Error && error.message.includes('payment failed')) {
          await db.update(subscriptions)
            .set({
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
