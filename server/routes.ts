
import { Router } from "express";
import { storage } from "./storage";
import { 
  users, 
  restaurants, 
  videos, 
  orders, 
  subscriptions,
  deliveryPartners,
  walletTransactions
} from "../shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { PaymentService } from "./payment-service";
import { DeliveryService } from "./delivery-service";
import { SubscriptionService } from "./subscription-service";
import { WalletService } from "./wallet-service";
import { AnalyticsService } from "./analytics-service";
import { NotificationService } from "./notification-service";
import { ContentModerationService } from "./content-moderation";
import { MLRecommendationService } from "./ml-recommendation";

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

function calculateGST(amount: number, isInterState: boolean = false) {
  const GST_RATE = 5;
  const gstAmount = (amount * GST_RATE) / 100;
  
  return {
    subtotal: amount,
    gstRate: GST_RATE,
    totalGst: gstAmount,
    total: amount + gstAmount,
    cgst: isInterState ? 0 : gstAmount / 2,
    sgst: isInterState ? 0 : gstAmount / 2,
    igst: isInterState ? gstAmount : 0,
  };
}

export { router };
