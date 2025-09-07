import { apiRequest } from "./queryClient";

export interface UserPreferences {
  cuisineTypes: string[];
  spiceLevel: string;
  dietaryRestrictions: string[];
  priceRange: string;
  deliveryRadius: number;
}

export interface UserInteraction {
  videoId: string;
  restaurantId: string;
  interactionType: 'view' | 'like' | 'comment' | 'share' | 'order';
  watchTime?: number;
  timestamp: string;
}

export interface RecommendationResult {
  videoId: string;
  score: number;
  reason: string;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;
  
  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Get personalized video recommendations for a user
   */
  async getRecommendations(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await apiRequest("GET", `/api/recommendations?limit=${limit}`);
      const data = await response.json();
      
      // Apply simple recommendation logic based on user interactions
      const recommendations = this.calculateRecommendations(
        data.videos || [],
        data.interactions || [],
        data.preferences
      );
      
      return recommendations;
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      // Fallback to regular video feed
      const response = await apiRequest("GET", `/api/videos?limit=${limit}`);
      return await response.json();
    }
  }

  /**
   * Record user interaction for improving recommendations
   */
  async recordInteraction(interaction: Omit<UserInteraction, 'timestamp'>): Promise<void> {
    try {
      await apiRequest("POST", "/api/user/interactions", {
        ...interaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error recording interaction:", error);
    }
  }

  /**
   * Simple recommendation algorithm based on user preferences and interactions
   */
  private calculateRecommendations(
    videos: any[],
    interactions: UserInteraction[],
    preferences?: UserPreferences
  ): any[] {
    if (!videos.length) return [];

    // Score videos based on user behavior
    const scoredVideos = videos.map(video => {
      let score = 0;
      
      // Base popularity score
      score += (video.views || 0) * 0.001;
      score += (video.likes || 0) * 0.01;
      score += (video.ordersGenerated || 0) * 0.1;
      
      // User interaction history bonus
      const userInteractions = interactions.filter(i => 
        i.restaurantId === video.restaurantId || i.videoId === video.id
      );
      
      userInteractions.forEach(interaction => {
        switch (interaction.interactionType) {
          case 'view':
            score += 0.1;
            break;
          case 'like':
            score += 0.5;
            break;
          case 'comment':
            score += 0.3;
            break;
          case 'share':
            score += 0.4;
            break;
          case 'order':
            score += 2.0; // Strong positive signal
            break;
        }
      });
      
      // Preferences matching
      if (preferences) {
        // Cuisine type matching
        if (video.tags && preferences.cuisineTypes) {
          const matchingCuisines = video.tags.filter((tag: string) =>
            preferences.cuisineTypes.some(cuisine => 
              tag.toLowerCase().includes(cuisine.toLowerCase())
            )
          );
          score += matchingCuisines.length * 0.5;
        }
        
        // Price range matching
        if (video.restaurant?.priceRange === preferences.priceRange) {
          score += 0.3;
        }
      }
      
      // Recency bonus (newer videos get slight boost)
      const videoAge = Date.now() - new Date(video.createdAt).getTime();
      const daysSinceCreated = videoAge / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        score += 0.2 * (7 - daysSinceCreated) / 7;
      }
      
      return {
        ...video,
        recommendationScore: score
      };
    });

    // Sort by score and return top results
    return scoredVideos
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20);
  }

  /**
   * Get trending videos based on recent engagement
   */
  async getTrendingVideos(timeWindow: 'hour' | 'day' | 'week' = 'day'): Promise<any[]> {
    try {
      const response = await apiRequest("GET", "/api/videos?trending=true");
      const videos = await response.json();
      
      // Simple trending algorithm based on recent engagement
      return videos
        .filter((video: any) => {
          const createdAt = new Date(video.createdAt);
          const now = new Date();
          const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          
          switch (timeWindow) {
            case 'hour':
              return diffHours <= 1;
            case 'day':
              return diffHours <= 24;
            case 'week':
              return diffHours <= 168;
            default:
              return diffHours <= 24;
          }
        })
        .sort((a: any, b: any) => {
          // Score based on engagement rate
          const aEngagement = (a.likes + a.comments + a.shares) / Math.max(a.views, 1);
          const bEngagement = (b.likes + b.comments + b.shares) / Math.max(b.views, 1);
          return bEngagement - aEngagement;
        })
        .slice(0, 10);
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      return [];
    }
  }

  /**
   * Get restaurant recommendations based on user order history
   */
  async getRestaurantRecommendations(userId: string): Promise<any[]> {
    try {
      const response = await apiRequest("GET", "/api/user/orders");
      const orders = await response.json();
      
      // Extract restaurant preferences from order history
      const restaurantFrequency = orders.reduce((acc: any, order: any) => {
        acc[order.restaurantId] = (acc[order.restaurantId] || 0) + 1;
        return acc;
      }, {});
      
      // Get all restaurants and score them
      const restaurantsResponse = await apiRequest("GET", "/api/restaurants");
      const restaurants = await restaurantsResponse.json();
      
      return restaurants
        .map((restaurant: any) => ({
          ...restaurant,
          userOrderCount: restaurantFrequency[restaurant.id] || 0,
          recommendationScore: this.calculateRestaurantScore(restaurant, restaurantFrequency)
        }))
        .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore)
        .slice(0, 10);
    } catch (error) {
      console.error("Error fetching restaurant recommendations:", error);
      return [];
    }
  }

  private calculateRestaurantScore(restaurant: any, userFrequency: any): number {
    let score = 0;
    
    // Base quality score
    score += (parseFloat(restaurant.rating) || 0) * 2;
    
    // User history bonus
    score += (userFrequency[restaurant.id] || 0) * 5;
    
    // Popularity score
    score += (restaurant.ordersThisMonth || 0) * 0.01;
    
    // Active restaurant bonus
    if (restaurant.isActive) {
      score += 1;
    }
    
    return score;
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();
