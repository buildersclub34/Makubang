import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend the Express Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        [key: string]: any;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    [key: string]: any;
  };
}

// Middleware to authenticate user with JWT
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header or cookie
    let token = req.header('Authorization')?.replace('Bearer ', '') || 
               req.cookies?.jwt ||
               req.headers.cookie?.split('; ').find(c => c.startsWith('jwt='))?.split('=')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
      
      // Find user in database
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id)
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found. Please log in again.'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated. Please contact support.'
        });
      }

      // Attach user to request object
      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        isVerified: user.isVerified
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please log in again.'
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication'
    });
  }
};

// Middleware to check if user has required role
export const authorize = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (Array.isArray(roles) && !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource'
      });
    }
    
    if (typeof roles === 'string' && userRole !== roles) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Middleware to check if user is verified
export const requireVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'Please verify your email address to access this resource'
    });
  }

  next();
};

// Middleware to check if user is the owner of the resource
export const isOwnerOrAdmin = (model: any, paramName = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceId = req.params[paramName];
      const resource = await db.query[model].findFirst({
        where: (resource: any, { eq }: any) => eq(resource.id, resourceId)
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Allow if user is admin or the owner of the resource
      if (req.user.role === 'admin' || resource.userId === req.user.id) {
        return next();
      }

      res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource'
      });
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during ownership verification'
      });
    }
  };
};
