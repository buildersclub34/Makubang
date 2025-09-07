import { InferSelectModel } from 'drizzle-orm';
import * as schema from '../schema';

export type User = InferSelectModel<typeof schema.users>;
export type Restaurant = InferSelectModel<typeof schema.restaurants> & {
  location?: { lat: number; lng: number };
};
export type Order = InferSelectModel<typeof schema.orders> & {
  items: OrderItem[];
  restaurant?: Restaurant;
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
};

export type OrderItem = InferSelectModel<typeof schema.orderItems> & {
  menuItem?: MenuItem;
};

export type MenuItem = InferSelectModel<typeof schema.menuItems>;

export type SubscriptionPlan = InferSelectModel<typeof schema.subscriptionPlans> & {
  features: Record<string, any>;
};

export type Subscription = InferSelectModel<typeof schema.subscriptions> & {
  plan: SubscriptionPlan;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date | null;
  quantity?: number;
};

export type SubscriptionInvoice = InferSelectModel<typeof schema.subscriptionInvoices>;

export type Payment = InferSelectModel<typeof schema.payments>;
