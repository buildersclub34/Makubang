
import { db } from './db';
import { videos, users, restaurants, menuItems, orders, videoInteractions } from '../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

interface UserPreferences {
  cuisineTypes: string[];
  priceRange: [number, number];
  dietaryRestrictions: string[];
  favoriteRestaurants: string[];
  viewingHistory: string[];
}

export class RecommendationService {
  static async getPersonalizedRecommendations(userId: string, limit: number = 20) {
    const userPrefs = await this.getUserPreferences(userId);
    const contentFiltering = await this.getContentBasedRecommendations(userPrefs, limit / 2);
    const collaborativeFiltering = await this.getCollaborativeRecommendations(userId, limit / 2);
    
    // Merge and deduplicate recommendations
    const combined = [...contentFiltering, ...collaborativeFiltering];
    const unique = combined.filter((video, index, self) => 
      index === self.findIndex(v => v.id === video.id)
    );

    return unique.slice(0, limit);
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get user's order history to infer preferences
    const userOrders = await db.select({
      order: orders,
      restaurant: restaurants,
    })
    .from(orders)
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);

    // Get viewing history
    const viewingHistory = await db.select({
      videoId: videoInteractions.videoId,
    })
    .from(videoInteractions)
    .where(and(
      eq(videoInteractions.userId, userId),
      eq(videoInteractions.type, 'view')
    ))
    .orderBy(desc(videoInteractions.createdAt))
    .limit(100);

    // Extract preferences from data
    const cuisineTypes = [...new Set(userOrders.map(o => o.restaurant?.cuisineType).filter(Boolean))];
    const favoriteRestaurants = [...new Set(userOrders.map(o => o.order.restaurantId))];
    
    return {
      cuisineTypes: cuisineTypes as string[],
      priceRange: [0, 1000], // Default range
      dietaryRestrictions: [], // Would be stored in user profile
      favoriteRestaurants,
      viewingHistory: viewingHistory.map(v => v.videoId),
    };
  }

  static async getContentBasedRecommendations(preferences: UserPreferences, limit: number) {
    // Find videos from preferred cuisines and restaurants
    let query = db.select({
      video: videos,
      restaurant: restaurants,
    })
    .from(videos)
    .leftJoin(restaurants, eq(videos.restaurantId, restaurants.id));

    if (preferences.cuisineTypes.length > 0) {
      query = query.where(inArray(restaurants.cuisineType, preferences.cuisineTypes));
    }

    if (preferences.favoriteRestaurants.length > 0) {
      query = query.where(inArray(videos.restaurantId, preferences.favoriteRestaurants));
    }

    const recommendations = await query
      .orderBy(desc(videos.likes), desc(videos.views))
      .limit(limit);

    return recommendations.map(r => ({
      ...r.video,
      restaurant: r.restaurant,
      score: this.calculateContentScore(r.video, preferences),
      reason: 'Based on your preferences',
    }));
  }

  static async getCollaborativeRecommendations(userId: string, limit: number) {
    // Find users with similar viewing patterns
    const similarUsers = await this.findSimilarUsers(userId);
    
    if (similarUsers.length === 0) {
      return this.getTrendingVideos(limit);
    }

    // Get videos liked by similar users that current user hasn't seen
    const recommendations = await db.select({
      video: videos,
      restaurant: restaurants,
    })
    .from(videoInteractions)
    .leftJoin(videos, eq(videoInteractions.videoId, videos.id))
    .leftJoin(restaurants, eq(videos.restaurantId, restaurants.id))
    .where(and(
      inArray(videoInteractions.userId, similarUsers),
      eq(videoInteractions.type, 'like')
    ))
    .groupBy(videos.id, restaurants.id)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

    return recommendations.map(r => ({
      ...r.video,
      restaurant: r.restaurant,
      score: 0.8,
      reason: 'Users with similar taste liked this',
    }));
  }

  static async findSimilarUsers(userId: string): Promise<string[]> {
    // Get current user's interactions
    const userInteractions = await db.select({
      videoId: videoInteractions.videoId,
      type: videoInteractions.type,
    })
    .from(videoInteractions)
    .where(eq(videoInteractions.userId, userId));

    if (userInteractions.length === 0) return [];

    // Find users who interacted with similar videos
    const similarUsers = await db.select({
      userId: videoInteractions.userId,
      count: sql<number>`count(*)`,
    })
    .from(videoInteractions)
    .where(and(
      inArray(videoInteractions.videoId, userInteractions.map(i => i.videoId)),
      sql`${videoInteractions.userId} != ${userId}`
    ))
    .groupBy(videoInteractions.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

    return similarUsers.map(u => u.userId);
  }

  static async getTrendingVideos(limit: number) {
    const trending = await db.select({
      video: videos,
      restaurant: restaurants,
    })
    .from(videos)
    .leftJoin(restaurants, eq(videos.restaurantId, restaurants.id))
    .where(sql`${videos.createdAt} > NOW() - INTERVAL '7 days'`)
    .orderBy(
      desc(sql`(${videos.likes} + ${videos.shares} * 2 + ${videos.comments} * 1.5) / EXTRACT(EPOCH FROM (NOW() - ${videos.createdAt})) * 3600`)
    )
    .limit(limit);

    return trending.map(t => ({
      ...t.video,
      restaurant: t.restaurant,
      score: 0.9,
      reason: 'Trending now',
    }));
  }

  static calculateContentScore(video: any, preferences: UserPreferences): number {
    let score = 0.5; // Base score

    // Boost score based on engagement
    const engagementRate = (video.likes + video.comments + video.shares) / Math.max(video.views, 1);
    score += engagementRate * 0.3;

    // Boost if from preferred restaurant
    if (preferences.favoriteRestaurants.includes(video.restaurantId)) {
      score += 0.2;
    }

    // Recency factor
    const daysSinceCreated = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (7 - daysSinceCreated) / 7) * 0.1;

    return Math.min(score, 1);
  }

  static async getRecommendationsForCuisine(cuisineType: string, limit: number = 20) {
    return db.select({
      video: videos,
      restaurant: restaurants,
    })
    .from(videos)
    .leftJoin(restaurants, eq(videos.restaurantId, restaurants.id))
    .where(eq(restaurants.cuisineType, cuisineType))
    .orderBy(desc(videos.likes), desc(videos.views))
    .limit(limit);
  }

  static async getRecommendationsForLocation(latitude: number, longitude: number, radius: number = 5, limit: number = 20) {
    // In production, use PostGIS for precise geospatial queries
    return db.select({
      video: videos,
      restaurant: restaurants,
    })
    .from(videos)
    .leftJoin(restaurants, eq(videos.restaurantId, restaurants.id))
    .where(
      sql`SQRT(POW(69.1 * (${restaurants.latitude} - ${latitude}), 2) + POW(69.1 * (${longitude} - ${restaurants.longitude}) * COS(${latitude} / 57.3), 2)) < ${radius}`
    )
    .orderBy(desc(videos.likes))
    .limit(limit);
  }

  static async updateUserInteraction(userId: string, videoId: string, type: 'view' | 'like' | 'share' | 'comment') {
    await db.insert(videoInteractions).values({
      userId,
      videoId,
      type,
      createdAt: new Date(),
    });

    // Update video engagement metrics
    const updateField = type === 'view' ? 'views' : 
                       type === 'like' ? 'likes' : 
                       type === 'share' ? 'shares' : 'comments';

    await db.update(videos)
      .set({ [updateField]: sql`${videos[updateField]} + 1` })
      .where(eq(videos.id, videoId));
  }
}
