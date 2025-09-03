import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Public routes
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone number is not valid'),
    validateRequest
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
  ],
  authController.login
);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);
router.put(
  '/profile',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone number is not valid'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
    validateRequest
  ],
  authController.updateProfile
);

// Admin only routes
router.get(
  '/users',
  authController.requireRole('admin'),
  authController.getAllUsers
);

export default router;
