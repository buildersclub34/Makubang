import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Extend the Express Request type to include user
// This should be in a separate types file if used in multiple places
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export type UserRole = 'user' | 'restaurant_owner' | 'delivery_partner' | 'admin';

// Interface for User document
interface IUserBase {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  isEmailVerified: boolean;
  loginAttempts: number;
  lastLogin?: Date;
  lastLoginAttempt?: Date;
  status: 'active' | 'inactive' | 'suspended';
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

export interface IUser extends IUserBase, Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  isEmailVerified: boolean;
  loginAttempts: number;
  lastLogin?: Date;
  lastLoginAttempt?: Date;
  status: 'active' | 'inactive' | 'suspended';
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false
    },
    phone: {
      type: String,
      maxlength: [20, 'Phone number cannot be longer than 20 characters'],
      trim: true
    },
    role: {
      type: String,
      enum: ['user', 'restaurant_owner', 'delivery_partner', 'admin'],
      default: 'user'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    loginAttempts: {
      type: Number,
      required: true,
      default: 0
    },
    lastLogin: {
      type: Date
    },
    lastLoginAttempt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function (this: IUser): string {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  const jwtExpire = process.env.JWT_EXPIRE || '7d';
  
  // Ensure the secret is a string
  if (typeof jwtSecret !== 'string') {
    throw new Error('JWT_SECRET must be a string');
  }
  
  const payload = { 
    id: this._id, 
    role: this.role 
  };
  
  // Use a type assertion to handle the options
  const options: any = { expiresIn: jwtExpire };
  
  return jwt.sign(payload, jwtSecret, options);
};

// Match user entered password to hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function (): string {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function (): string {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire (24 hours)
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

// Create Model
export const User = model<IUser>('User', userSchema);

// Add static methods to the model
export interface IUserModel extends Model<IUser> {
  // Add any static methods here if needed
}
