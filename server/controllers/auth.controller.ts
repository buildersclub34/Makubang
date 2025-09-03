import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { UserWithPassword, AuthenticatedUser } from '../types/user';
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

class AuthController {
  // Register a new user
  static register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize input
      const validatedData = registerSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationError.message
        });
      }

      const { name, email, password, phone, role } = validatedData.data;

      // Check if user already exists in a transaction to prevent race conditions
      await db.transaction(async (tx) => {
        const [existingUser] = await tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          throw new Error('An account with this email already exists');
        }

        // Hash password with increased salt rounds for better security
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with required fields
        const newUser = {
          id: uuidv4(),
          email,
          name,
          role,
          isActive: true,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          phone: phone || null,
          avatar: null,
          address: {},
          preferences: {},
          referralCode: null,
          lastLoginAt: null,
          failedLoginAttempts: 0,
          password: hashedPassword
        } as const;

        // Insert user
        await tx.insert(users).values(newUser);

        // Generate JWT token
        const token = jwt.sign(
          { 
            userId: newUser.id, 
            role: newUser.role,
            isVerified: newUser.isVerified
          },
          JWT_SECRET,
          { 
            expiresIn: JWT_EXPIRE,
            algorithm: 'HS256'
          }
        );

        // Remove sensitive data from response
        const { password: _, ...userWithoutPassword } = newUser;

        // Set secure HTTP-only cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(201).json({
          success: true,
          token,
          user: userWithoutPassword,
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  };

  // Login user with rate limiting and security measures
  static login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const validatedData = loginSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationError.message
        });
      }

      const { email, password } = validatedData.data;
      const now = new Date();
      
      // Find user with transaction to prevent race conditions
      await db.transaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1) as UserWithPassword[];

        // Generic error message to prevent user enumeration
        const invalidCredentials = () => {
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password'
          });
        };

        // Check if user exists
        if (!user) {
          return invalidCredentials();
        }

        // Check if account is locked due to too many failed attempts
        if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lastAttempt = user.lastFailedLogin || new Date(0);
          const minutesSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60);
          
          if (minutesSinceLastAttempt < LOGIN_WINDOW_MINUTES) {
            return res.status(429).json({
              success: false,
              error: 'Too many failed login attempts. Please try again later.'
            });
          }
          
          // Reset failed attempts if window has passed
          await tx
            .update(users)
            .set({ failedLoginAttempts: 0 })
            .where(eq(users.id, user.id));
        }

        // Verify password with constant-time comparison
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          // Increment failed login attempts
          await tx
            .update(users)
            .set({ 
              failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
              lastFailedLogin: now
            })
            .where(eq(users.id, user.id));
          
          return invalidCredentials();
        }

        // Check if account is active
        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            error: 'This account has been deactivated. Please contact support.'
          });
        }

        // Reset failed login attempts on successful login
        await tx
          .update(users)
          .set({ 
            lastLoginAt: now,
            failedLoginAttempts: 0,
            lastFailedLogin: null
          })
          .where(eq(users.id, user.id));

        // Generate JWT token with additional security claims
        const token = jwt.sign(
          { 
            userId: user.id, 
            role: user.role,
            isVerified: user.isVerified,
            lastPasswordChange: user.updatedAt?.getTime()
          },
          JWT_SECRET,
          { 
            expiresIn: JWT_EXPIRE,
            algorithm: 'HS256'
          }
        );

        // Set secure HTTP-only cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Remove sensitive data from response
        const { password: _, ...userWithoutPassword } = user;

        return res.json({
          success: true,
          token,
          user: userWithoutPassword,
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  };

  // Get current user's profile
  static getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // The auth middleware has already verified the user
      const userId = req.user.id;

      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          phone: users.phone,
          avatar: users.avatar,
          isActive: users.isActive,
          isVerified: users.isVerified,
          preferences: users.preferences,
          address: users.address,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found or account is inactive' 
        });
      }

      // Add any additional data based on user role
      let additionalData = {};
      
      // Example: Add restaurant data for restaurant owners
      if (user.role === 'restaurant_owner') {
        // Add restaurant data here if needed
      }

      return res.json({
        success: true,
        data: {
          ...user,
          ...additionalData
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
