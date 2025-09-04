import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../db.js';
import { ObjectId } from 'mongodb';
// Define UserRole enum if not imported
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DRIVER = 'driver'
}

// Extend the Express Request type to include our custom user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Type guard to check if user is authenticated
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  const authReq = req as AuthenticatedRequest;
  return authReq.user !== undefined && 
         authReq.user.id !== undefined &&
         authReq.user.email !== undefined &&
         authReq.user.role !== undefined;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Get user from database
    const db = getDB();
    const user = await db.collection('users').findOne<{
      _id: ObjectId;
      email: string;
      role: string;
      isActive: boolean;
    }>({
      _id: new ObjectId(decoded.userId),
      isActive: true
    }, {
      projection: {
        email: 1,
        role: 1,
        isActive: 1
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request object with proper typing
    const authReq = req as AuthenticatedRequest;
    authReq.user = {
      id: decoded.userId,
      email: user.email,
      role: user.role as UserRole
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// AuthenticatedRequest is now properly typed with the user property
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
