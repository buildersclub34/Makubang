import { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurantSubscription extends Document {
  restaurantId: Types.ObjectId;
  planId: Types.ObjectId;
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  paymentId?: Types.ObjectId;
  remainingOrders?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

const restaurantSubscriptionSchema = new Schema<IRestaurantSubscription>({
  restaurantId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Restaurant', 
    required: true 
  },
  planId: { 
    type: Schema.Types.ObjectId, 
    ref: 'SubscriptionPlan', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  paymentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Payment' 
  },
  remainingOrders: Number,
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

export const RestaurantSubscription = model<IRestaurantSubscription>(
  'RestaurantSubscription', 
  restaurantSubscriptionSchema
);
