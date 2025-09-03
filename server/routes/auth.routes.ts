import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import AuthController from '../controllers/auth.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', 
  (req: Request, res: Response, next: NextFunction) => 
    AuthController.register(req, res, next)
);

router.post('/login', 
  (req: Request, res: Response, next: NextFunction) => 
    AuthController.login(req, res, next)
);

// Protected routes
router.get('/me', 
  authenticate, 
  (req: Request, res: Response, next: NextFunction) => 
    AuthController.getMe(req as unknown as AuthenticatedRequest, res, next)
);

// Logout route - clears the authentication token
router.post('/logout', 
  authenticate,
  (req: Request, res: Response) => 
    AuthController.logout(req, res)
);

// Refresh token endpoint (to be implemented)
router.post('/refresh-token', 
  (req: Request, res: Response, next: NextFunction) => {
    // Implementation for refresh token will go here
    res.status(501).json({ success: false, error: 'Not implemented' });
  }
);

export default router;
