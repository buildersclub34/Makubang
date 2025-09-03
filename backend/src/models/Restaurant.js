const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a restaurant name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    logo: {
      type: String,
      default: 'default-restaurant.jpg',
    },
    coverImage: {
      type: String,
    },
    cuisines: [
      {
        type: String,
        enum: [
          'indian',
          'chinese',
          'italian',
          'mexican',
          'thai',
          'japanese',
          'korean',
          'american',
          'mediterranean',
          'bakery',
          'desserts',
          'beverages',
          'street_food',
          'other',
        ],
      },
    ],
    contact: {
      email: {
        type: String,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          'Please add a valid email',
        ],
      },
      phone: {
        type: String,
        maxlength: [20, 'Phone number cannot be longer than 20 characters'],
      },
      website: {
        type: String,
        match: [
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
          'Please use a valid URL with HTTP or HTTPS',
        ],
      },
    },
    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    priceRange: {
      type: Number,
      min: 1,
      max: 4,
    },
    location: {
      // GeoJSON Point
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      formattedAddress: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
    },
    delivery: {
      providesDelivery: {
        type: Boolean,
        default: false,
      },
      minOrder: {
        type: Number,
        default: 0,
      },
      deliveryFee: {
        type: Number,
        default: 0,
      },
      deliveryTime: {
        type: String,
      },
      deliveryRadius: {
        type: Number, // in kilometers
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'premium', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'cancelled'],
        default: 'inactive',
      },
      startDate: Date,
      endDate: Date,
      orderLimit: {
        type: Number,
        default: 0,
      },
      orderCount: {
        type: Number,
        default: 0,
      },
    },
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    staff: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['manager', 'chef', 'delivery', 'staff'],
          default: 'staff',
        },
        permissions: [String],
      },
    ],
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create restaurant slug from the name
RestaurantSchema.pre('save', function (next) {
  // Generate slug logic here if needed
  next();
});

// Cascade delete dishes when a restaurant is deleted
RestaurantSchema.pre('remove', async function (next) {
  await this.model('Dish').deleteMany({ restaurant: this._id });
  await this.model('Video').updateMany(
    { restaurant: this._id },
    { $unset: { restaurant: '' } }
  );
  next();
});

// Reverse populate with virtuals
RestaurantSchema.virtual('dishes', {
  ref: 'Dish',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false,
});

RestaurantSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false,
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
