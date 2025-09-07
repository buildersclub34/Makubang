import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types/express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Helper function to generate JWT token
const generateToken = (userId: string, role: string) => {
  return jwt.sign(
    { id: userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

// Helper function to set JWT token in HTTP-only cookie
const setTokenCookie = (res: Response, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  
  res.cookie('jwt', token, cookieOptions);
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [newUser] = await db.insert(users).values({
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      phone,
      role,
      isVerified: false,
      isActive: true,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Generate JWT token
    const token = generateToken(newUser.id, newUser.role);

    // Set JWT in HTTP-only cookie
    setTokenCookie(res, token);

    // Remove sensitive data before sending response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lastAttempt = user.lastFailedLogin?.getTime() || 0;
      const timeSinceLastAttempt = Date.now() - lastAttempt;

      if (timeSinceLastAttempt < LOCKOUT_TIME) {
        const timeLeft = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
        return res.status(429).json({
          success: false,
          error: `Account locked. Try again in ${timeLeft} minutes.`
        });
      } else {
        // Reset failed attempts after lockout period
        await db.update(users)
          .set({ 
            failedLoginAttempts: 0,
            lastFailedLogin: null 
          })
          .where(eq(users.id, user.id));
      }
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed login attempts
      await db.update(users)
        .set({ 
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
          lastFailedLogin: new Date() 
        })
        .where(eq(users.id, user.id));

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        remainingAttempts: MAX_LOGIN_ATTEMPTS - ((user.failedLoginAttempts || 0) + 1)
      });
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await db.update(users)
        .set({ 
          failedLoginAttempts: 0,
          lastFailedLogin: null,
          lastLoginAt: new Date()
        })
        .where(eq(users.id, user.id));
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Set JWT in HTTP-only cookie
    setTokenCookie(res, token);

    // Remove sensitive data before sending response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove sensitive data before sending response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user'
    });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.status(200).json({
    success: true,
    message: 'Successfully logged out'
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, avatar } = req.body;
    const userId = req.user.id;

    const [updatedUser] = await db.update(users)
      .set({
        name: name || undefined,
        phone: phone || undefined,
        avatar: avatar || undefined,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove sensitive data before sending response
    const { password, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating profile'
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: Function) => {
    const userRole = req.user?.role;
    
    if (!userRole || (Array.isArray(roles) && !roles.includes(userRole)) || 
        (typeof roles === 'string' && userRole !== roles)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Insufficient permissions'
      });
    }
    
    next();
  };
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        password: false // Exclude password field
      }
    });

    res.status(200).json({
      success: true,
      count: allUsers.length,
      data: allUsers
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  }
};
