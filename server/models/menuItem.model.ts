import { Schema, model, Document, Types } from 'mongoose';

export interface IMenuItemVariant {
  name: string;
  price: number;
  calories?: number;
  isDefault: boolean;
}

export interface IAddonGroup {
  _id: Types.ObjectId;
  name: string;
  isRequired: boolean;
  minSelections?: number;
  maxSelections?: number;
  addons: Array<{
    _id: Types.ObjectId;
    name: string;
    price: number;
    isAvailable: boolean;
  }>;
}

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  restaurant: Types.ObjectId;
  category: Types.ObjectId;
  price: number;
  discountedPrice?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  preparationTime: number; // in minutes
  variants?: IMenuItemVariant[];
  addonGroups?: IAddonGroup[];
  tags?: string[];
  rating?: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemVariantSchema = new Schema<IMenuItemVariant>({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  calories: {
    type: Number,
    min: 0,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const addonGroupSchema = new Schema<IAddonGroup>({
  name: {
    type: String,
    required: true,
  },
  isRequired: {
    type: Boolean,
    default: false,
  },
  minSelections: {
    type: Number,
    min: 0,
  },
  maxSelections: {
    type: Number,
    min: 1,
  },
  addons: [
    {
      _id: {
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
      isAvailable: {
        type: Boolean,
        default: true,
      },
    },
  ],
});

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
    },
    description: String,
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (this: IMenuItem, value: number) {
          return value < this.price;
        },
        message: 'Discounted price must be less than the regular price',
      },
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    isGlutenFree: {
      type: Boolean,
      default: false,
    },
    isSpicy: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    imageUrl: String,
    preparationTime: {
      type: Number,
      required: true,
      min: 0,
    },
    variants: [menuItemVariantSchema],
    addonGroups: [addonGroupSchema],
    tags: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better query performance
menuItemSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound index for text search with weights
menuItemSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { weights: { name: 3, tags: 2, description: 1 } }
);

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
