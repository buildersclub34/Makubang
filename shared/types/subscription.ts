import { InferSelectModel } from 'drizzle-orm';
import { subscriptionPlans, restaurantSubscriptions, payments } from '../schema';

export type SubscriptionPlan = InferSelectModel<typeof subscriptionPlans> & {
  billingCycle?: 'monthly' | 'yearly';
  trialDays?: number;
  maxUsage?: number;
};

export type Subscription = InferSelectModel<typeof restaurantSubscriptions> & {
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  quantity: number;
};

export type SubscriptionInvoice = {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  attemptCount: number;
  description?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  paidAt: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionUsage = {
  id: string;
  subscriptionId: string;
  userId: string;
  feature: string;
  used: number;
  limit: number;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export type Payment = InferSelectModel<typeof payments>;
