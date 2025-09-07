import mongoose, { Document, Schema } from 'mongoose';
import { Notification as NotificationType, RelatedEntity } from '../../client/src/types/notification';

export interface INotification extends Document, Omit<NotificationType, 'id' | 'relatedTo'> {
  user: mongoose.Types.ObjectId;
  relatedTo?: RelatedEntity & { _id?: mongoose.Types.ObjectId };
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RelatedEntitySchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['order', 'user', 'restaurant', 'delivery', 'payment', 'system']
  },
  id: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'relatedTo.type'
  },
  name: String
}, { _id: false });

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['order', 'payment', 'delivery', 'account', 'promotion', 'system'],
      index: true
    },
    relatedTo: RelatedEntitySchema,
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ 'relatedTo.id': 1, 'relatedTo.type': 1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // Auto-delete after 90 days

// Pre-save hook to set readAt timestamp
NotificationSchema.pre<INotification>('save', function(next) {
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static methods
NotificationSchema.statics.markAsRead = async function(notificationIds: string[], userId: string) {
  return this.updateMany(
    { _id: { $in: notificationIds }, user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

// Virtual for formatted date
NotificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString();
});

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export { Notification };
