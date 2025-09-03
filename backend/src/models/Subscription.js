const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Please add a restaurant ID'],
    },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic',
      required: [true, 'Please select a subscription plan'],
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'expired', 'past_due'],
      default: 'active',
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: [true, 'Please add an end date for the current period'],
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Please add a payment method ID'],
    },
    subscriptionId: {
      type: String,
      required: [true, 'Please add a subscription ID from the payment processor'],
    },
    features: {
      maxVideos: {
        type: Number,
        default: 10,
      },
      maxVideoDuration: {
        type: Number, // in minutes
        default: 30,
      },
      analytics: {
        type: Boolean,
        default: false,
      },
      priorityListing: {
        type: Boolean,
        default: false,
      },
      customBranding: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate subscriptions for a restaurant
SubscriptionSchema.index({ restaurant: 1 }, { unique: true });

// Static method to get features by plan
SubscriptionSchema.statics.getPlanFeatures = function (plan) {
  const plans = {
    basic: {
      maxVideos: 10,
      maxVideoDuration: 30,
      analytics: false,
      priorityListing: false,
      customBranding: false,
    },
    premium: {
      maxVideos: 50,
      maxVideoDuration: 60,
      analytics: true,
      priorityListing: true,
      customBranding: false,
    },
    enterprise: {
      maxVideos: 500,
      maxVideoDuration: 120,
      analytics: true,
      priorityListing: true,
      customBranding: true,
    },
  };

  return plans[plan] || plans.basic;
};

// Calculate end date based on plan
SubscriptionSchema.pre('save', async function (next) {
  if (this.isNew) {
    const planFeatures = this.constructor.getPlanFeatures(this.plan);
    this.features = planFeatures;
    
    // Set period end to 30 days from now
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    this.currentPeriodEnd = periodEnd;
  }
  next();
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
