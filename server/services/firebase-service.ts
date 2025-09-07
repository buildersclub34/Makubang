
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export class FirebaseService {
  private app: admin.app.App;

  constructor(config: FirebaseConfig) {
    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.clientEmail,
        }),
      });
      logger.info('Firebase Admin SDK initialized');
    } catch (error) {
      logger.error('Firebase initialization error:', error);
      throw error;
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
        android: {
          notification: {
            channelId: 'makubang_notifications',
            priority: 'high' as const,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await this.app.messaging().send(message);
      logger.info('Push notification sent:', response);
      return response;
    } catch (error) {
      logger.error('Push notification error:', error);
      throw error;
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
        android: {
          notification: {
            channelId: 'makubang_notifications',
            priority: 'high' as const,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await this.app.messaging().sendEachForMulticast(message);
      logger.info(`Multicast sent to ${tokens.length} devices:`, response);
      return response;
    } catch (error) {
      logger.error('Multicast notification error:', error);
      throw error;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await this.app.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      logger.error('Topic subscription error:', error);
      throw error;
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
      };

      const response = await this.app.messaging().send(message);
      logger.info('Topic notification sent:', response);
      return response;
    } catch (error) {
      logger.error('Topic notification error:', error);
      throw error;
    }
  }
}

export default FirebaseService;
