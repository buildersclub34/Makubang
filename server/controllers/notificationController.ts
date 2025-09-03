import { Request, Response, NextFunction } from 'express';
import { Notification, NotificationFilter } from '../../client/src/types/notification';
import { Notification as NotificationModel } from '../models/Notification';
import { User } from '../models/User';
import { AppError } from '../utils/errorHandler';
import { NotificationService } from '../lib/websocket/notificationService';

class NotificationController {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  // Get all notifications for the authenticated user
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user._id;
      const { 
        read, 
        type, 
        category, 
        limit = 20, 
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query as any;

      const filter: NotificationFilter = {
        userId,
        ...(read !== undefined && { read: read === 'true' }),
        ...(type && { type }),
        ...(category && { category }),
      };

      const [notifications, total] = await Promise.all([
        NotificationModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(parseInt(offset as string))
          .limit(parseInt(limit as string))
          .lean(),
        NotificationModel.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: notifications,
        meta: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + notifications.length < total
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Get a single notification by ID
  getNotificationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await NotificationModel.findOne({
        _id: req.params.id,
        user: req.user._id
      });

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  };

  // Mark notification(s) as read
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notificationIds, all } = req.body;
      const userId = req.user._id;

      let result;
      
      if (all) {
        // Mark all notifications as read
        result = await NotificationModel.updateMany(
          { user: userId, read: false },
          { $set: { read: true, readAt: new Date() } }
        );
      } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Mark specific notifications as read
        result = await NotificationModel.updateMany(
          { _id: { $in: notificationIds }, user: userId },
          { $set: { read: true, readAt: new Date() } }
        );
      } else {
        throw new AppError('No notification IDs provided', 400);
      }

      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete notification(s)
  deleteNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notificationIds, all } = req.body;
      const userId = req.user._id;

      let result;
      
      if (all) {
        // Delete all notifications
        result = await NotificationModel.deleteMany({ user: userId });
      } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Delete specific notifications
        result = await NotificationModel.deleteMany({
          _id: { $in: notificationIds },
          user: userId
        });
      } else {
        throw new AppError('No notification IDs provided', 400);
      }

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} notifications`,
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      next(error);
    }
  };

  // Get unread notification count
  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await NotificationModel.countDocuments({
        user: req.user._id,
        read: false
      });

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      next(error);
    }
  };

  // Create a new notification (for testing or admin use)
  createNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, type, title, message, data, relatedTo } = req.body;

      // In a real app, you might want to validate the notification type and structure
      const notification = new NotificationModel({
        user: userId,
        type,
        title,
        message,
        data,
        relatedTo,
        read: false
      });

      await notification.save();

      // Send real-time update via WebSocket
      this.notificationService.sendNotification(userId, notification.toObject());

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  };

  // Update notification preferences
  updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { preferences } = req.body;
      const userId = req.user._id;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { notificationPreferences: preferences } },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: user.notificationPreferences
      });
    } catch (error) {
      next(error);
    }
  };
}

export default NotificationController;
