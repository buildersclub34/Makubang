import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser, UserRole, User } from '../models/user.model.js';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

// Validation schemas
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: z.string()
    .email('Please provide a valid email address')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string()
    .regex(/^\+?[0-9\s-]{10,}$/, 'Please provide a valid phone number')
    .optional()
    .or(z.literal('')),
  role: z.enum(['USER', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER', 'ADMIN'])
    .default('USER')
    .transform(role => role.toLowerCase())
});

const loginSchema = z.object({
  email: z.string()
    .email('Please provide a valid email address')
    .transform(email => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required')
});

// Interface for authenticated user (without password)
type IAuthUser = Omit<IUser, 'password' | keyof Document> & {
  _id: string;
  role: UserRole;
};

class AuthController {
  // Register a new user
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: validatedData.email });
      
      if (existingUser) {
        return res.status(409).json({ 
          success: false,
          message: 'Email already in use' 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);

      // Create new user
      const newUser = await User.create({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone || undefined,
        role: validatedData.role,
        isEmailVerified: false,
        loginAttempts: 0,
        lastLogin: null,
        status: 'active'
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      // Convert Mongoose document to plain object and remove password
      const userObject = newUser.toObject();
      const { password, ...userWithoutPassword } = userObject;

      res.status(201).json({
        success: true,
        token,
        user: userWithoutPassword
      });

    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: fromZodError(error as any).message
        });
      }
      next(error);
    }
  }

  // Login user
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      const loginAttempts = user.loginAttempts || 0;
      const lastLoginAttempt = user.lastLoginAttempt;
      
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lastAttempt = lastLoginAttempt || new Date();
        const lockoutTime = new Date(lastAttempt.getTime() + (LOGIN_WINDOW_MINUTES * 60 * 1000));
        
        if (new Date() < lockoutTime) {
          return res.status(403).json({
            success: false,
            message: 'Account locked due to too many failed login attempts',
            retryAfter: Math.ceil((lockoutTime.getTime() - new Date().getTime()) / 1000) // in seconds
          });
        } else {
          // Reset login attempts if lockout period has passed
          user.loginAttempts = 0;
          user.lastLoginAttempt = undefined;
          await user.save();
        }
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      const currentLoginAttempts = user.loginAttempts || 0;
      
      if (!isMatch) {
        // Increment failed login attempts
        user.loginAttempts = currentLoginAttempts + 1;
        user.lastLoginAttempt = new Date();
        await user.save();

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
          attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - (currentLoginAttempts + 1))
        });
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lastLogin = new Date();
      user.lastLoginAttempt = undefined;
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      // Convert Mongoose document to plain object and remove password
      const userObject = user.toObject();
      const { password: _, ...userWithoutPassword } = userObject;

      res.json({
        success: true,
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: fromZodError(error as any).message
        });
      }
      next(error);
    }
  };

  // Logout user (client-side should remove the token)
  static logout = (_req: Request, res: Response) => {
    // Clear the HTTP-only cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return res.json({ success: true, message: 'Successfully logged out' });
  };
}

export default AuthController;
