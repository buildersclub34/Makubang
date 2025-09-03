import { Router } from "express";
import { storage } from "./storage";
import { 
  users, 
  restaurants, 
  videos, 
  orders, 
  subscriptions,
  deliveryPartners,
  walletTransactions,
  videos as videosTable // Alias for clarity in search
} from "../shared/schema";
import { eq, desc, and, gte, sql, between } from "drizzle-orm";
import { PaymentService } from "./payment-service";
import { DeliveryService } from "./delivery-service";
import { SubscriptionService } from "./subscription-service";
import { WalletService } from "./wallet-service";
import { AnalyticsService } from "./analytics-service";
import { NotificationService } from "./notification-service";
import { ContentModerationService } from "./content-moderation";
import { MLRecommendationService } from "./ml-recommendation";
// Import DeliveryTrackingService
import { DeliveryTrackingService } from './delivery-tracking';

const router = Router();

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};

// ===== AUTHENTICATION ROUTES =====
router.get("/api/auth/me", requireAuth, async (req: any, res) => {
  try {
    const user = await storage.db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: user[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// ===== VIDEO ROUTES =====
router.get("/api/videos/feed", async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let videoQuery = storage.db.select({
      id: videos.id,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      views: videos.views,
      likes: videos.likes,
      shares: videos.shares,
      restaurantId: videos.restaurantId,
      createdAt: videos.createdAt,
    })
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);

    const feedVideos = await videoQuery;

    // Get personalized recommendations if user is logged in
    if (userId) {
      const recommendations = await MLRecommendationService.getPersonalizedFeed(userId, limit);
      // Merge recommendations with feed (simplified)
    }

    res.json({ videos: feedVideos, hasMore: feedVideos.length === limit });
  } catch (error) {
    console.error('Feed fetch error:', error);
    res.status(500).json({ error: "Failed to fetch video feed" });
  }
});

router.post("/api/videos/:videoId/interact", requireAuth, async (req: any, res) => {
  try {
    const { videoId } = req.params;
    const { action, value } = req.body; // action: 'like', 'unlike', 'view', 'share'
    const userId = req.user.id;

    switch (action) {
      case 'like':
        await storage.db.update(videos)
          .set({ likes: sql`${videos.likes} + 1` })
          .where(eq(videos.id, videoId));
        break;

      case 'unlike':
        await storage.db.update(videos)
          .set({ likes: sql`${videos.likes} - 1` })
          .where(eq(videos.id, videoId));
        break;

      case 'view':
        await storage.db.update(videos)
          .set({ views: sql`${videos.views} + 1` })
          .where(eq(videos.id, videoId));

        // Track user interaction for recommendations
        await MLRecommendationService.trackInteraction(userId, videoId, 'view', value);
        break;

      case 'share':
        await storage.db.update(videos)
          .set({ shares: sql`${videos.shares} + 1` })
          .where(eq(videos.id, videoId));
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Video interaction error:', error);
    res.status(500).json({ error: "Failed to process interaction" });
  }
});

// ===== ORDER ROUTES =====
router.post("/api/orders", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId, items, deliveryAddress, customerPhone } = req.body;
    const userId = req.user.id;

    // Check restaurant subscription limits
    const subscriptionCheck = await SubscriptionService.checkSubscriptionLimits(restaurantId);
    if (!subscriptionCheck.canTakeOrders) {
      return res.status(403).json({ error: subscriptionCheck.message });
    }

    // Calculate order totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const deliveryFee = await DeliveryService.calculateDeliveryFee(restaurantId, deliveryAddress);
    const gstCalc = calculateGST(subtotal + deliveryFee.totalFee);

    // Create order
    const newOrder = await storage.db.insert(orders).values({
      userId,
      restaurantId,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.totalFee.toString(),
      gst: gstCalc.totalGst.toString(),
      total: gstCalc.total.toString(),
      deliveryAddress,
      customerPhone,
      estimatedDelivery: new Date(Date.now() + deliveryFee.estimatedTime * 60 * 1000),
    }).returning();

    // Create payment intent
    const paymentIntent = await PaymentService.createPaymentIntent({
      amount: gstCalc.total,
      currency: 'inr',
      orderId: newOrder[0].id,
      customerId: userId,
    });

    // Increment subscription order count
    await SubscriptionService.incrementOrderCount(restaurantId);

    res.json({
      order: newOrder[0],
      paymentClientSecret: paymentIntent.clientSecret,
      deliveryEstimate: deliveryFee,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/api/orders/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    const tracking = await DeliveryService.getDeliveryTracking(orderId);
    res.json(tracking);
  } catch (error) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

// ===== RESTAURANT ROUTES =====
router.get("/api/restaurants/:restaurantId/analytics", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const { dateRange = '30d' } = req.query;

    const analytics = await AnalyticsService.getRestaurantAnalytics(restaurantId, dateRange as string);
    res.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.post("/api/restaurants/:restaurantId/subscribe", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const { planId } = req.body;

    const subscription = await SubscriptionService.createSubscription(restaurantId, planId);
    res.json(subscription);
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// ===== DELIVERY PARTNER ROUTES =====
router.get("/api/delivery/orders", requireAuth, requireRole(['delivery_partner']), async (req: any, res) => {
  try {
    const partnerId = req.user.id;

    const assignedOrders = await storage.db.select()
      .from(orders)
      .where(
        and(
          eq(orders.assignedPartnerId, partnerId),
          sql`${orders.status} IN ('assigned_to_partner', 'picked_up', 'out_for_delivery')`
        )
      )
      .orderBy(desc(orders.createdAt));

    res.json({ orders: assignedOrders });
  } catch (error) {
    console.error('Partner orders fetch error:', error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/api/delivery/orders/:orderId/update-status", requireAuth, requireRole(['delivery_partner']), async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { status, location } = req.body;

    const result = await DeliveryService.updateDeliveryStatus(orderId, status, location);
    res.json(result);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

// ===== WALLET ROUTES =====
router.get("/api/wallet/balance", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const balance = await WalletService.getBalance(userId);
    res.json(balance);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: "Failed to fetch wallet balance" });
  }
});

router.post("/api/wallet/withdraw", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { amount, method } = req.body;

    const withdrawal = await WalletService.initiateWithdrawal(userId, amount, method);
    res.json(withdrawal);
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: "Failed to process withdrawal" });
  }
});

// ===== CREATOR ROUTES =====
router.get("/api/creators", async (req, res) => {
  try {
    const { category, search, limit = 20 } = req.query;

    let query = storage.db.select()
      .from(users)
      .where(eq(users.role, 'creator'))
      .limit(parseInt(limit as string));

    if (category && category !== 'all') {
      query = query.where(sql`${users.specialties} @> ${JSON.stringify([category])}`);
    }

    if (search) {
      query = query.where(sql`${users.name} ILIKE ${'%' + search + '%'}`);
    }

    const creators = await query;
    res.json({ creators });
  } catch (error) {
    console.error('Creators fetch error:', error);
    res.status(500).json({ error: "Failed to fetch creators" });
  }
});

// ===== ADMIN ROUTES =====
router.get("/api/admin/dashboard", requireAuth, requireRole(['admin']), async (req: any, res) => {
  try {
    const dashboardData = await AnalyticsService.getAdminDashboard();
    res.json(dashboardData);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

router.post("/api/admin/moderate-content", requireAuth, requireRole(['admin']), async (req: any, res) => {
  try {
    const { contentId, contentType, action } = req.body;

    const result = await ContentModerationService.moderateContent(contentId, contentType, action);
    res.json(result);
  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({ error: "Failed to moderate content" });
  }
});

// ===== PAYMENT WEBHOOK =====
router.post("/api/webhooks/stripe", async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const result = await PaymentService.handleWebhook(signature, req.body);
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: "Webhook signature verification failed" });
  }
});

