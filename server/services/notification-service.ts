import { WebSocketService } from '../lib/websocket/server';
import { db } from '../db';
import { notifications, userNotificationSettings, userDevices } from '../db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError } from '../middleware/error-handler';
import { EmailService } from './email-service';
import { PushNotificationService } from './push-notification-service';

export type NotificationType = 
  | 'order_created'
  | 'order_status_updated'
  | 'order_delayed'
  | 'payment_successful'
  | 'payment_failed'
  | 'delivery_assigned'
  | 'delivery_started'
  | 'delivery_completed'
  | 'new_message'
  | 'account_activity'
  | 'promotion';

export interface NotificationData {
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  [key: string]: any;
}

export interface NotificationOptions {
  userId: string;
  type: NotificationType;
  data: NotificationData;
  sendEmail?: boolean;
  sendPush?: boolean;
  sendInApp?: boolean;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
}

export class NotificationService {
  private wsService: WebSocketService;
  private emailService: EmailService;
  private pushService: PushNotificationService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.emailService = new EmailService();
    this.pushService = new PushNotificationService();
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(options: NotificationOptions) {
    const {
      userId,
      type,
      data,
      sendEmail = true,
      sendPush = true,
      sendInApp = true,
      priority = 'normal',
      metadata = {},
    } = options;

    try {
      // Get user notification preferences
      const settings = await this.getUserNotificationSettings(userId);
      
      // Create notification record
      const notificationId = await this.createNotificationRecord({
        userId,
        type,
        title: data.title,
        message: data.message,
        imageUrl: data.imageUrl,
        actionUrl: data.actionUrl,
        metadata: {
          ...metadata,
          type,
          priority,
        },
      });

      // Send in-app notification
      if (sendInApp && settings.inApp[type] !== false) {
        await this.sendInAppNotification(userId, {
          id: notificationId,
          type,
          title: data.title,
          message: data.message,
          imageUrl: data.imageUrl,
          actionUrl: data.actionUrl,
          read: false,
          createdAt: new Date().toISOString(),
          metadata: {
            ...metadata,
            type,
            priority,
          },
        });
      }

      // Send email notification
      if (sendEmail && settings.email[type] !== false) {
        try {
          await this.sendEmailNotification(userId, {
            type,
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl,
            metadata: {
              ...metadata,
              type,
              priority,
            },
          });
        } catch (error) {
          logger.error('Failed to send email notification', { error, userId, type });
        }
      }

      // Send push notification
      if (sendPush && settings.push[type] !== false) {
        try {
          await this.sendPushNotification(userId, {
            title: data.title,
            body: data.message,
            data: {
              type,
              notificationId,
              actionUrl: data.actionUrl,
              ...metadata,
            },
          });
        } catch (error) {
          logger.error('Failed to send push notification', { error, userId, type });
        }
      }

      return notificationId;
    } catch (error) {
      logger.error('Error sending notification', { error, userId, type });
      throw new InternalServerError('Failed to send notification');
    }
  }

