const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Order related
        'ORDER_CREATED',
        'ORDER_CONFIRMED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_OUT_FOR_DELIVERY',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
        'ORDER_UPDATED',
        
        // Payment related
        'PAYMENT_RECEIVED',
        'PAYMENT_FAILED',
        'REFUND_PROCESSED',
        
        // Account related
        'ACCOUNT_VERIFIED',
        'PASSWORD_CHANGED',
        'PROFILE_UPDATED',
        
        // Social
        'NEW_FOLLOWER',
        'NEW_MESSAGE',
        'COMMENT_ON_POST',
        'LIKE_ON_POST',
        'MENTION_IN_COMMENT',
        
        // System
        'SYSTEM_ANNOUNCEMENT',
        'APP_UPDATE',
        'PROMOTION',
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    data: {
      // Additional data specific to the notification type
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    relatedTo: {
      // Reference to the related entity (e.g., order, user, etc.)
      type: {
        type: String, // 'order', 'user', 'video', 'comment', etc.
        required: false,
      },
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'relatedTo.type',
      },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    actionUrl: {
      // URL to navigate to when the notification is clicked
      type: String,
      trim: true,
    },
    image: {
      // URL to an image to display with the notification
      type: String,
      trim: true,
    },
    scheduledAt: {
      // For scheduled/delayed notifications
      type: Date,
      index: true,
    },
    expiresAt: {
      // Auto-delete after this date
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ 'relatedTo.id': 1, 'relatedTo.type': 1 });
notificationSchema.index({ type: 1, read: 1 });

// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  
  return this.createdAt.toLocaleDateString();
});

// Static methods
notificationSchema.statics.markAsRead = async function (notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Pre-save hook to set default expiration
notificationSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    // Default to 30 days from creation
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Create a TTL index for auto-deleting expired notifications
try {
  notificationSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // Delete documents at the expiresAt time
  );
} catch (error) {
  console.error('Error creating TTL index for notifications:', error);
}

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
