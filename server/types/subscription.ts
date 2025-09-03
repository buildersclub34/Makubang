import { SubscriptionPlan as DbSubscriptionPlan } from '@shared/schema';

export interface SubscriptionPlan extends Omit<DbSubscriptionPlan, 'features' | 'price'> {
  features: string[];
  price: number;
  billingCycle: 'monthly' | 'yearly';
  trialDays: number;
  metadata?: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'paused';
  startDate: Date;
  endDate: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  quantity: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date | null;
  paymentMethodId?: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  attemptCount: number;
  nextPaymentAttempt: Date | null;
  paidAt: Date | null;
  paymentIntentId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  userId: string;
  feature: string;
  used: number;
  limit: number;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  paymentMethodId: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  quantity?: number;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProcessPaymentInput {
  userId: string;
  plan: Pick<SubscriptionPlan, 'id' | 'price' | 'currency' | 'name' | 'billingCycle'>;
  paymentMethodId: string;
  subscriptionId: string;
  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceInput {
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
}
