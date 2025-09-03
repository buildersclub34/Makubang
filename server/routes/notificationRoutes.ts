import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { NotificationController } from '../controllers/notificationController';
import { isAuthenticated } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

export const createNotificationRoutes = (notificationController: NotificationController) => {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(isAuthenticated);

  // Get all notifications
  router.get(
    '/',
    [
      query('read').optional().isBoolean().toBoolean(),
      query('type').optional().isString().trim(),
      query('category').optional().isString().trim(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('offset').optional().isInt({ min: 0 }).toInt(),
      query('sortBy').optional().isString().trim(),
      query('sortOrder').optional().isIn(['asc', 'desc']),
    ],
    validateRequest,
    notificationController.getNotifications
  );

  // Get unread notification count
  router.get(
    '/unread-count',
    notificationController.getUnreadCount
  );

  // Get single notification by ID
  router.get(
    '/:id',
    [
      param('id').isMongoId().withMessage('Invalid notification ID'),
    ],
    validateRequest,
    notificationController.getNotificationById
  );

  // Mark notifications as read
  router.put(
    '/read',
    [
      body('notificationIds')
        .optional()
        .isArray()
        .withMessage('notificationIds must be an array'),
      body('notificationIds.*')
        .isMongoId()
        .withMessage('Invalid notification ID in notificationIds array'),
      body('all')
        .optional()
        .isBoolean()
        .withMessage('all must be a boolean'),
    ],
    validateRequest,
    notificationController.markAsRead
  );

  // Mark a single notification as read
  router.put(
    '/:id/read',
    [
      param('id').isMongoId().withMessage('Invalid notification ID'),
    ],
    validateRequest,
    (req, res, next) => {
      req.body.notificationIds = [req.params.id];
      next();
    },
    notificationController.markAsRead
  );

  // Delete notifications
  router.delete(
    '/',
    [
      body('notificationIds')
        .optional()
        .isArray()
        .withMessage('notificationIds must be an array'),
      body('notificationIds.*')
        .isMongoId()
        .withMessage('Invalid notification ID in notificationIds array'),
      body('all')
        .optional()
        .isBoolean()
        .withMessage('all must be a boolean'),
    ],
    validateRequest,
    notificationController.deleteNotifications
  );

  // Delete a single notification
  router.delete(
    '/:id',
    [
      param('id').isMongoId().withMessage('Invalid notification ID'),
    ],
    validateRequest,
    (req, res, next) => {
      req.body.notificationIds = [req.params.id];
      next();
    },
    notificationController.deleteNotifications
  );

  // Update notification preferences
  router.put(
    '/preferences',
    [
      body('preferences').isObject().withMessage('Preferences must be an object'),
      body('preferences.email').optional().isBoolean(),
      body('preferences.push').optional().isBoolean(),
      body('preferences.inApp').optional().isBoolean(),
      body('preferences.sms').optional().isBoolean(),
      body('preferences.categories').optional().isObject(),
      body('preferences.categories.order').optional().isBoolean(),
      body('preferences.categories.payment').optional().isBoolean(),
      body('preferences.categories.delivery').optional().isBoolean(),
      body('preferences.categories.account').optional().isBoolean(),
      body('preferences.categories.promotion').optional().isBoolean(),
      body('preferences.categories.system').optional().isBoolean(),
    ],
    validateRequest,
    notificationController.updatePreferences
  );

  // Admin routes (protected by role-based middleware)
  router.post(
    '/',
    [
      body('userId').isMongoId().withMessage('Invalid user ID'),
      body('type').isString().trim().notEmpty().withMessage('Type is required'),
      body('title').isString().trim().notEmpty().withMessage('Title is required'),
      body('message').isString().trim().notEmpty().withMessage('Message is required'),
      body('data').optional().isObject(),
      body('relatedTo').optional().isObject(),
      body('relatedTo.type')
        .if(body('relatedTo').exists())
        .isString()
        .isIn(['order', 'user', 'restaurant', 'delivery', 'payment', 'system'])
        .withMessage('Invalid relatedTo type'),
      body('relatedTo.id')
        .if(body('relatedTo').exists())
        .isMongoId()
        .withMessage('Invalid relatedTo ID'),
      body('relatedTo.name').optional().isString().trim(),
    ],
    validateRequest,
    notificationController.createNotification
  );

  return router;
};

export default createNotificationRoutes;
