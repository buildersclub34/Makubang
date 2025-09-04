
import admin from 'firebase-admin';
import { db } from './db';
import { users, notifications } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

export interface OrderNotificationData {
  orderId: string;
  status: string;
  restaurantName?: string;
  deliveryTime?: string;
  trackingUrl?: string;
}

export class PushNotificationService {
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
          : null;

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          this.initialized = true;
        } else {
          console.warn('Firebase service account not configured. Push notifications disabled.');
        }
      } else {
        this.initialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.initialized = false;
    }
  }

  // Send notification to specific user
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.initialized) {
      console.warn('Firebase not initialized. Skipping push notification.');
      return false;
    }

    try {
      // Get user's FCM token
      const [user] = await db.select({ fcmToken: users.fcmToken })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.fcmToken) {
        console.log(`No FCM token found for user ${userId}`);
        return false;
      }

      // Send notification
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        token: user.fcmToken,
        android: {
          notification: {
            channelId: 'makubang_orders',
            priority: 'high' as const,
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            image: payload.imageUrl,
            actions: payload.actionUrl ? [{
              action: 'view',
              title: 'View Details',
              icon: '/icons/view-icon.png',
            }] : [],
          },
          fcmOptions: {
            link: payload.actionUrl,
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      // Store notification in database
      await this.storeNotification(userId, payload);

      console.log('Push notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send notification to multiple users
  async sendToMultipleUsers(userIds: string[], payload: NotificationPayload): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    const success = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    const failed = results.length - success;

    return { success, failed };
  }

  // Send order-related notifications
  async sendOrderNotification(userId: string, orderId: string, status: string, additionalData?: OrderNotificationData): Promise<boolean> {
    const notificationPayloads = this.getOrderNotificationPayload(status, orderId, additionalData);
    
    if (!notificationPayloads) {
      console.log(`No notification configured for order status: ${status}`);
      return false;
    }

    return this.sendToUser(userId, notificationPayloads);
  }

  // Send notification to all users with a specific role
  async sendToRole(role: string, payload: NotificationPayload): Promise<{ success: number; failed: number }> {
    try {
      const usersWithRole = await db.select({ id: users.id, fcmToken: users.fcmToken })
        .from(users)
        .where(eq(users.role, role));

      const userIds = usersWithRole
        .filter(user => user.fcmToken)
        .map(user => user.id);

      return this.sendToMultipleUsers(userIds, payload);
    } catch (error) {
      console.error('Error sending notification to role:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Send broadcast notification to all users
  async sendBroadcast(payload: NotificationPayload, excludeUserIds?: string[]): Promise<{ success: number; failed: number }> {
    try {
      let query = db.select({ id: users.id, fcmToken: users.fcmToken }).from(users);
      
      if (excludeUserIds && excludeUserIds.length > 0) {
        // Note: This would need proper SQL "NOT IN" implementation
        // For now, we'll filter after querying
      }

      const allUsers = await query;
      
      let userIds = allUsers
        .filter(user => user.fcmToken)
        .map(user => user.id);

      if (excludeUserIds && excludeUserIds.length > 0) {
        userIds = userIds.filter(id => !excludeUserIds.includes(id));
      }

      return this.sendToMultipleUsers(userIds, payload);
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Update user's FCM token
  async updateUserFCMToken(userId: string, fcmToken: string): Promise<boolean> {
    try {
      await db.update(users)
        .set({ fcmToken, updatedAt: new Date() })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error updating FCM token:', error);
      return false;
    }
  }

  // Remove user's FCM token (logout)
  async removeUserFCMToken(userId: string): Promise<boolean> {
    try {
      await db.update(users)
        .set({ fcmToken: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error removing FCM token:', error);
      return false;
    }
  }

  // Schedule notification (basic implementation)
  async scheduleNotification(userId: string, payload: NotificationPayload, scheduleTime: Date): Promise<boolean> {
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay <= 0) {
      return this.sendToUser(userId, payload);
    }

    setTimeout(() => {
      this.sendToUser(userId, payload);
    }, delay);

    return true;
  }

  // Private helper methods
  private async storeNotification(userId: string, payload: NotificationPayload) {
    try {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId,
        title: payload.title,
        message: payload.body,
        type: payload.data?.type || 'general',
        data: payload.data,
        read: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  private getOrderNotificationPayload(status: string, orderId: string, additionalData?: OrderNotificationData): NotificationPayload | null {
    const baseActionUrl = `/orders/${orderId}`;
    
    switch (status) {
      case 'confirmed':
        return {
          title: 'Order Confirmed! 🎉',
          body: `Your order from ${additionalData?.restaurantName || 'restaurant'} has been confirmed and is being prepared.`,
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: baseActionUrl,
        };

      case 'preparing':
        return {
          title: 'Order Being Prepared 👨‍🍳',
          body: `Your delicious food is being prepared with care. Estimated time: ${additionalData?.deliveryTime || '30-45 minutes'}.`,
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: baseActionUrl,
        };

      case 'ready_for_pickup':
        return {
          title: 'Order Ready for Pickup! 📦',
          body: 'Your order is ready and waiting for our delivery partner to pick it up.',
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: baseActionUrl,
        };

      case 'picked_up':
        return {
          title: 'Order Picked Up! 🚴‍♂️',
          body: 'Your order has been picked up and is on its way to you.',
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: additionalData?.trackingUrl || baseActionUrl,
        };

      case 'out_for_delivery':
        return {
          title: 'Out for Delivery! 🛵',
          body: `Your order is out for delivery and will arrive in ${additionalData?.deliveryTime || '15-20 minutes'}.`,
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: additionalData?.trackingUrl || baseActionUrl,
        };

      case 'delivered':
        return {
          title: 'Order Delivered! ✅',
          body: 'Your order has been delivered successfully. Enjoy your meal!',
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: `${baseActionUrl}/rate`,
        };

      case 'cancelled':
        return {
          title: 'Order Cancelled 😞',
          body: 'Your order has been cancelled. Any payment made will be refunded within 3-5 business days.',
          data: {
            type: 'order',
            orderId,
            status,
          },
          actionUrl: baseActionUrl,
        };

      default:
        return null;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
