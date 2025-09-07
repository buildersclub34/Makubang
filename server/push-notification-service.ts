import admin from 'firebase-admin';
import { db } from './db.js';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface NotificationTarget {
  userId?: string;
  deviceToken?: string;
  topic?: string;
}

export class PushNotificationService {
  private messaging = admin.messaging();

  async sendNotification(
    target: NotificationTarget,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
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

      if (target.deviceToken) {
        message.token = target.deviceToken;
      } else if (target.topic) {
        message.topic = target.topic;
      } else if (target.userId) {
        // Get user's device tokens
        const deviceTokens = await this.getUserDeviceTokens(target.userId);
        if (deviceTokens.length > 0) {
          message.tokens = deviceTokens;
        } else {
          console.log(`No device tokens found for user ${target.userId}`);
          return false;
        }
      }

      const response = await this.messaging.send(message);
      console.log('Successfully sent message:', response);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  async sendBulkNotifications(
    targets: NotificationTarget[],
    payload: NotificationPayload
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    const promises = targets.map(async (target) => {
      const success = await this.sendNotification(target, payload);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    await Promise.all(promises);
    return { successCount, failureCount };
  }

  async sendOrderNotification(orderId: string, status: string) {
    try {
      // Get order details
      const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (!order.rows[0]) return;

      const orderData = order.rows[0];
      let title = '';
      let body = '';

      switch (status) {
        case 'confirmed':
          title = 'Order Confirmed! 🎉';
          body = `Your order from ${orderData.restaurant_name} has been confirmed`;
          break;
        case 'preparing':
          title = 'Order Being Prepared 👨‍🍳';
          body = `Your order is being prepared at ${orderData.restaurant_name}`;
          break;
        case 'picked_up':
          title = 'Order Picked Up 🚀';
          body = `Your order is on the way! Estimated delivery: ${orderData.estimated_delivery}`;
          break;
        case 'delivered':
          title = 'Order Delivered! 🍕';
          body = `Your order from ${orderData.restaurant_name} has been delivered. Enjoy!`;
          break;
        case 'cancelled':
          title = 'Order Cancelled 😞';
          body = `Your order from ${orderData.restaurant_name} has been cancelled`;
          break;
      }

      await this.sendNotification(
        { userId: orderData.user_id },
        {
          title,
          body,
          data: {
            orderId: orderId,
            type: 'order_update',
            status: status,
          },
        }
      );

      // If order is ready for pickup, notify delivery partners
      if (status === 'ready_for_pickup') {
        await this.sendNotification(
          { topic: 'delivery_partners' },
          {
            title: 'New Delivery Available! 🚴‍♂️',
            body: `Pickup from ${orderData.restaurant_name}`,
            data: {
              orderId: orderId,
              type: 'new_delivery',
              restaurantName: orderData.restaurant_name,
              pickupAddress: orderData.pickup_address,
              deliveryAddress: orderData.delivery_address,
              amount: orderData.total_amount.toString(),
            },
          }
        );
      }
    } catch (error) {
      console.error('Error sending order notification:', error);
    }
  }

  async sendCreatorNotification(creatorId: string, type: string, data: any) {
    try {
      let title = '';
      let body = '';

      switch (type) {
        case 'new_follower':
          title = 'New Follower! 🎉';
          body = `${data.followerName} started following you`;
          break;
        case 'video_liked':
          title = 'Your video got a like! ❤️';
          body = `${data.likerName} liked your video "${data.videoTitle}"`;
          break;
        case 'video_comment':
          title = 'New comment on your video! 💬';
          body = `${data.commenterName} commented on "${data.videoTitle}"`;
          break;
        case 'order_from_video':
          title = 'Order from your video! 🍕';
          body = `Someone ordered ${data.itemName} after watching your video`;
          break;
      }

      await this.sendNotification(
        { userId: creatorId },
        {
          title,
          body,
          data: {
            type: type,
            ...data,
          },
        }
      );
    } catch (error) {
      console.error('Error sending creator notification:', error);
    }
  }

  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const result = await db.query(
        'SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      return result.rows.map(row => row.device_token);
    } catch (error) {
      console.error('Error getting user device tokens:', error);
      return [];
    }
  }

  async registerDeviceToken(userId: string, deviceToken: string, platform: 'ios' | 'android') {
    try {
      await db.query(
        `INSERT INTO user_devices (user_id, device_token, platform, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         ON CONFLICT (user_id, device_token)
         DO UPDATE SET is_active = true, updated_at = NOW()`,
        [userId, deviceToken, platform]
      );
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  async unregisterDeviceToken(deviceToken: string) {
    try {
      await db.query(
        'UPDATE user_devices SET is_active = false WHERE device_token = $1',
        [deviceToken]
      );
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  }

  async subscribeToTopic(deviceToken: string, topic: string) {
    try {
      await this.messaging.subscribeToTopic([deviceToken], topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string) {
    try {
      await this.messaging.unsubscribeFromTopic([deviceToken], topic);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();