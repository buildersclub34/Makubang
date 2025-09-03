import {
  users,
  restaurants,
  videos,
  orders,
  menuItems,
  creatorPayouts,
  userPreferences,
  userInteractions,
  follows,
  comments,
  deliveryPartners,
  deliveryTracking,
  deliveryEarnings,
  type User,
  type UpsertUser,
  type Restaurant,
  type Video,
  type Order,
  type MenuItem,
  type CreatorPayout,
  type UserPreferences,
  type UserInteraction,
  type Comment,
  type DeliveryPartner,
  type DeliveryTracking,
  type DeliveryEarnings,
  type InsertRestaurant,
  type InsertVideo,
  type InsertOrder,
  type InsertMenuItem,
  type InsertDeliveryPartner,
  type InsertDeliveryTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, count, avg } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;

  // Restaurant operations
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant>;
  getRestaurants(limit?: number): Promise<Restaurant[]>;

  // Menu operations
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;

  // Video operations
  getVideos(limit?: number, offset?: number): Promise<Video[]>;
  getVideosByCreator(creatorId: string): Promise<Video[]>;
  getVideosByRestaurant(restaurantId: string): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video>;
  getVideo(id: string): Promise<Video | undefined>;
  incrementVideoViews(id: string): Promise<void>;
  incrementVideoLikes(id: string): Promise<void>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order>;

  // Analytics operations
  getRestaurantAnalytics(restaurantId: string): Promise<any>;
  getCreatorAnalytics(creatorId: string): Promise<any>;
  getPlatformAnalytics(): Promise<any>;

  // Recommendation operations
  getUserInteractions(userId: string, limit?: number): Promise<UserInteraction[]>;
  recordUserInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): Promise<void>;
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  
  // Creator operations
  getCreatorPayouts(creatorId: string): Promise<CreatorPayout[]>;
  createCreatorPayout(payout: Omit<CreatorPayout, 'id' | 'createdAt'>): Promise<CreatorPayout>;

  // Delivery Partner operations
  getDeliveryPartners(isAvailable?: boolean): Promise<DeliveryPartner[]>;
  getDeliveryPartner(id: string): Promise<DeliveryPartner | undefined>;
  createDeliveryPartner(partner: InsertDeliveryPartner): Promise<DeliveryPartner>;
  updateDeliveryPartner(id: string, updates: Partial<InsertDeliveryPartner>): Promise<DeliveryPartner>;
  getDeliveryPartnerByUser(userId: string): Promise<DeliveryPartner | undefined>;
  
  // Delivery Tracking operations
  createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking>;
  updateDeliveryTracking(id: string, updates: Partial<InsertDeliveryTracking>): Promise<DeliveryTracking>;
  getDeliveryTracking(orderId: string): Promise<DeliveryTracking | undefined>;
  getDeliveryTrackingByPartner(partnerId: string): Promise<DeliveryTracking[]>;
  
  // Delivery Earnings operations
  createDeliveryEarning(earning: Omit<DeliveryEarnings, 'id' | 'createdAt'>): Promise<DeliveryEarnings>;
  getDeliveryPartnerEarnings(partnerId: string): Promise<DeliveryEarnings[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId, stripeSubscriptionId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Restaurant operations
  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [restaurant] = await db
      .update(restaurants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async getRestaurants(limit = 20): Promise<Restaurant[]> {
    return await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.isActive, true))
      .limit(limit)
      .orderBy(desc(restaurants.rating));
  }

  // Menu operations
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.isAvailable, true)));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  // Video operations
  async getVideos(limit = 20, offset = 0): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.status, "published"))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(videos.createdAt));
  }

  async getVideosByCreator(creatorId: string): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(and(eq(videos.creatorId, creatorId), eq(videos.status, "published")))
      .orderBy(desc(videos.createdAt));
  }

  async getVideosByRestaurant(restaurantId: string): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(and(eq(videos.restaurantId, restaurantId), eq(videos.status, "published")))
      .orderBy(desc(videos.createdAt));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async incrementVideoViews(id: string): Promise<void> {
    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1` })
      .where(eq(videos.id, id));
  }

  async incrementVideoLikes(id: string): Promise<void> {
    await db
      .update(videos)
      .set({ likes: sql`${videos.likes} + 1` })
      .where(eq(videos.id, id));
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    // Update restaurant orders count
    if (order.restaurantId) {
      await db
        .update(restaurants)
        .set({ ordersThisMonth: sql`${restaurants.ordersThisMonth} + 1` })
        .where(eq(restaurants.id, order.restaurantId));
    }

    // Update video orders generated
    if (order.videoId) {
      await db
        .update(videos)
        .set({ ordersGenerated: sql`${videos.ordersGenerated} + 1` })
        .where(eq(videos.id, order.videoId));
    }

    return newOrder;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Analytics operations
  async getRestaurantAnalytics(restaurantId: string): Promise<any> {
    const [orderStats] = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        avgOrderValue: avg(orders.total),
      })
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId));

    const [videoStats] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${videos.views}), 0)`,
        totalVideos: count(videos.id),
        totalOrdersFromVideos: sql<number>`COALESCE(SUM(${videos.ordersGenerated}), 0)`,
      })
      .from(videos)
      .where(eq(videos.restaurantId, restaurantId));

    return {
      orders: orderStats,
      videos: videoStats,
    };
  }

  async getCreatorAnalytics(creatorId: string): Promise<any> {
    const [videoStats] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${videos.views}), 0)`,
        totalLikes: sql<number>`COALESCE(SUM(${videos.likes}), 0)`,
        totalVideos: count(videos.id),
        totalOrdersGenerated: sql<number>`COALESCE(SUM(${videos.ordersGenerated}), 0)`,
      })
      .from(videos)
      .where(eq(videos.creatorId, creatorId));

    const [payoutStats] = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(${creatorPayouts.commissionAmount}), 0)`,
        pendingPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${creatorPayouts.status} = 'pending' THEN ${creatorPayouts.commissionAmount} ELSE 0 END), 0)`,
      })
      .from(creatorPayouts)
      .where(eq(creatorPayouts.creatorId, creatorId));

    return {
      videos: videoStats,
      earnings: payoutStats,
    };
  }

  async getPlatformAnalytics(): Promise<any> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [restaurantCount] = await db.select({ count: count() }).from(restaurants).where(eq(restaurants.isActive, true));
    const [videoCount] = await db.select({ count: count() }).from(videos).where(eq(videos.status, "published"));
    const [orderStats] = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders);

    return {
      users: userCount.count,
      restaurants: restaurantCount.count,
      videos: videoCount.count,
      orders: orderStats,
    };
  }

  // Recommendation operations
  async getUserInteractions(userId: string, limit = 100): Promise<UserInteraction[]> {
    return await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .limit(limit)
      .orderBy(desc(userInteractions.timestamp));
  }

  async recordUserInteraction(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(userInteractions).values(interaction);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  // Creator operations
  async getCreatorPayouts(creatorId: string): Promise<CreatorPayout[]> {
    return await db
      .select()
      .from(creatorPayouts)
      .where(eq(creatorPayouts.creatorId, creatorId))
      .orderBy(desc(creatorPayouts.createdAt));
  }

  async createCreatorPayout(payout: Omit<CreatorPayout, 'id' | 'createdAt'>): Promise<CreatorPayout> {
    const [newPayout] = await db.insert(creatorPayouts).values(payout).returning();
    return newPayout;
  }

  // Delivery Partner operations
  async getDeliveryPartners(isAvailable?: boolean): Promise<DeliveryPartner[]> {
    if (isAvailable !== undefined) {
      return await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.isAvailable, isAvailable))
        .orderBy(desc(deliveryPartners.rating));
    }
    return await db
      .select()
      .from(deliveryPartners)
      .orderBy(desc(deliveryPartners.rating));
  }

  async getDeliveryPartner(id: string): Promise<DeliveryPartner | undefined> {
    const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, id));
    return partner;
  }

  async createDeliveryPartner(partner: InsertDeliveryPartner): Promise<DeliveryPartner> {
    const [newPartner] = await db.insert(deliveryPartners).values(partner).returning();
    return newPartner;
  }

  async updateDeliveryPartner(id: string, updates: Partial<InsertDeliveryPartner>): Promise<DeliveryPartner> {
    const [partner] = await db
      .update(deliveryPartners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveryPartners.id, id))
      .returning();
    return partner;
  }

  async getDeliveryPartnerByUser(userId: string): Promise<DeliveryPartner | undefined> {
    const [partner] = await db
      .select()
      .from(deliveryPartners)
      .where(eq(deliveryPartners.userId, userId));
    return partner;
  }

  // Delivery Tracking operations
  async createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking> {
    const [newTracking] = await db.insert(deliveryTracking).values(tracking).returning();
    return newTracking;
  }

  async updateDeliveryTracking(id: string, updates: Partial<InsertDeliveryTracking>): Promise<DeliveryTracking> {
    const [tracking] = await db
      .update(deliveryTracking)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveryTracking.id, id))
      .returning();
    return tracking;
  }

  async getDeliveryTracking(orderId: string): Promise<DeliveryTracking | undefined> {
    const [tracking] = await db
      .select()
      .from(deliveryTracking)
      .where(eq(deliveryTracking.orderId, orderId));
    return tracking;
  }

  async getDeliveryTrackingByPartner(partnerId: string): Promise<DeliveryTracking[]> {
    return await db
      .select()
      .from(deliveryTracking)
      .where(eq(deliveryTracking.deliveryPartnerId, partnerId))
      .orderBy(desc(deliveryTracking.createdAt));
  }

  // Delivery Earnings operations
  async createDeliveryEarning(earning: Omit<DeliveryEarnings, 'id' | 'createdAt'>): Promise<DeliveryEarnings> {
    const [newEarning] = await db.insert(deliveryEarnings).values(earning).returning();
    return newEarning;
  }

  async getDeliveryPartnerEarnings(partnerId: string): Promise<DeliveryEarnings[]> {
    return await db
      .select()
      .from(deliveryEarnings)
      .where(eq(deliveryEarnings.deliveryPartnerId, partnerId))
      .orderBy(desc(deliveryEarnings.createdAt));
  }
}

export const storage = new DatabaseStorage();
