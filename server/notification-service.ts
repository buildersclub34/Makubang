
import { Expo } from 'expo-server-sdk';

interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'high';
  channelId?: string;
}

interface NotificationTarget {
  userId: string;
  pushToken?: string;
  email?: string;
  phone?: string;
}

export class NotificationService {
  private static expo = new Expo();

  // Send push notification
  static async sendPushNotification(
    targets: NotificationTarget[],
    payload: NotificationPayload
  ): Promise<void> {
    const messages = targets
      .filter(target => target.pushToken && Expo.isExpoPushToken(target.pushToken))
      .map(target => ({
        to: target.pushToken!,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound || 'default',
        badge: payload.badge,
        priority: payload.priority || 'default',
        channelId: payload.channelId || 'default',
      }));

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      
      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        
        // Handle tickets and errors
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error('Push notification error:', ticket.message);
          }
        });
      }
    } catch (error) {
      console.error('Failed to send push notifications:', error);
    }
  }

  // Order status notifications
  static async notifyOrderStatus(
    orderId: string,
    status: string,
    userId: string,
    restaurantId?: string,
    deliveryPartnerId?: string
  ): Promise<void> {
    const notifications = [];

    // Notify customer
    const customerNotification = this.getOrderStatusNotification(status, 'customer');
    if (customerNotification) {
      notifications.push(
        this.sendToUser(userId, customerNotification)
      );
    }

    // Notify restaurant
    if (restaurantId) {
      const restaurantNotification = this.getOrderStatusNotification(status, 'restaurant');
      if (restaurantNotification) {
        notifications.push(
          this.sendToRestaurant(restaurantId, restaurantNotification)
        );
      }
    }

    // Notify delivery partner
    if (deliveryPartnerId) {
      const deliveryNotification = this.getOrderStatusNotification(status, 'delivery');
      if (deliveryNotification) {
        notifications.push(
          this.sendToDeliveryPartner(deliveryPartnerId, deliveryNotification)
        );
      }
    }

    await Promise.all(notifications);
  }

  // Video engagement notifications
  static async notifyVideoEngagement(
    creatorId: string,
    videoId: string,
    engagementType: 'like' | 'comment' | 'share' | 'order',
    count?: number
  ): Promise<void> {
    const notification = this.getEngagementNotification(engagementType, count);
    
    if (notification) {
      await this.sendToUser(creatorId, {
        ...notification,
        data: { videoId, engagementType }
      });
    }
  }

  // Creator milestone notifications
  static async notifyCreatorMilestone(
    creatorId: string,
    milestone: 'followers' | 'views' | 'earnings',
    value: number
  ): Promise<void> {
    const notification = this.getMilestoneNotification(milestone, value);
    
    if (notification) {
      await this.sendToUser(creatorId, notification);
    }
  }

  // Restaurant subscription notifications
  static async notifySubscriptionStatus(
    restaurantId: string,
    status: 'expiring' | 'expired' | 'renewed',
    daysLeft?: number
  ): Promise<void> {
    const notification = this.getSubscriptionNotification(status, daysLeft);
    
    if (notification) {
      await this.sendToRestaurant(restaurantId, notification);
    }
  }

  // Delivery partner assignment notifications
  static async notifyDeliveryAssignment(
    deliveryPartnerId: string,
    orderId: string,
    restaurantName: string,
    estimatedEarnings: number
  ): Promise<void> {
    await this.sendToDeliveryPartner(deliveryPartnerId, {
      title: 'New Delivery Assignment',
      body: `Pickup from ${restaurantName}. Earn ₹${estimatedEarnings.toFixed(2)}`,
      data: { orderId, type: 'delivery_assignment' },
      priority: 'high',
      sound: 'notification_sound',
    });
  }

  // Trending content notifications
  static async notifyTrendingContent(
    userIds: string[],
    videoId: string,
    videoTitle: string,
    restaurantName: string
  ): Promise<void> {
    const targets = await this.getUserTargets(userIds);
    
    await this.sendPushNotification(targets, {
      title: 'Trending Now!',
      body: `${videoTitle} from ${restaurantName} is trending`,
      data: { videoId, type: 'trending_content' },
      channelId: 'trending',
    });
  }

  // Personalized recommendations
  static async notifyPersonalizedRecommendations(
    userId: string,
    videoIds: string[],
    reason: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Recommended for You',
      body: `New food videos ${reason}`,
      data: { videoIds, type: 'recommendations' },
      channelId: 'recommendations',
    });
  }

  // Helper methods
  private static async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    const targets = await this.getUserTargets([userId]);
    await this.sendPushNotification(targets, payload);
  }

  private static async sendToRestaurant(restaurantId: string, payload: NotificationPayload): Promise<void> {
    // Get restaurant owner/manager user IDs
    const userIds = await this.getRestaurantUserIds(restaurantId);
    const targets = await this.getUserTargets(userIds);
    await this.sendPushNotification(targets, payload);
  }

  private static async sendToDeliveryPartner(deliveryPartnerId: string, payload: NotificationPayload): Promise<void> {
    const targets = await this.getUserTargets([deliveryPartnerId]);
    await this.sendPushNotification(targets, payload);
  }

  private static async getUserTargets(userIds: string[]): Promise<NotificationTarget[]> {
    // In real implementation, fetch from database
    return userIds.map(userId => ({
      userId,
      pushToken: `ExponentPushToken[${userId}]`, // Mock token
    }));
  }

  private static async getRestaurantUserIds(restaurantId: string): Promise<string[]> {
    // In real implementation, fetch restaurant owner/manager IDs
    return [`owner_${restaurantId}`];
  }

  private static getOrderStatusNotification(status: string, userType: 'customer' | 'restaurant' | 'delivery'): NotificationPayload | null {
    const notifications: Record<string, Record<string, NotificationPayload>> = {
      confirmed: {
        customer: {
          title: 'Order Confirmed!',
          body: 'Your order has been confirmed and is being prepared',
          channelId: 'orders',
        },
        restaurant: {
          title: 'New Order',
          body: 'You have a new order to prepare',
          priority: 'high',
          channelId: 'orders',
        },
      },
      preparing: {
        customer: {
          title: 'Order Being Prepared',
          body: 'Your delicious meal is being prepared',
          channelId: 'orders',
        },
      },
      ready_for_pickup: {
        delivery: {
          title: 'Order Ready for Pickup',
          body: 'Order is ready for pickup at the restaurant',
          priority: 'high',
          channelId: 'delivery',
        },
      },
      out_for_delivery: {
        customer: {
          title: 'Order Out for Delivery',
          body: 'Your order is on its way!',
          channelId: 'orders',
        },
      },
      delivered: {
        customer: {
          title: 'Order Delivered!',
          body: 'Enjoy your meal! Please rate your experience',
          channelId: 'orders',
        },
        restaurant: {
          title: 'Order Delivered',
          body: 'Order has been successfully delivered',
          channelId: 'orders',
        },
      },
    };

    return notifications[status]?.[userType] || null;
  }

  private static getEngagementNotification(engagementType: string, count?: number): NotificationPayload | null {
    const notifications: Record<string, NotificationPayload> = {
      like: {
        title: 'New Like!',
        body: count ? `Your video received ${count} new likes` : 'Someone liked your video',
        channelId: 'engagement',
      },
      comment: {
        title: 'New Comment',
        body: 'Someone commented on your video',
        channelId: 'engagement',
      },
      share: {
        title: 'Video Shared',
        body: 'Your video was shared!',
        channelId: 'engagement',
      },
      order: {
        title: 'Order from Your Video!',
        body: 'Someone ordered food after watching your video',
        priority: 'high',
        channelId: 'earnings',
      },
    };

    return notifications[engagementType] || null;
  }

  private static getMilestoneNotification(milestone: string, value: number): NotificationPayload | null {
    const notifications: Record<string, NotificationPayload> = {
      followers: {
        title: 'Follower Milestone!',
        body: `Congratulations! You now have ${value} followers`,
        channelId: 'milestones',
      },
      views: {
        title: 'Views Milestone!',
        body: `Amazing! Your videos have ${value} total views`,
        channelId: 'milestones',
      },
      earnings: {
        title: 'Earnings Milestone!',
        body: `Great job! You've earned ₹${value} this month`,
        channelId: 'milestones',
      },
    };

    return notifications[milestone] || null;
  }

  private static getSubscriptionNotification(status: string, daysLeft?: number): NotificationPayload | null {
    const notifications: Record<string, NotificationPayload> = {
      expiring: {
        title: 'Subscription Expiring',
        body: `Your subscription expires in ${daysLeft} days`,
        priority: 'high',
        channelId: 'subscription',
      },
      expired: {
        title: 'Subscription Expired',
        body: 'Your subscription has expired. Renew to continue receiving orders',
        priority: 'high',
        channelId: 'subscription',
      },
      renewed: {
        title: 'Subscription Renewed',
        body: 'Your subscription has been successfully renewed',
        channelId: 'subscription',
      },
    };

    return notifications[status] || null;
  }

  // Batch notifications for efficiency
  static async sendBatchNotifications(
    notifications: Array<{
      targets: NotificationTarget[];
      payload: NotificationPayload;
    }>
  ): Promise<void> {
    const promises = notifications.map(({ targets, payload }) =>
      this.sendPushNotification(targets, payload)
    );
    
    await Promise.all(promises);
  }

  // Schedule notifications (for subscription reminders, etc.)
  static async scheduleNotification(
    targets: NotificationTarget[],
    payload: NotificationPayload,
    scheduledTime: Date
  ): Promise<void> {
    // In real implementation, use a job queue like Bull or Agenda
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.sendPushNotification(targets, payload);
      }, delay);
    }
  }
}
