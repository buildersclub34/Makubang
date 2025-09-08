import { Schema, model, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  maxOrders?: number;
  features?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  durationDays: { type: Number, required: true },
  maxOrders: Number,
  features: Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
