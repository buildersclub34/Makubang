
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export interface PushNotificationData {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class PushNotificationService {
  private messaging = admin.messaging();

  async send(notification: PushNotificationData): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        token: notification.token,
        android: {
          notification: {
            channelId: 'makubang-orders',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent successfully:', response);
      return true;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return false;
    }
  }

  async sendMultiple(notifications: PushNotificationData[]): Promise<boolean[]> {
    try {
      const messages = notifications.map(notification => ({
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        token: notification.token,
        android: {
          notification: {
            channelId: 'makubang-orders',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }));

      const response = await this.messaging.sendAll(messages);
      logger.info(`Push notifications sent: ${response.successCount}/${notifications.length}`);
      
      return response.responses.map(res => res.success);
    } catch (error) {
      logger.error('Failed to send multiple push notifications:', error);
      return notifications.map(() => false);
    }
  }

  async sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
        android: {
          notification: {
            channelId: 'makubang-orders',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Topic notification sent:', response);
      return true;
    } catch (error) {
      logger.error('Topic notification error:', error);
      return false;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await this.messaging.subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${tokens.length} devices to topic: ${topic}`);
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${tokens.length} devices from topic: ${topic}`);
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
    }
  }
}
