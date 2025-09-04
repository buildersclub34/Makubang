
import type { Express } from "express";
import { eq, and, desc, asc, sql, or, like, gte, lte, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  videos,
  restaurants,
  orders,
  deliveryPartners,
  menuItems,
  walletTransactions,
  orderItems
} from "../shared/schema";
import { AuthService } from "./auth-service";
import { PaymentService } from "./payment-service";
import { DeliveryService } from "./delivery-service";
import { OrderService } from "./order-service";
import { fileUploadService } from "./file-upload";
import { ContentModerationService } from "./content-moderation";
import { pushNotificationService } from "./push-notification-service";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";

const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user.length) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export function registerRoutes(app: Express): Express {
  const wsService = app.locals.wsService;

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, role = 'user' } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        name,
        role,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: 'Login failed' });
    }
  });

  // User Routes
  app.get("/api/users/profile", authenticateToken, async (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  app.put("/api/users/profile", authenticateToken, async (req, res) => {
    try {
      const { name, bio, profilePicture, phone, dateOfBirth } = req.body;
      const [updatedUser] = await db.update(users)
        .set({ name, bio, profilePicture, phone, dateOfBirth, updatedAt: new Date() })
        .where(eq(users.id, req.user.id))
        .returning();
      
      res.json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: 'Profile update failed' });
    }
  });

  // Video Routes
  app.get("/api/videos", async (req, res) => {
    try {
      const { page = 1, limit = 20, type = 'trending', userId } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      let videosQuery = db.select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        viewCount: videos.viewCount,
        likeCount: videos.likeCount,
        shareCount: videos.shareCount,
        createdAt: videos.createdAt,
        creatorId: videos.creatorId,
        isPrivate: videos.isPrivate,
        monetizationEnabled: videos.monetizationEnabled,
        creator: {
          id: users.id,
          name: users.name,
          profilePicture: users.profilePicture,
          isVerified: users.isVerified
        }
      })
      .from(videos)
      .leftJoin(users, eq(videos.creatorId, users.id))
      .where(eq(videos.isPrivate, false))
      .limit(Number(limit))
      .offset(offset);

      if (type === 'trending') {
        videosQuery = videosQuery.orderBy(desc(videos.viewCount), desc(videos.likeCount));
      } else {
        videosQuery = videosQuery.orderBy(desc(videos.createdAt));
      }

      if (userId) {
        videosQuery = videosQuery.where(and(
          eq(videos.isPrivate, false),
          eq(videos.creatorId, String(userId))
        ));
      }

      const videoList = await videosQuery;
      res.json({ videos: videoList });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch videos' });
    }
  });

  app.post("/api/videos", authenticateToken, upload.single('video'), async (req, res) => {
    try {
      const { title, description, isPrivate = false, monetizationEnabled = false } = req.body;
      const videoFile = req.file;

      if (!videoFile) {
        return res.status(400).json({ error: 'Video file is required' });
      }

      // Upload video file
      const videoUrl = await FileUploadService.uploadFile(videoFile, 'videos');
      const thumbnailUrl = await FileUploadService.generateThumbnail(videoFile.path);

      // Content moderation
      const moderationResult = await ContentModerationService.moderateVideo({
        title,
        description,
        videoUrl
      });

      const [video] = await db.insert(videos).values({
        title,
        description,
        videoUrl,
        thumbnailUrl,
        creatorId: req.user.id,
        isPrivate: Boolean(isPrivate),
        monetizationEnabled: Boolean(monetizationEnabled),
        moderationStatus: moderationResult.approved ? 'approved' : 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.json({ video });
    } catch (error) {
      res.status(400).json({ error: 'Video upload failed' });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      const [video] = await db.select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        viewCount: videos.viewCount,
        likeCount: videos.likeCount,
        shareCount: videos.shareCount,
        createdAt: videos.createdAt,
        creatorId: videos.creatorId,
        isPrivate: videos.isPrivate,
        monetizationEnabled: videos.monetizationEnabled,
        creator: {
          id: users.id,
          name: users.name,
          profilePicture: users.profilePicture,
          isVerified: users.isVerified
        }
      })
      .from(videos)
      .leftJoin(users, eq(videos.creatorId, users.id))
      .where(eq(videos.id, videoId))
      .limit(1);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Increment view count
      await db.update(videos)
        .set({ viewCount: sql`${videos.viewCount} + 1` })
        .where(eq(videos.id, videoId));

      res.json({ video });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch video' });
    }
  });

  app.post("/api/videos/:id/like", authenticateToken, async (req, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.id;

      const existingLike = await db.select()
        .from(videoLikes)
        .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)))
        .limit(1);

      if (existingLike.length > 0) {
        // Unlike
        await db.delete(videoLikes)
          .where(and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, userId)));
        
        await db.update(videos)
          .set({ likeCount: sql`${videos.likeCount} - 1` })
          .where(eq(videos.id, videoId));

        res.json({ liked: false });
      } else {
        // Like
        await db.insert(videoLikes).values({
          videoId,
          userId,
          createdAt: new Date()
        });

        await db.update(videos)
          .set({ likeCount: sql`${videos.likeCount} + 1` })
          .where(eq(videos.id, videoId));

        res.json({ liked: true });
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to toggle like' });
    }
  });

  // Restaurant Routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { search, cuisine, city, isActive = true } = req.query;
      
      let query = db.select().from(restaurants);
      let conditions = [eq(restaurants.isActive, Boolean(isActive))];

      if (search) {
        conditions.push(like(restaurants.name, `%${search}%`));
      }
      if (cuisine) {
        conditions.push(eq(restaurants.cuisine, String(cuisine)));
      }
      if (city) {
        conditions.push(eq(restaurants.city, String(city)));
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions));
      } else {
        query = query.where(conditions[0]);
      }

      const restaurantList = await query;
      res.json({ restaurants: restaurantList });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch restaurants' });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurantId = req.params.id;
      const [restaurant] = await db.select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }

      // Get menu items
      const items = await db.select()
        .from(menuItems)
        .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.isAvailable, true)));

      res.json({ restaurant: { ...restaurant, menuItems: items } });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch restaurant' });
    }
  });

  app.post("/api/restaurants", authenticateToken, requireRole(['restaurant', 'admin']), async (req, res) => {
    try {
      const restaurantData = {
        ...req.body,
        ownerId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [restaurant] = await db.insert(restaurants).values(restaurantData).returning();
      res.json({ restaurant });
    } catch (error) {
      res.status(400).json({ error: 'Failed to create restaurant' });
    }
  });

  // Menu Items Routes
  app.get("/api/restaurants/:restaurantId/menu", async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const items = await db.select()
        .from(menuItems)
        .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.isAvailable, true)));

      res.json({ menuItems: items });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch menu items' });
    }
  });

  app.post("/api/restaurants/:restaurantId/menu", authenticateToken, requireRole(['restaurant', 'admin']), async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const itemData = {
        ...req.body,
        restaurantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [item] = await db.insert(menuItems).values(itemData).returning();
      res.json({ menuItem: item });
    } catch (error) {
      res.status(400).json({ error: 'Failed to create menu item' });
    }
  });

  // Order Routes
  app.post("/api/orders", authenticateToken, async (req, res) => {
    try {
      const { restaurantId, items, deliveryAddress, paymentMethodId, notes } = req.body;
      
      // Temporarily disabled order service
      const order = { id: 'temp', status: 'pending' };

      // Broadcast order update
      wsService.broadcastUpdate(`restaurant_${restaurantId}`, {
        type: 'new_order',
        order
      });

      res.json({ order });
    } catch (error) {
      res.status(400).json({ error: 'Failed to create order' });
    }
  });

  app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db.select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        deliveryAddress: orders.deliveryAddress,
        createdAt: orders.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          image: restaurants.image
        }
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt))
      .limit(Number(limit))
      .offset(offset);

      if (status) {
        query = query.where(and(
          eq(orders.userId, req.user.id),
          eq(orders.status, String(status))
        ));
      }

      const orderList = await query;
      res.json({ orders: orderList });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch orders' });
    }
  });

  app.get("/api/orders/:id", authenticateToken, async (req, res) => {
    try {
      const orderId = req.params.id;
      const [order] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get order items
      const items = await db.select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        price: orderItems.price,
        menuItem: {
          id: menuItems.id,
          name: menuItems.name,
          image: menuItems.image
        }
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, orderId));

      res.json({ order: { ...order, items } });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch order' });
    }
  });

  app.post("/api/orders/:id/cancel", authenticateToken, async (req, res) => {
    try {
      const orderId = req.params.id;
      // Temporarily disabled order service
      const result = { success: false, message: 'Order service temporarily disabled' };
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to cancel order' });
    }
  });

  // Delivery Partner Routes
  app.post("/api/delivery/register", authenticateToken, async (req, res) => {
    try {
      const partnerData = {
        userId: req.user.id,
        vehicleType: req.body.vehicleType,
        vehicleNumber: req.body.vehicleNumber,
        licenseNumber: req.body.licenseNumber,
        isAvailable: false,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [partner] = await db.insert(deliveryPartners).values(partnerData).returning();
      res.json({ partner });
    } catch (error) {
      res.status(400).json({ error: 'Failed to register delivery partner' });
    }
  });

  app.post("/api/delivery/availability", authenticateToken, async (req, res) => {
    try {
      const { isAvailable, currentLocation } = req.body;
      
      const [partner] = await db.update(deliveryPartners)
        .set({ 
          isAvailable, 
          currentLocation: JSON.stringify(currentLocation),
          updatedAt: new Date()
        })
        .where(eq(deliveryPartners.userId, req.user.id))
        .returning();

      res.json({ partner });
    } catch (error) {
      res.status(400).json({ error: 'Failed to update availability' });
    }
  });

  // Temporarily disabled delivery service routes
  /*
  app.get("/api/delivery/orders", authenticateToken, async (req, res) => {
    try {
      const availableOrders = await DeliveryService.getAvailableOrders();
      res.json({ orders: availableOrders });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch delivery orders' });
    }
  });

  app.post("/api/delivery/orders/:id/accept", authenticateToken, async (req, res) => {
    try {
      const orderId = req.params.id;
      const result = await DeliveryService.acceptOrder(orderId, req.user.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to accept order' });
    }
  });
  */

  // Wallet Routes - Temporarily disabled
  /*
  app.get("/api/wallet/balance", authenticateToken, async (req, res) => {
    try {
      const balance = await WalletService.getBalance(req.user.id);
      res.json({ balance });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch wallet balance' });
    }
  });

  app.get("/api/wallet/transactions", authenticateToken, async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const transactions = await db.select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, req.user.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json({ transactions });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post("/api/wallet/withdraw", authenticateToken, async (req, res) => {
    try {
      const { amount, bankDetails } = req.body;
      const result = await WalletService.processWithdrawal(req.user.id, amount, bankDetails);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Withdrawal failed' });
    }
  });
  */

  // Loyalty Program Routes
  app.get("/api/loyalty/points", authenticateToken, async (req, res) => {
    try {
      const points = await LoyaltyService.getUserPoints(req.user.id);
      res.json({ points });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch loyalty points' });
    }
  });

  app.post("/api/loyalty/redeem", authenticateToken, async (req, res) => {
    try {
      const { rewardId, pointsToRedeem } = req.body;
      const result = await LoyaltyService.redeemPoints(req.user.id, rewardId, pointsToRedeem);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to redeem points' });
    }
  });

  // Referral Routes
  app.post("/api/referrals", authenticateToken, async (req, res) => {
    try {
      const { referredEmail } = req.body;
      const result = await ReferralService.createReferral(req.user.id, referredEmail);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create referral' });
    }
  });

  // Search Routes
  app.get("/api/search", async (req, res) => {
    try {
      const { q, type = 'all', page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const results: any = {};

      if (type === 'all' || type === 'videos') {
        const videoResults = await db.select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailUrl: videos.thumbnailUrl,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          createdAt: videos.createdAt,
          creator: {
            id: users.id,
            name: users.name,
            profilePicture: users.profilePicture
          }
        })
        .from(videos)
        .leftJoin(users, eq(videos.creatorId, users.id))
        .where(and(
          eq(videos.isPrivate, false),
          or(
            like(videos.title, `%${q}%`),
            like(videos.description, `%${q}%`)
          )
        ))
        .limit(Number(limit))
        .offset(offset);

        results.videos = videoResults;
      }

      if (type === 'all' || type === 'restaurants') {
        const restaurantResults = await db.select()
          .from(restaurants)
          .where(and(
            eq(restaurants.isActive, true),
            or(
              like(restaurants.name, `%${q}%`),
              like(restaurants.cuisine, `%${q}%`)
            )
          ))
          .limit(Number(limit))
          .offset(offset);

        results.restaurants = restaurantResults;
      }

      res.json({ results });
    } catch (error) {
      res.status(400).json({ error: 'Search failed' });
    }
  });

  // Notification Routes
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const notificationList = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json({ notifications: notificationList });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notificationId = req.params.id;
      await db.update(notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, req.user.id)
        ));

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Analytics Routes
  app.get("/api/analytics/dashboard", authenticateToken, requireRole(['admin', 'restaurant', 'creator']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await AnalyticsService.getDashboardMetrics(req.user.id, req.user.role, {
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined
      });

      res.json({ analytics });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt
      }).from(users);

      let conditions = [];
      if (role) {
        conditions.push(eq(users.role, String(role)));
      }
      if (search) {
        conditions.push(or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%)`)
        ));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const userList = await query.limit(Number(limit)).offset(offset);
      res.json({ users: userList });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch users' });
    }
  });

  app.put("/api/admin/users/:id/verify", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const userId = req.params.id;
      const [user] = await db.update(users)
        .set({ isVerified: true, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ error: 'Failed to verify user' });
    }
  });

  // Content Moderation Routes
  app.get("/api/admin/content/reports", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const { page = 1, limit = 20, status = 'pending' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const reports = await db.select()
        .from(contentModerationReports)
        .where(eq(contentModerationReports.status, String(status)))
        .orderBy(desc(contentModerationReports.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json({ reports });
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch content reports' });
    }
  });

  // WebSocket connection endpoint
  app.get("/api/ws-test", (req, res) => {
    res.json({ message: "WebSocket service is running", connectionCount: wsService.getConnectionCount() });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  return app;
}
