
import admin from 'firebase-admin';
import { db } from './db';
import { users, notifications } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export interface NotificationTarget {
  userId?: string;
  userIds?: string[];
  topic?: string;
  tokens?: string[];
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private messaging: admin.messaging.Messaging;

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    this.messaging = admin.messaging();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Send notification to specific users
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    try {
      // Get FCM tokens for users
      const usersData = await db
        .select({ id: users.id, fcmToken: users.fcmToken })
        .from(users)
        .where(userIds.map(id => eq(users.id, id)).reduce((acc, curr) => acc || curr));

      const tokens = usersData
        .map(user => user.fcmToken)
        .filter(token => token) as string[];

      if (tokens.length === 0) {
        console.log('No valid FCM tokens found for users');
        return;
      }

      await this.sendToTokens(tokens, payload);

      // Store notifications in database
      await this.storeNotifications(userIds, payload);
    } catch (error) {
      console.error('Error sending notifications to users:', error);
      throw new Error('Failed to send push notifications');
    }
  }

  // Send notification to specific tokens
  async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<void> {
    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        tokens: tokens,
        webpush: payload.clickAction ? {
          fcmOptions: {
            link: payload.clickAction,
          },
        } : undefined,
      };

      const response = await this.messaging.sendMulticast(message);
      
      console.log(`Successfully sent notifications: ${response.successCount}/${tokens.length}`);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
          }
        });
        
        // Remove invalid tokens from database
        await this.removeInvalidTokens(failedTokens);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw new Error('Failed to send push notifications');
    }
  }

  // Send notification to topic subscribers
  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<void> {
    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        topic: topic,
        webpush: payload.clickAction ? {
          fcmOptions: {
            link: payload.clickAction,
          },
        } : undefined,
      };

      const response = await this.messaging.send(message);
      console.log('Successfully sent topic notification:', response);
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw new Error('Failed to send topic notification');
    }
  }

  // Subscribe users to topic
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      console.log(`Successfully subscribed ${response.successCount} tokens to topic ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw new Error('Failed to subscribe to topic');
    }
  }

  // Unsubscribe users from topic
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      console.log(`Successfully unsubscribed ${response.successCount} tokens from topic ${topic}`);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      throw new Error('Failed to unsubscribe from topic');
    }
  }

  // Send order status notifications
  async sendOrderNotification(userId: string, orderId: string, status: string): Promise<void> {
    const statusMessages = {
      'confirmed': {
        title: '🎉 Order Confirmed!',
        body: 'Your order has been confirmed and is being prepared.',
      },
      'preparing': {
        title: '👨‍🍳 Preparing Your Order',
        body: 'The restaurant is preparing your delicious meal!',
      },
      'picked_up': {
        title: '🚚 Out for Delivery',
        body: 'Your order has been picked up and is on the way!',
      },
      'delivered': {
        title: '✅ Order Delivered',
        body: 'Your order has been delivered. Enjoy your meal!',
      },
      'cancelled': {
        title: '❌ Order Cancelled',
        body: 'Your order has been cancelled. You will receive a full refund.',
      },
    };

    const message = statusMessages[status as keyof typeof statusMessages];
    if (!message) return;

    await this.sendToUsers([userId], {
      ...message,
      data: {
        type: 'order_update',
        orderId: orderId,
        status: status,
      },
      clickAction: `/orders/${orderId}`,
    });
  }

  // Send promotional notifications
  async sendPromotionalNotification(
    target: NotificationTarget,
    payload: PushNotificationPayload
  ): Promise<void> {
    try {
      if (target.userId) {
        await this.sendToUsers([target.userId], payload);
      } else if (target.userIds) {
        await this.sendToUsers(target.userIds, payload);
      } else if (target.topic) {
        await this.sendToTopic(target.topic, payload);
      } else if (target.tokens) {
        await this.sendToTokens(target.tokens, payload);
      }
    } catch (error) {
      console.error('Error sending promotional notification:', error);
      throw new Error('Failed to send promotional notification');
    }
  }

  // Send new video notifications to followers
  async sendNewVideoNotification(creatorId: string, videoId: string, videoTitle: string): Promise<void> {
    try {
      // Get creator info
      const [creator] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, creatorId))
        .limit(1);

      if (!creator) return;

      // Get followers (this would need a followers table)
      // For now, send to topic subscribers
      await this.sendToTopic(`creator_${creatorId}`, {
        title: '🎬 New Video Alert!',
        body: `${creator.name} just posted: ${videoTitle}`,
        data: {
          type: 'new_video',
          creatorId: creatorId,
          videoId: videoId,
        },
        clickAction: `/videos/${videoId}`,
      });
    } catch (error) {
      console.error('Error sending new video notification:', error);
    }
  }

  // Store notifications in database for history
  private async storeNotifications(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    try {
      const notificationRecords = userIds.map(userId => ({
        id: crypto.randomUUID(),
        userId,
        title: payload.title,
        message: payload.body,
        type: payload.data?.type || 'general',
        data: payload.data,
        read: false,
        createdAt: new Date(),
      }));

      await db.insert(notifications).values(notificationRecords);
    } catch (error) {
      console.error('Error storing notifications:', error);
    }
  }

  // Remove invalid FCM tokens
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      for (const token of tokens) {
        await db
          .update(users)
          .set({ fcmToken: null })
          .where(eq(users.fcmToken, token));
      }
    } catch (error) {
      console.error('Error removing invalid tokens:', error);
    }
  }

  // Schedule notification (for future use with job queue)
  async scheduleNotification(
    target: NotificationTarget,
    payload: PushNotificationPayload,
    scheduledTime: Date
  ): Promise<void> {
    // This would integrate with a job queue like Bull or Agenda
    // For now, just log the scheduled notification
    console.log('Notification scheduled for:', scheduledTime, payload);
  }
}

// Convenience functions
export const pushNotificationService = PushNotificationService.getInstance();

export const sendOrderNotification = (userId: string, orderId: string, status: string) =>
  pushNotificationService.sendOrderNotification(userId, orderId, status);

export const sendNewVideoNotification = (creatorId: string, videoId: string, videoTitle: string) =>
  pushNotificationService.sendNewVideoNotification(creatorId, videoId, videoTitle);

export const sendPromotionalNotification = (target: NotificationTarget, payload: PushNotificationPayload) =>
  pushNotificationService.sendPromotionalNotification(target, payload);
