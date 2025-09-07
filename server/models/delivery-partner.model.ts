import { Schema, model, Document } from 'mongoose';

export interface IDeliveryPartner extends Document {
  name: string;
  phone?: string;
  email: string;
  isAvailable: boolean;
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  vehicleType?: string;
  rating?: number;
  status: 'available' | 'unavailable' | 'on-delivery';
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'car', 'bicycle'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ['available', 'unavailable', 'on-delivery'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Create a 2dsphere index for location-based queries
deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

const DeliveryPartner = model<IDeliveryPartner>('DeliveryPartner', deliveryPartnerSchema);

export default DeliveryPartner;
