import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionUsage extends Document {
  subscriptionId: Types.ObjectId;
  feature: string;
  used: number;
  limit: number;
  periodStart: Date;
  periodEnd: Date;
  resetAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

const subscriptionUsageSchema = new Schema<ISubscriptionUsage>({
  subscriptionId: { 
    type: Schema.Types.ObjectId, 
    ref: 'RestaurantSubscription',
    required: true 
  },
  feature: { 
    type: String, 
    required: true 
  },
  used: { 
    type: Number, 
    default: 0,
    min: 0
  },
  limit: { 
    type: Number, 
    required: true 
  },
  periodStart: { 
    type: Date, 
    required: true 
  },
  periodEnd: { 
    type: Date, 
    required: true 
  },
  resetAt: { 
    type: Date, 
    required: true 
  },
  metadata: Schema.Types.Mixed,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: Date
}, {
  // Compound index for efficient querying
  indexes: [
    { 
      subscriptionId: 1, 
      feature: 1, 
      periodEnd: 1 
    }
  ]
});

export const SubscriptionUsage = model<ISubscriptionUsage>(
  'SubscriptionUsage',
  subscriptionUsageSchema
);
