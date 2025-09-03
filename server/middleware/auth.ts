import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJwt, getTokenFromRequest } from '@/lib/jwt';
import { db } from '@/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAuth = (handler: Function, roles: string[] = []) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from request
      const token = getTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Verify JWT token
      const decoded = verifyJwt(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      // Check if user exists and is active
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      // Check role-based access
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Attach user to request object
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      // Continue to the next middleware/route handler
      return handler(req, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Role-based middleware helpers
export const requireUser = (handler: Function) => requireAuth(handler, ['user']);
export const requireRestaurant = (handler: Function) => requireAuth(handler, ['restaurant']);
export const requireAdmin = (handler: Function) => requireAuth(handler, ['admin']);

// Usage example:
/*
import { requireUser } from '@/middleware/auth';

export default requireUser(async (req, res) => {
  // Your protected route handler
  res.status(200).json({ message: 'Protected route' });
});
*/
