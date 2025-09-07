import { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  description: string;
  address: string;
  location: {
    type: string;
    coordinates: number[];
  };
  cuisineType: string[];
  openingHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  contact: {
    phone: string;
    email: string;
  };
  owner: Types.ObjectId;
  isActive: boolean;
  rating?: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
      },
    },
    cuisineType: [
      {
        type: String,
        required: [true, 'At least one cuisine type is required'],
      },
    ],
    openingHours: {
      monday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      tuesday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      wednesday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      thursday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      friday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      saturday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
      sunday: {
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Contact phone is required'],
      },
      email: {
        type: String,
        required: [true, 'Contact email is required'],
        lowercase: true,
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    imageUrl: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create a 2dsphere index for geospatial queries
restaurantSchema.index({ location: '2dsphere' });

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);
