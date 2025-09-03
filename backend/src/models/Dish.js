const mongoose = require('mongoose');

const DishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a dish name'],
      trim: true,
      maxlength: [100, 'Dish name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price must be a positive number'],
    },
    image: {
      type: String,
      default: 'default-dish.jpg',
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
    isFeatured: {
      type: Boolean,
      default: false,
    },
    preparationTime: {
      type: Number, // in minutes
      default: 15,
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: [
        'appetizers',
        'main_course',
        'soups',
        'salads',
        'desserts',
        'beverages',
        'sides',
        'combos',
        'specials',
        'other',
      ],
    },
    cuisine: {
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
        'other',
      ],
      default: 'other',
    },
    ingredients: [
      {
        name: {
          type: String,
          required: [true, 'Please add an ingredient name'],
        },
        isAllergen: {
          type: Boolean,
          default: false,
        },
      },
    ],
    nutritionalInfo: {
      calories: Number,
      protein: Number, // in grams
      carbs: Number,   // in grams
      fat: Number,     // in grams
      fiber: Number,   // in grams
    },
    addons: [
      {
        name: {
          type: String,
          required: [true, 'Please add an addon name'],
        },
        price: {
          type: Number,
          required: [true, 'Please add a price for the addon'],
          min: [0, 'Price must be a positive number'],
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    customizations: [
      {
        name: {
          type: String,
          required: [true, 'Please add a customization name'],
        },
        isRequired: {
          type: Boolean,
          default: false,
        },
        minOptions: {
          type: Number,
          default: 0,
        },
        maxOptions: {
          type: Number,
          default: 1,
        },
        options: [
          {
            name: String,
            price: {
              type: Number,
              default: 0,
            },
            isAvailable: {
              type: Boolean,
              default: true,
            },
          },
        ],
      },
    ],
    restaurant: {
      type: mongoose.Schema.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
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

// Create text index for search
DishSchema.index({ name: 'text', description: 'text', 'ingredients.name': 'text' });

// Cascade delete dish from videos when deleted
DishSchema.pre('remove', async function (next) {
  await this.model('Video').updateMany(
    { dishes: this._id },
    { $pull: { dishes: this._id } }
  );
  next();
});

// Calculate average rating
DishSchema.virtual('averageRating', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'dish',
  justOne: false,
  options: { match: { isActive: true } },
  // Calculate average rating
  // This is a simplified example - you might want to implement a more complex aggregation
  // in a separate method or middleware
  get: function (reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    return sum / reviews.length;
  },
});

// Get number of reviews
DishSchema.virtual('reviewCount', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'dish',
  count: true,
});

module.exports = mongoose.model('Dish', DishSchema);
