import { PgTable } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

declare module '@shared/schema' {
  // Subscription Plans
  export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string | null;
    price: string;
    currency: string | null;
    durationDays: number;
    maxOrders: number | null;
    isActive: boolean | null;
    features: Record<string, unknown>;
    billingCycle: string;
    trialDays: number;
    createdAt: Date;
    updatedAt: Date | null;
  }

  // Subscriptions
  export interface Subscription {
    id: string;
    restaurantId: string;
    planId: string;
    status: string;
    startDate: Date;
    endDate: Date;
    paymentMethod: string | null;
    amount: string;
    billingCycle: string;
    features: Record<string, unknown>;
    stripeSubscriptionId: string | null;
    canceledAt: Date | null;
    quantity: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    createdAt: Date;
    updatedAt: Date | null;
  }

  // Subscription Invoices
  export interface SubscriptionInvoice {
    id: string;
    subscriptionId: string;
    amount: string;
    currency: string;
    status: string;
    paidAt: Date | null;
    dueDate: Date;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date | null;
  }

  // Subscription Usage
  export interface SubscriptionUsage {
    id: string;
    subscriptionId: string;
    periodStart: Date;
    periodEnd: Date;
    ordersCount: number;
    featuresUsed: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date | null;
  }

  // Export the actual table types
  export const subscriptionPlans: PgTable<SubscriptionPlan>;
  export const subscriptions: PgTable<Subscription>;
  export const subscriptionInvoices: PgTable<SubscriptionInvoice>;
  export const subscriptionUsage: PgTable<SubscriptionUsage>;

  // Export type helpers
  export type SubscriptionPlanInsert = InferInsertModel<typeof subscriptionPlans>;
  export type SubscriptionPlanSelect = InferSelectModel<typeof subscriptionPlans>;
  
  export type SubscriptionInsert = InferInsertModel<typeof subscriptions>;
  export type SubscriptionSelect = InferSelectModel<typeof subscriptions>;
  
  export type SubscriptionInvoiceInsert = InferInsertModel<typeof subscriptionInvoices>;
  export type SubscriptionInvoiceSelect = InferSelectModel<typeof subscriptionInvoices>;
  
  export type SubscriptionUsageInsert = InferInsertModel<typeof subscriptionUsage>;
  export type SubscriptionUsageSelect = InferSelectModel<typeof subscriptionUsage>;
}

// Global type augmentation
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      RAZORPAY_KEY_ID: string;
      RAZORPAY_KEY_SECRET: string;
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_WS_URL: string;
    }
  }
}

// Make this file a module
export {};
