import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NotificationPreferences } from '../../client/src/types/notification';

const SALT_WORK_FACTOR = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = '7d';

// Notification preferences with defaults
const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  push: true,
  inApp: true,
  sms: false,
  categories: {
    order: true,
    payment: true,
    delivery: true,
    account: true,
    promotion: true,
    system: true,
  },
};

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;
  avatar?: string;
  role: 'user' | 'restaurant_owner' | 'admin' | 'delivery_person';
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  notificationPreferences: NotificationPreferences;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getJwtToken(): string;
  getResetPasswordToken(): string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      enum: ['user', 'restaurant_owner', 'admin', 'delivery_person'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    notificationPreferences: {
      type: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        categories: {
          order: { type: Boolean, default: true },
          payment: { type: Boolean, default: true },
          delivery: { type: Boolean, default: true },
          account: { type: Boolean, default: true },
          promotion: { type: Boolean, default: true },
          system: { type: Boolean, default: true },
        },
      },
      default: defaultNotificationPreferences,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.verificationToken;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        return ret;
      },
    },
  }
);

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get JWT token
UserSchema.methods.getJwtToken = function (): string {
  return jwt.sign(
    { id: this._id, role: this.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function (): string {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (30 minutes)
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

// Virtual for avatar URL
UserSchema.virtual('avatarUrl').get(function() {
  if (this.avatar && this.avatar.url) {
    return this.avatar.url;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`;
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ role: 1 });

const User = mongoose.model<IUser>('User', UserSchema);

export { User };
