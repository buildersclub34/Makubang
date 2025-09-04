import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  addons?: Array<{
    id: Types.ObjectId;
    name: string;
    price: number;
  }>;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  restaurant: Types.ObjectId;
  items: IOrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryFee: number;
  taxAmount: number;
  paymentMethod: 'cash' | 'card' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  deliveryInstructions?: string;
  deliveryPartner?: Types.ObjectId;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  cancellationReason?: string;
  rating?: number;
  review?: string;
  trackingData?: {
    location: {
      lat: number;
      lng: number;
    };
    updatedAt: Date;
    history: Array<{
      location: {
        lat: number;
        lng: number;
      };
      timestamp: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  specialInstructions: String,
  addons: [
    {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Addon',
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
});

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'online'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    deliveryInstructions: String,
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    cancellationReason: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
    trackingData: {
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
      updatedAt: Date,
      history: [
        {
          location: {
            lat: { type: Number },
            lng: { type: Number },
          },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better query performance
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });
orderSchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

export const Order = model<IOrder>('Order', orderSchema);
