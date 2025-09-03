
import { Video, User, Order } from '../shared/schema';

interface UserPreferences {
  cuisineTypes: string[];
  priceRange: { min: number; max: number };
  preferredMealTimes: string[];
  dietaryRestrictions: string[];
}

interface VideoEngagement {
  videoId: string;
  userId: string;
  watchTime: number;
  liked: boolean;
  shared: boolean;
  ordered: boolean;
  timestamp: Date;
}

export class RecommendationEngine {
  // Collaborative Filtering - Users who liked similar content
  static async getCollaborativeRecommendations(userId: string, limit: number = 10): Promise<string[]> {
    // Find users with similar taste patterns
    const similarUsers = await this.findSimilarUsers(userId);
    
    // Get videos liked by similar users but not seen by current user
    const recommendedVideos: string[] = [];
    
    for (const similarUser of similarUsers) {
      const likedVideos = await this.getUserLikedVideos(similarUser.id);
      const userSeenVideos = await this.getUserSeenVideos(userId);
      
      const newVideos = likedVideos.filter(videoId => !userSeenVideos.includes(videoId));
      recommendedVideos.push(...newVideos);
    }
    
    return recommendedVideos.slice(0, limit);
  }

  // Content-Based Filtering - Based on user preferences and video content
  static async getContentBasedRecommendations(userId: string, limit: number = 10): Promise<string[]> {
    const userPrefs = await this.getUserPreferences(userId);
    const orderHistory = await this.getUserOrderHistory(userId);
    
    // Extract cuisine preferences from order history
    const preferredCuisines = this.extractCuisinePreferences(orderHistory);
    
    // Find videos matching user preferences
    const matchingVideos = await this.findVideosByCriteria({
      cuisines: preferredCuisines,
      priceRange: userPrefs.priceRange,
      dietaryRestrictions: userPrefs.dietaryRestrictions
    });
    
    return matchingVideos.slice(0, limit);
  }

  // Trending Algorithm - Based on recent engagement metrics
  static async getTrendingRecommendations(limit: number = 10): Promise<string[]> {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    // Calculate trending score based on engagement
    const videoEngagements = await this.getRecentEngagements(timeWindow);
    
    const trendingScores = new Map<string, number>();
    
    videoEngagements.forEach(engagement => {
      const currentScore = trendingScores.get(engagement.videoId) || 0;
      let score = currentScore;
      
      // Weight different engagement types
      if (engagement.liked) score += 1;
      if (engagement.shared) score += 2;
      if (engagement.ordered) score += 5;
      
      // Recent engagement gets higher weight
      const hoursSinceEngagement = (Date.now() - engagement.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyMultiplier = Math.max(0.1, 1 - (hoursSinceEngagement / 24));
      
      trendingScores.set(engagement.videoId, score * recencyMultiplier);
    });
    
    // Sort by score and return top videos
    const sortedVideos = Array.from(trendingScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([videoId]) => videoId);
    
    return sortedVideos.slice(0, limit);
  }

  // Location-Based Recommendations
  static async getLocationBasedRecommendations(
    userId: string, 
    latitude: number, 
    longitude: number, 
    limit: number = 10
  ): Promise<string[]> {
    const nearbyRestaurants = await this.findNearbyRestaurants(latitude, longitude, 10); // 10km radius
    
    const videosByRestaurant = await this.getVideosByRestaurants(
      nearbyRestaurants.map(r => r.id)
    );
    
    // Sort by distance and engagement
    const scoredVideos = videosByRestaurant.map(video => ({
      videoId: video.id,
      score: this.calculateLocationScore(video, latitude, longitude)
    }));
    
    return scoredVideos
      .sort((a, b) => b.score - a.score)
      .map(v => v.videoId)
      .slice(0, limit);
  }

  // Hybrid Recommendation System
  static async getPersonalizedRecommendations(userId: string, location?: { lat: number; lng: number }): Promise<string[]> {
    const [collaborative, contentBased, trending, locationBased] = await Promise.all([
      this.getCollaborativeRecommendations(userId, 5),
      this.getContentBasedRecommendations(userId, 5),
      this.getTrendingRecommendations(5),
      location ? this.getLocationBasedRecommendations(userId, location.lat, location.lng, 5) : []
    ]);

    // Combine and deduplicate recommendations
    const combined = [
      ...collaborative.map(id => ({ id, type: 'collaborative', weight: 0.3 })),
      ...contentBased.map(id => ({ id, type: 'content', weight: 0.3 })),
      ...trending.map(id => ({ id, type: 'trending', weight: 0.2 })),
      ...locationBased.map(id => ({ id, type: 'location', weight: 0.2 }))
    ];

    // Remove duplicates and calculate final scores
    const uniqueVideos = new Map<string, number>();
    combined.forEach(({ id, weight }) => {
      uniqueVideos.set(id, (uniqueVideos.get(id) || 0) + weight);
    });

    return Array.from(uniqueVideos.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 15);
  }

  // Helper methods
  private static async findSimilarUsers(userId: string): Promise<{ id: string; similarity: number }[]> {
    // Implementation would use cosine similarity or Jaccard similarity
    // For now, return mock similar users
    return [];
  }

  private static async getUserLikedVideos(userId: string): Promise<string[]> {
    // Get videos liked by user from database
    return [];
  }

  private static async getUserSeenVideos(userId: string): Promise<string[]> {
    // Get videos already seen by user
    return [];
  }

  private static async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get user preferences from profile or infer from behavior
    return {
      cuisineTypes: ['Indian', 'Chinese'],
      priceRange: { min: 100, max: 500 },
      preferredMealTimes: ['lunch', 'dinner'],
      dietaryRestrictions: []
    };
  }

  private static async getUserOrderHistory(userId: string): Promise<any[]> {
    // Get user's order history
    return [];
  }

  private static extractCuisinePreferences(orders: any[]): string[] {
    // Extract cuisine types from order history
    return ['Indian', 'Chinese', 'Italian'];
  }

  private static async findVideosByCriteria(criteria: any): Promise<string[]> {
    // Find videos matching criteria
    return [];
  }

  private static async getRecentEngagements(since: Date): Promise<VideoEngagement[]> {
    // Get recent video engagements
    return [];
  }

  private static async findNearbyRestaurants(lat: number, lng: number, radius: number): Promise<any[]> {
    // Find restaurants within radius
    return [];
  }

  private static async getVideosByRestaurants(restaurantIds: string[]): Promise<any[]> {
    // Get videos by restaurant IDs
    return [];
  }

  private static calculateLocationScore(video: any, lat: number, lng: number): number {
    // Calculate score based on distance and popularity
    return Math.random();
  }
}