  /**
   * Send a notification to multiple users
   */
  async broadcastNotification(
    userIds: string[],
    type: NotificationType,
    data: NotificationData,
    options: Omit<NotificationOptions, 'userId' | 'type' | 'data'> = {}
  ): Promise<string[]> {
    const notificationIds: string[] = [];
    
    for (const userId of userIds) {
      try {
        const notificationId = await this.sendNotification({
          userId,
          type,
          data,
          ...options,
        });
        notificationIds.push(notificationId);
      } catch (error) {
        logger.error(`Error sending notification to user ${userId}`, { error, type });
      }
    }
    
    return notificationIds;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const [notification] = await db.update(notifications)
        .set({ 
          read: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        )
        .returning();

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      // Notify the user that the notification was read
      this.wsService.publish(`user:${userId}`, {
        type: 'notification:read',
        data: {
          notificationId,
          readAt: notification.readAt,
        },
      });
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      throw new InternalServerError('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const [result] = await db.update(notifications)
        .set({ 
          read: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        )
        .returning({ count: sql<number>`count(*)` });

      const count = result?.count || 0;

      if (count > 0) {
        // Notify the user that notifications were marked as read
        this.wsService.publish(`user:${userId}`, {
          type: 'notifications:all_read',
          data: {
            count,
            readAt: new Date().toISOString(),
          },
        });
      }

      return count;
    } catch (error) {
      logger.error('Error marking all notifications as read', { error, userId });
      throw new InternalServerError('Failed to mark notifications as read');
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      read?: boolean;
      types?: NotificationType[];
    } = {}
  ) {
    const { limit = 20, offset = 0, read, types } = options;
    
    const where = [eq(notifications.userId, userId)];
    
    if (read !== undefined) {
      where.push(eq(notifications.read, read));
    }
    
    if (types && types.length > 0) {
      where.push(inArray(notifications.type, types));
    }
    
    const [items, [total]] = await Promise.all([
      db.query.notifications.findMany({
        where: and(...where),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...where)),
    ]);
    
    return {
      items,
      total: total?.count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get user notification settings
   */
  async getUserNotificationSettings(userId: string) {
    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(userNotificationSettings.userId, userId),
    });

    // Return default settings if not found
    if (!settings) {
      return this.getDefaultNotificationSettings();
    }

    return {
      email: settings.emailSettings as Record<NotificationType, boolean>,
      push: settings.pushSettings as Record<NotificationType, boolean>,
      inApp: settings.inAppSettings as Record<NotificationType, boolean>,
    };
  }

  /**
   * Update user notification settings
   */
  async updateNotificationSettings(
    userId: string,
    updates: {
      email?: Record<NotificationType, boolean>;
      push?: Record<NotificationType, boolean>;
      inApp?: Record<NotificationType, boolean>;
    }
  ) {
    const currentSettings = await this.getUserNotificationSettings(userId);
    
    const [settings] = await db
      .insert(userNotificationSettings)
      .values({
        userId,
        emailSettings: { ...currentSettings.email, ...updates.email },
        pushSettings: { ...currentSettings.push, ...updates.push },
        inAppSettings: { ...currentSettings.inApp, ...updates.inApp },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: {
          emailSettings: { ...currentSettings.email, ...updates.email },
          pushSettings: { ...currentSettings.push, ...updates.push },
          inAppSettings: { ...currentSettings.inApp, ...updates.inApp },
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      email: settings.emailSettings as Record<NotificationType, boolean>,
      push: settings.pushSettings as Record<NotificationType, boolean>,
      inApp: settings.inAppSettings as Record<NotificationType, boolean>,
    };
  }

  // Private methods

  private async createNotificationRecord(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    imageUrl?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }) {
    const [notification] = await db.insert(notifications).values({
      id: `notif_${uuidv4()}`,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      imageUrl: data.imageUrl,
      actionUrl: data.actionUrl,
      metadata: data.metadata || {},
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: notifications.id });

    return notification.id;
  }

  private async sendInAppNotification(userId: string, data: any) {
    this.wsService.publish(`user:${userId}`, {
      type: 'notification:new',
      data,
    });
  }

  private async sendEmailNotification(userId: string, data: {
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }) {
    // Get user email (you would typically fetch this from the users table)
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: {
        email: true,
        name: true,
      },
    });

    if (!user?.email) {
      throw new NotFoundError('User email not found');
    }

    // Send email using your email service
    await this.emailService.send({
      to: user.email,
      subject: data.title,
      template: 'notification',
      data: {
        name: user.name || 'there',
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        ...data.metadata,
      },
    });
  }

  private async sendPushNotification(
    userId: string,
    data: {
      title: string;
      body: string;
      data?: Record<string, any>;
    }
  ) {
    // Get user devices
    const devices = await db.query.userDevices.findMany({
      where: and(
        eq(userDevices.userId, userId),
        eq(userDevices.pushEnabled, true),
        // Only get devices with a push token
        sql`${userDevices.pushToken} IS NOT NULL`
      ),
    });

    if (devices.length === 0) {
      return;
    }

    // Send push notifications to all devices
    await Promise.all(
      devices.map(device =>
        this.pushService.send({
          token: device.pushToken!,
          title: data.title,
          body: data.body,
          data: data.data,
        })
      )
    );
  }

  private getDefaultNotificationSettings() {
    // Default settings for all notification types
    const defaultSettings: Record<NotificationType, boolean> = {
      order_created: true,
      order_status_updated: true,
      order_delayed: true,
      payment_successful: true,
      payment_failed: true,
      delivery_assigned: true,
      delivery_started: true,
      delivery_completed: true,
      new_message: true,
      account_activity: true,
      promotion: false, // Opt-out by default for promotional notifications
    };

    return {
      email: { ...defaultSettings },
      push: { ...defaultSettings },
      inApp: { ...defaultSettings },
    };
  }
}

// Example usage:
/*
// Initialize WebSocket server
const wss = new WebSocketServer({ port: 8080 });
const wsService = new WebSocketService(wss);

// Initialize notification service
const notificationService = new NotificationService(wsService);

// Send a notification
await notificationService.sendNotification({
  userId: 'user-123',
  type: 'order_status_updated',
  data: {
    title: 'Order Status Updated',
    message: 'Your order #12345 is out for delivery',
    actionUrl: 'https://example.com/orders/12345',
  },
  priority: 'high',
});

// Broadcast a notification to multiple users
await notificationService.broadcastNotification(
  ['user-123', 'user-456'],
  'promotion',
  {
    title: 'Special Offer!',
    message: 'Get 20% off your next order with code SAVE20',
    actionUrl: 'https://example.com/promotions/summer-sale',
  },
  {
    sendEmail: true,  // Default: true
    sendPush: true,   // Default: true
    sendInApp: true,  // Default: true
  }
);

// Mark a notification as read
await notificationService.markAsRead('notif_abc123', 'user-123');

// Mark all notifications as read
await notificationService.markAllAsRead('user-123');

// Get user notifications
const { items, total } = await notificationService.getUserNotifications(
  'user-123',
  {
    limit: 10,
    offset: 0,
    read: false,
    types: ['order_status_updated', 'payment_successful'],
  }
);

// Update notification settings
await notificationService.updateNotificationSettings('user-123', {
  email: {
    promotion: false, // Disable promotional emails
  },
  push: {
    order_status_updated: true, // Enable push notifications for order updates
  },
});
*/
