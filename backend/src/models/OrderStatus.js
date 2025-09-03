const mongoose = require('mongoose');

const OrderStatusSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
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
    },
    changedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    userType: {
      type: String,
      enum: ['system', 'admin', 'restaurant', 'customer', 'delivery'],
      required: true,
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot be more than 500 characters'],
    },
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for faster queries
OrderStatusSchema.index({ order: 1, createdAt: -1 });

// Update order status when a new status is created
OrderStatusSchema.post('save', async function (doc) {
  const Order = mongoose.model('Order');
  
  // Only update if the status is different
  const order = await Order.findById(doc.order);
  if (order && order.status !== doc.status) {
    order.status = doc.status;
    
    // Update timestamps based on status
    const now = new Date();
    switch (doc.status) {
      case 'confirmed':
        order.confirmedAt = now;
        break;
      case 'preparing':
        order.preparationStartTime = now;
        break;
      case 'ready_for_pickup':
        order.readyForPickupTime = now;
        break;
      case 'out_for_delivery':
        order.outForDeliveryTime = now;
        if (doc.metadata?.deliveryPartner) {
          order.deliveryPartner = doc.metadata.deliveryPartner;
        }
        break;
      case 'delivered':
        order.deliveredAt = now;
        order.actualDeliveryTime = now;
        break;
      case 'cancelled':
        order.cancelledAt = now;
        break;
    }
    
    await order.save();
  }
});

// Prevent duplicate status updates
OrderStatusSchema.index(
  { order: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'pending' } } }
);

module.exports = mongoose.model('OrderStatus', OrderStatusSchema);