// ===== RECOMMENDATION ROUTES =====
router.get("/api/recommendations/feed", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const recommendations = await MLRecommendationService.getPersonalizedFeed(userId, parseInt(limit as string));
    res.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

router.post("/api/recommendations/feedback", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { videoId, feedback, interactionType } = req.body;

    await MLRecommendationService.trackInteraction(userId, videoId, interactionType, feedback);
    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

// ===== SOCIAL FEATURES =====
router.post("/api/users/:userId/follow", requireAuth, async (req: any, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = req.user.id;

    // Implementation for follow/unfollow logic
    res.json({ success: true, following: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

router.get("/api/trending", async (req, res) => {
  try {
    const trendingData = await AnalyticsService.getTrendingData();
    res.json(trendingData);
  } catch (error) {
    console.error('Trending fetch error:', error);
    res.status(500).json({ error: "Failed to fetch trending data" });
  }
});

// ===== NOTIFICATION ROUTES =====
router.get("/api/notifications", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/api/notifications/:notificationId/read", requireAuth, async (req: any, res) => {
  try {
    const { notificationId } = req.params;
    await NotificationService.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// ===== NEWLY ADDED ROUTES =====

// Search endpoints
router.get('/api/search', async (req, res) => {
  try {
    const { q, location, minPrice, maxPrice, cuisine, dietary, rating, distance, sort } = req.query;

    let whereConditions: any[] = [];

    if (q) {
      whereConditions.push(sql`(videos.title ILIKE '%${q}%' OR videos.description ILIKE '%${q}%' OR restaurants.name ILIKE '%${q}%')`);
    }

    if (minPrice && maxPrice) {
      whereConditions.push(between(videosTable.price, Number(minPrice), Number(maxPrice)));
    }

    if (rating) {
      whereConditions.push(eq(restaurants.rating, Number(rating)));
    }

    // Simple search implementation - in production, use Elasticsearch
    const videosResult = await storage.db.select()
      .from(videosTable)
      .leftJoin(restaurants, eq(videosTable.restaurantId, restaurants.id))
      .where(and(...whereConditions))
      .limit(20);

    res.json(videosResult);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/api/search/trending', async (req, res) => {
  try {
    const trending = [
      'biryani', 'pizza', 'burger', 'sushi', 'pasta', 
      'street food', 'desserts', 'healthy meals', 'spicy food'
    ];
    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get trending searches' });
  }
});

// Inventory management endpoints
router.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    // Mock inventory data
    const inventory = [
      {
        id: '1',
        name: 'Tomatoes',
        sku: 'VEG-001',
        category: 'vegetables',
        currentStock: 50,
        minThreshold: 10,
        maxThreshold: 100,
        unit: 'kg',
        costPrice: 80,
        supplier: 'Local Farmer',
        expiryDate: '2024-02-15',
        location: 'Cold Storage A',
        status: 'in_stock',
        lastUpdated: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Onions',
        sku: 'VEG-002',
        category: 'vegetables',
        currentStock: 5,
        minThreshold: 15,
        maxThreshold: 80,
        unit: 'kg',
        costPrice: 60,
        supplier: 'Wholesale Market',
        location: 'Storage Room B',
        status: 'low_stock',
        lastUpdated: new Date().toISOString()
      }
    ];

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

router.post('/api/inventory', requireAuth, async (req, res) => {
  try {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...req.body,
      status: req.body.currentStock <= req.body.minThreshold ? 'low_stock' : 'in_stock',
      lastUpdated: new Date().toISOString()
    };

    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
});

router.patch('/api/inventory/:id/stock', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type } = req.body;

    // Update stock logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

router.get('/api/inventory/analytics', requireAuth, async (req, res) => {
  try {
    const analytics = {
      totalItems: 150,
      lowStockItems: 12,
      totalValue: 45000,
      expiringSoon: 8
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inventory analytics' });
  }
});

// Content moderation endpoints
router.post('/api/content/moderate', requireAuth, async (req, res) => {
  try {
    const { videoUrl, title, description } = req.body;

    const result = await ContentModerationService.moderateVideo(videoUrl, title, description);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Moderation failed' });
  }
});

// Video upload endpoint
router.post('/api/upload/video', requireAuth, async (req, res) => {
  try {
    // In production, upload to cloud storage (Cloudinary, AWS S3, etc.)
    const mockUrl = `https://example.com/videos/${Date.now()}.mp4`;
    res.json({ url: mockUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delivery tracking endpoints
router.get('/api/delivery/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const tracking = await DeliveryTrackingService.getTrackingInfo(orderId);
    res.json(tracking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tracking info' });
  }
});

router.post('/api/delivery/update', requireAuth, async (req, res) => {
  try {
    await DeliveryTrackingService.updateDelivery(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery' });
  }
});

router.get('/api/delivery/analytics/:partnerId?', requireAuth, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const analytics = await DeliveryTrackingService.getDeliveryAnalytics(partnerId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get delivery analytics' });
  }
});

// Advanced analytics endpoints
router.get('/api/analytics/advanced', requireAuth, async (req, res) => {
  try {
    const analytics = await AnalyticsService.getAdvancedMetrics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get advanced analytics' });
  }
});

router.get('/api/analytics/cohort', requireAuth, async (req, res) => {
  try {
    const cohortData = await AnalyticsService.getCohortAnalysis();
    res.json(cohortData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cohort analysis' });
  }
});

router.get('/api/analytics/funnel', requireAuth, async (req, res) => {
  try {
    const funnelData = await AnalyticsService.getFunnelAnalysis();
    res.json(funnelData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get funnel analysis' });
  }
});

// Social features endpoints
router.post('/api/videos/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Toggle like logic
    const result = await SocialService.toggleLike(id, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

router.post('/api/videos/:id/comment', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    const comment = await SocialService.addComment(id, userId, content);
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.post('/api/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user?.id;

    const result = await SocialService.toggleFollow(followerId, id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

// GST calculator endpoint
router.post('/api/gst/calculate', async (req, res) => {
  try {
    const { amount, gstRate, includesGst } = req.body;

    let baseAmount, gstAmount, totalAmount;

    if (includesGst) {
      totalAmount = amount;
      baseAmount = amount / (1 + gstRate / 100);
      gstAmount = totalAmount - baseAmount;
    } else {
      baseAmount = amount;
      gstAmount = amount * (gstRate / 100);
      totalAmount = baseAmount + gstAmount;
    }

    res.json({
      baseAmount: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      gstRate
    });
  } catch (error) {
    res.status(500).json({ error: 'GST calculation failed' });
  }
});

// Mock SocialService
class SocialService {
  static async toggleLike(videoId: string, userId: string) {
    return { liked: true, likeCount: 42 };
  }

  static async addComment(videoId: string, userId: string, content: string) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      content,
      userId,
      createdAt: new Date()
    };
  }

  static async toggleFollow(followerId: string, followingId: string) {
    return { following: true, followerCount: 128 };
  }
}

// Export the router
export { router };