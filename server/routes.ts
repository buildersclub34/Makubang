import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRestaurantSchema, insertVideoSchema, insertOrderSchema, insertMenuItemSchema, insertDeliveryPartnerSchema, insertDeliveryTrackingSchema } from "@shared/schema";
import { z } from "zod";

// Initialize Stripe (optional for development)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Video routes with ML recommendations
  app.get('/api/videos', async (req, res) => {
    try {
      const userId = req.user?.id;
      const location = req.query.lat && req.query.lng ?
        { lat: parseFloat(req.query.lat as string), lng: parseFloat(req.query.lng as string) } :
        undefined;

      let videos;
      if (userId && req.query.personalized === 'true') {
        // Get personalized recommendations
        const { RecommendationEngine } = await import('./ml-recommendation');
        const recommendedVideoIds = await RecommendationEngine.getPersonalizedRecommendations(userId, location);
        videos = await storage.getVideosByIds(recommendedVideoIds);
      } else if (req.query.trending === 'true') {
        // Get trending videos
        const { RecommendationEngine } = await import('./ml-recommendation');
        const trendingVideoIds = await RecommendationEngine.getTrendingRecommendations(20);
        videos = await storage.getVideosByIds(trendingVideoIds);
      } else {
        // Get all videos
        videos = await storage.getVideos();
      }

      // Track video fetch event
      if (userId) {
        const { AnalyticsService } = await import('./analytics-service');
        await AnalyticsService.trackEvent({
          eventType: 'video_feed_viewed',
          userId,
          sessionId: req.sessionID,
          timestamp: new Date(),
          properties: {
            feedType: req.query.personalized ? 'personalized' : req.query.trending ? 'trending' : 'default',
            videoCount: videos.length,
            location
          }
        });
      }

      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post('/api/videos', isAuthenticated, async (req: any, res) => {
    try {
      // Content moderation
      const { ContentModerationService } = await import('./content-moderation');
      const moderationResult = await ContentModerationService.moderateVideo(
        req.body.videoUrl,
        req.body.title,
        req.body.description
      );

      if (!moderationResult.isApproved) {
        return res.status(400).json({
          message: "Content violates community guidelines",
          reasons: moderationResult.flaggedReasons,
          suggestedActions: moderationResult.suggestedActions
        });
      }

      const video = await storage.createVideo({
        ...req.body,
        creatorId: req.user.id,
        moderationScore: moderationResult.confidenceScore,
        status: 'published'
      });

      // Track video creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'video_uploaded',
        userId: req.user.id,
        videoId: video.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          duration: req.body.duration,
          cuisine: req.body.cuisine,
          moderationScore: moderationResult.confidenceScore
        }
      });

      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.post('/api/videos/:id/view', async (req, res) => {
    try {
      await storage.incrementVideoViews(req.params.id);

      // Record user interaction for recommendation engine
      if (req.body.userId) {
        await storage.recordUserInteraction({
          userId: req.body.userId,
          videoId: req.params.id,
          restaurantId: req.body.restaurantId,
          interactionType: 'view',
          watchTime: req.body.watchTime || 0,
        });
      }

      // Track video view event
      if (req.body.userId) {
        const { AnalyticsService } = await import('./analytics-service');
        await AnalyticsService.trackEvent({
          eventType: 'video_viewed',
          userId: req.body.userId,
          videoId: req.params.id,
          sessionId: req.sessionID,
          timestamp: new Date(),
          properties: {
            watchTime: req.body.watchTime || 0,
            restaurantId: req.body.restaurantId,
            viewType: req.body.viewType || 'normal'
          }
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error recording video view:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  app.post('/api/videos/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.incrementVideoLikes(req.params.id);

      // Record user interaction
      await storage.recordUserInteraction({
        userId,
        videoId: req.params.id,
        restaurantId: req.body.restaurantId,
        interactionType: 'like',
      });

      // Track like event
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'video_liked',
        userId,
        videoId: req.params.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          restaurantId: req.body.restaurantId
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error liking video:", error);
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  // Restaurant routes
  app.get('/api/restaurants', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const restaurants = await storage.getRestaurants(limit);
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get('/api/restaurants/:id', async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.post('/api/restaurants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurantData = insertRestaurantSchema.parse({ ...req.body, ownerId: userId });
      const restaurant = await storage.createRestaurant(restaurantData);

      // Track restaurant creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'restaurant_created',
        userId,
        restaurantId: restaurant.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          name: restaurant.name,
          cuisine: restaurant.cuisineType,
          location: restaurant.location
        }
      });

      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.get('/api/restaurants/:id/menu', async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.id);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post('/api/restaurants/:id/menu', isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse({ ...req.body, restaurantId: req.params.id });
      const menuItem = await storage.createMenuItem(menuItemData);

      // Track menu item creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'menu_item_added',
        userId: req.user.id,
        restaurantId: req.params.id,
        menuItemId: menuItem.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category
        }
      });

      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.get('/api/restaurants/:id/analytics', isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getRestaurantAnalytics(req.params.id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Order routes
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Calculate GST (5%)
      const subtotal = parseFloat(req.body.subtotal);
      const deliveryFee = parseFloat(req.body.deliveryFee || "40");
      const gst = (subtotal + deliveryFee) * 0.05;
      const total = subtotal + deliveryFee + gst;

      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
        gst: gst.toFixed(2),
        total: total.toFixed(2),
      });

      const order = await storage.createOrder(orderData);

      // Create creator payout if order came from a video
      if (order.videoId) {
        const video = await storage.getVideo(order.videoId);
        if (video && video.creatorId) {
          const commissionRate = 15; // 15%
          const commissionAmount = (parseFloat(order.total) * commissionRate) / 100;

          await storage.createCreatorPayout({
            creatorId: video.creatorId,
            orderId: order.id,
            videoId: order.videoId,
            commissionRate: commissionRate.toString(),
            orderAmount: order.total,
            commissionAmount: commissionAmount.toFixed(2),
            status: 'pending',
          });
        }
      }

      // Track order creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'order_placed',
        userId,
        orderId: order.id,
        restaurantId: order.restaurantId,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          subtotal,
          deliveryFee,
          gst,
          total
        }
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.get('/api/user/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch('/api/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);

      // Track order status update
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'order_status_updated',
        userId: req.user.id,
        orderId: req.params.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          newStatus: status
        }
      });

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Creator routes
  app.get('/api/creator/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getCreatorAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching creator analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/creator/payouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payouts = await storage.getCreatorPayouts(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching creator payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.get('/api/creator/videos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videos = await storage.getVideosByCreator(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching creator videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Admin routes
  app.get('/api/admin/analytics', isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getPlatformAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching platform analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Delivery Partner routes
  app.get('/api/delivery-partners', async (req, res) => {
    try {
      const isAvailable = req.query.available === 'true' ? true : req.query.available === 'false' ? false : undefined;
      const partners = await storage.getDeliveryPartners(isAvailable);
      res.json(partners);
    } catch (error) {
      console.error("Error fetching delivery partners:", error);
      res.status(500).json({ message: "Failed to fetch delivery partners" });
    }
  });

  app.post('/api/delivery-partners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const partnerData = insertDeliveryPartnerSchema.parse({ ...req.body, userId });
      const partner = await storage.createDeliveryPartner(partnerData);

      // Track delivery partner registration
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'delivery_partner_registered',
        userId,
        deliveryPartnerId: partner.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          name: partner.name,
          vehicleType: partner.vehicleType,
          currentLocation: partner.currentLocation
        }
      });

      res.status(201).json(partner);
    } catch (error) {
      console.error("Error creating delivery partner:", error);
      res.status(500).json({ message: "Failed to create delivery partner" });
    }
  });

  app.get('/api/delivery-partners/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const partner = await storage.getDeliveryPartnerByUser(userId);
      res.json(partner);
    } catch (error) {
      console.error("Error fetching delivery partner:", error);
      res.status(500).json({ message: "Failed to fetch delivery partner" });
    }
  });

  app.patch('/api/delivery-partners/:id/location', isAuthenticated, async (req, res) => {
    try {
      const { currentLat, currentLng } = req.body;
      const partner = await storage.updateDeliveryPartner(req.params.id, {
        currentLat: currentLat.toString(),
        currentLng: currentLng.toString(),
        updatedAt: new Date(),
      });

      // Track delivery partner location update
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'delivery_partner_location_updated',
        userId: req.user.id,
        deliveryPartnerId: req.params.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          currentLat,
          currentLng
        }
      });

      res.json(partner);
    } catch (error) {
      console.error("Error updating delivery partner location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.patch('/api/delivery-partners/:id/availability', isAuthenticated, async (req, res) => {
    try {
      const { isAvailable } = req.body;
      const partner = await storage.updateDeliveryPartner(req.params.id, {
        isAvailable,
        updatedAt: new Date(),
      });

      // Track delivery partner availability update
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'delivery_partner_availability_updated',
        userId: req.user.id,
        deliveryPartnerId: req.params.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          isAvailable
        }
      });

      res.json(partner);
    } catch (error) {
      console.error("Error updating delivery partner availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.get('/api/delivery-partners/:id/deliveries', isAuthenticated, async (req, res) => {
    try {
      const deliveries = await storage.getDeliveryTrackingByPartner(req.params.id);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching delivery partner deliveries:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  app.get('/api/delivery-partners/:id/earnings', isAuthenticated, async (req, res) => {
    try {
      const earnings = await storage.getDeliveryPartnerEarnings(req.params.id);
      res.json(earnings);
    } catch (error) {
      console.error("Error fetching delivery partner earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Delivery Tracking routes
  app.post('/api/delivery-tracking', isAuthenticated, async (req, res) => {
    try {
      const trackingData = insertDeliveryTrackingSchema.parse(req.body);
      const tracking = await storage.createDeliveryTracking(trackingData);

      // Create earnings record for the delivery partner
      if (tracking.deliveryPartnerId) {
        const baseAmount = 50; // Base delivery fee ₹50
        const distanceBonus = 0; // Calculate based on distance
        const timeBonus = 0; // Calculate based on time efficiency

        await storage.createDeliveryEarning({
          deliveryPartnerId: tracking.deliveryPartnerId,
          orderId: tracking.orderId,
          baseAmount: baseAmount.toString(),
          distanceBonus: distanceBonus.toString(),
          timeBonus: timeBonus.toString(),
          tipAmount: "0",
          totalAmount: (baseAmount + distanceBonus + timeBonus).toString(),
          status: 'pending',
        });
      }

      // Track delivery tracking creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'delivery_tracking_created',
        userId: req.user.id,
        orderId: tracking.orderId,
        deliveryTrackingId: tracking.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          deliveryPartnerId: tracking.deliveryPartnerId,
          orderStatus: tracking.status
        }
      });

      res.status(201).json(tracking);
    } catch (error) {
      console.error("Error creating delivery tracking:", error);
      res.status(500).json({ message: "Failed to create delivery tracking" });
    }
  });

  app.patch('/api/delivery-tracking/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status, currentLat, currentLng, notes } = req.body;
      const updates: any = { status };

      if (currentLat && currentLng) {
        updates.currentLat = currentLat.toString();
        updates.currentLng = currentLng.toString();
      }

      if (notes) {
        updates.notes = notes;
      }

      if (status === 'picked_up') {
        updates.pickedUpAt = new Date();
      } else if (status === 'delivered') {
        updates.deliveredAt = new Date();
      }

      const tracking = await storage.updateDeliveryTracking(req.params.id, updates);

      // Track delivery status update
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'delivery_status_updated',
        userId: req.user.id,
        orderId: tracking.orderId,
        deliveryTrackingId: tracking.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          newStatus: status,
          currentLat,
          currentLng,
          notes
        }
      });

      res.json(tracking);
    } catch (error) {
      console.error("Error updating delivery tracking:", error);
      res.status(500).json({ message: "Failed to update delivery tracking" });
    }
  });

  app.get('/api/orders/:id/tracking', async (req, res) => {
    try {
      const tracking = await storage.getDeliveryTracking(req.params.id);
      res.json(tracking);
    } catch (error) {
      console.error("Error fetching order tracking:", error);
      res.status(500).json({ message: "Failed to fetch tracking" });
    }
  });

  // Recommendation routes
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user interactions for recommendation engine
      const interactions = await storage.getUserInteractions(userId, 50);
      const preferences = await storage.getUserPreferences(userId);

      // Simple recommendation: get videos from restaurants user has interacted with
      const videos = await storage.getVideos(20, 0);

      // Track recommendation fetch
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'recommendations_viewed',
        userId,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          interactionCount: interactions.length,
          preferenceCount: preferences.length,
          videoCount: videos.length
        }
      });

      res.json({
        videos,
        interactions,
        preferences,
      });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment service not configured" });
    }
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: "inr",
      });

      // Track payment intent creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'payment_intent_created',
        userId: req.user.id,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          amount,
          currency: "inr"
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment service not configured" });
    }
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
        return;
      }

      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      });

      // Create subscription for restaurant starter plan (₹1,000/month)
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Restaurant Starter Plan',
              description: 'Track up to 20 orders per month',
            },
            unit_amount: 100000, // ₹1,000 in paise
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      // Track subscription creation
      const { AnalyticsService } = await import('./analytics-service');
      await AnalyticsService.trackEvent({
        eventType: 'subscription_created',
        userId,
        sessionId: req.sessionID,
        timestamp: new Date(),
        properties: {
          subscriptionId: subscription.id,
          customerId: customer.id,
          plan: 'Restaurant Starter Plan'
        }
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}