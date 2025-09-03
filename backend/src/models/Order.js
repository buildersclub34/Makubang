const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dish',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be a positive number'],
  },
  addons: [
    {
      name: String,
      price: Number,
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],
  customizations: [
    {
      name: String,
      selected: [
        {
          name: String,
          price: Number,
        },
      ],
    },
  ],
  specialInstructions: {
    type: String,
    maxlength: [500, 'Special instructions cannot be more than 500 characters'],
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total must be a positive number'],
  },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    items: [OrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal must be a positive number'],
    },
    tax: {
      type: Number,
      required: true,
      min: [0, 'Tax must be a positive number'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee must be a positive number'],
    },
    platformFee: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee must be a positive number'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total must be a positive number'],
    },
    deliveryAddress: {
      type: {
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        location: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number],
            index: '2dsphere',
          },
        },
        instructions: String,
      },
      required: true,
    },
    payment: {
      method: {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cod'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending',
      },
      transactionId: String,
      paymentGateway: String,
      paymentGatewayResponse: {},
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
        'failed',
      ],
      default: 'pending',
    },
    deliveryType: {
      type: String,
      enum: ['delivery', 'pickup'],
      required: true,
    },
    scheduledFor: {
      type: Date,
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },
    deliveryPartner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot be more than 1000 characters'],
    },
    isPreorder: {
      type: Boolean,
      default: false,
    },
    isGroupOrder: {
      type: Boolean,
      default: false,
    },
    groupOrder: {
      code: String,
      host: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      participants: [
        {
          user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
          },
          order: {
            type: mongoose.Schema.ObjectId,
            ref: 'Order',
          },
          status: {
            type: String,
            enum: ['pending', 'confirmed', 'paid', 'cancelled'],
            default: 'pending',
          },
        },
      ],
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

// Generate order number
OrderSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  
  // Generate a unique order number (e.g., ORD-YYYYMMDD-XXXXX)
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(10000 + Math.random() * 90000);
  this.orderNumber = `ORD-${dateStr}-${random}`;
  
  next();
});

// Calculate total before saving
OrderSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isNew) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.total = this.subtotal + this.tax + this.deliveryFee + this.platformFee;
  }
  next();
});

// Virtual for order status history
OrderSchema.virtual('statusHistory', {
  ref: 'OrderStatus',
  localField: '_id',
  foreignField: 'order',
  justOne: false,
});

// Static method to get order statistics
OrderSchema.statics.getOrderStats = async function (restaurantId, startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        restaurant: restaurantId,
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
        statuses: { $push: '$status' },
      },
    },
  ]);

  return stats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, statuses: [] };
};

// Instance method to cancel order
OrderSchema.methods.cancelOrder = async function (reason, cancelledBy) {
  if (['delivered', 'cancelled', 'rejected', 'failed'].includes(this.status)) {
    throw new Error(`Cannot cancel order in ${this.status} status`);
  }

  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: Date.now(),
  };

  await this.save();
  return this;
};

// Text index for search
OrderSchema.index({ 'deliveryAddress.city': 'text', 'deliveryAddress.state': 'text' });

module.exports = mongoose.model('Order', OrderSchema);
