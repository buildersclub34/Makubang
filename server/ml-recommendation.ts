
import { storage } from './storage';
import { videoInteractions, videos, users, orders } from '../shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserProfile {
  userId: string;
  preferences: {
    cuisines: string[];
    priceRange: { min: number; max: number };
    dietaryRestrictions: string[];
    spiceLevel: number;
  };
  behaviors: {
    viewTime: number;
    orderFrequency: number;
    favoriteCreators: string[];
    peakOrderTimes: string[];
  };
}

interface RecommendationFeatures {
  contentSimilarity: number;
  userBehaviorMatch: number;
  popularityScore: number;
  timeRelevance: number;
  locationRelevance: number;
}

export class MLRecommendationService {
  private static userProfiles: Map<string, UserProfile> = new Map();
  private static videoFeatures: Map<string, any> = new Map();

  static async initializeUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Get user interactions
      const interactions = await storage.db.select()
        .from(videoInteractions)
        .where(eq(videoInteractions.userId, userId))
        .orderBy(desc(videoInteractions.createdAt))
        .limit(1000);

      // Get user orders
      const userOrders = await storage.db.select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(100);

      // Analyze viewing patterns
      const cuisinePrefs = this.analyzeCuisinePreferences(interactions);
      const behaviorPatterns = this.analyzeBehaviorPatterns(interactions);
      const orderPatterns = this.analyzeOrderPatterns(userOrders);

      const profile: UserProfile = {
        userId,
        preferences: {
          cuisines: cuisinePrefs,
          priceRange: orderPatterns.priceRange,
          dietaryRestrictions: orderPatterns.dietaryRestrictions,
          spiceLevel: orderPatterns.spiceLevel,
        },
        behaviors: {
          viewTime: behaviorPatterns.avgViewTime,
          orderFrequency: orderPatterns.frequency,
          favoriteCreators: behaviorPatterns.favoriteCreators,
          peakOrderTimes: orderPatterns.peakTimes,
        },
      };

      this.userProfiles.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Error initializing user profile:', error);
      throw error;
    }
  }

  static async getPersonalizedFeed(userId: string, limit: number = 20): Promise<any[]> {
    try {
      let userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        userProfile = await this.initializeUserProfile(userId);
      }

      // Get candidate videos
      const candidateVideos = await storage.db.select()
        .from(videos)
        .where(eq(videos.status, 'published'))
        .orderBy(desc(videos.createdAt))
        .limit(limit * 3); // Get more candidates for better filtering

      // Score and rank videos
      const scoredVideos = await Promise.all(
        candidateVideos.map(async (video) => {
          const score = await this.calculateRecommendationScore(video, userProfile!);
          return { video, score };
        })
      );

      // Sort by score and return top results
      return scoredVideos
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ video }) => video);
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      throw error;
    }
  }

  static async trackInteraction(
    userId: string,
    videoId: string,
    interactionType: string,
    value?: any
  ): Promise<void> {
    try {
      await storage.db.insert(videoInteractions).values({
        userId,
        videoId,
        interactionType,
        watchTime: value?.watchTime || 0,
        value: value?.feedback || null,
        deviceType: value?.deviceType || 'web',
        location: value?.location || null,
        sessionId: value?.sessionId || `session_${Date.now()}`,
      });

      // Update user profile based on interaction
      await this.updateUserProfileFromInteraction(userId, videoId, interactionType, value);
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  private static async calculateRecommendationScore(
    video: any,
    userProfile: UserProfile
  ): Promise<number> {
    try {
      const features: RecommendationFeatures = {
        contentSimilarity: await this.calculateContentSimilarity(video, userProfile),
        userBehaviorMatch: this.calculateBehaviorMatch(video, userProfile),
        popularityScore: this.calculatePopularityScore(video),
        timeRelevance: this.calculateTimeRelevance(video),
        locationRelevance: await this.calculateLocationRelevance(video, userProfile),
      };

      // Weighted scoring
      const weights = {
        contentSimilarity: 0.3,
        userBehaviorMatch: 0.25,
        popularityScore: 0.2,
        timeRelevance: 0.15,
        locationRelevance: 0.1,
      };

      return (
        features.contentSimilarity * weights.contentSimilarity +
        features.userBehaviorMatch * weights.userBehaviorMatch +
        features.popularityScore * weights.popularityScore +
        features.timeRelevance * weights.timeRelevance +
        features.locationRelevance * weights.locationRelevance
      );
    } catch (error) {
      console.error('Error calculating recommendation score:', error);
      return 0;
    }
  }

  private static async calculateContentSimilarity(video: any, userProfile: UserProfile): Promise<number> {
    // Use OpenAI for semantic similarity
    try {
      if (!process.env.OPENAI_API_KEY) {
        return this.fallbackContentSimilarity(video, userProfile);
      }

      const userPrefsText = `User likes: ${userProfile.preferences.cuisines.join(', ')}. Dietary: ${userProfile.preferences.dietaryRestrictions.join(', ')}`;
      const videoText = `${video.title} ${video.description}`;

      const embedding1 = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: userPrefsText,
      });

      const embedding2 = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: videoText,
      });

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(
        embedding1.data[0].embedding,
        embedding2.data[0].embedding
      );

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      return this.fallbackContentSimilarity(video, userProfile);
    }
  }

  private static fallbackContentSimilarity(video: any, userProfile: UserProfile): number {
    let score = 0;
    const tags = video.tags || [];
    const cuisines = userProfile.preferences.cuisines;

    // Simple keyword matching
    for (const cuisine of cuisines) {
      if (tags.includes(cuisine) || video.title.toLowerCase().includes(cuisine.toLowerCase())) {
        score += 0.3;
      }
    }

    return Math.min(1, score);
  }

  private static calculateBehaviorMatch(video: any, userProfile: UserProfile): number {
    let score = 0;

    // Check if video creator is in user's favorites
    if (userProfile.behaviors.favoriteCreators.includes(video.creatorId)) {
      score += 0.4;
    }

    // Check video length vs user's average watch time
    const videoDuration = video.duration || 60;
    const userAvgWatchTime = userProfile.behaviors.viewTime;
    
    if (videoDuration <= userAvgWatchTime * 1.2) {
      score += 0.3;
    }

    return Math.min(1, score);
  }

  private static calculatePopularityScore(video: any): number {
    const views = video.views || 0;
    const likes = video.likes || 0;
    const orders = video.orders || 0;

    // Normalize based on video age
    const ageInDays = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const ageFactor = Math.max(0.1, 1 - (ageInDays / 30)); // Decay over 30 days

    const engagementRate = views > 0 ? (likes + orders * 5) / views : 0;
    return Math.min(1, engagementRate * ageFactor);
  }

  private static calculateTimeRelevance(video: any): number {
    const now = new Date();
    const videoDate = new Date(video.createdAt);
    const hoursSinceCreated = (now.getTime() - videoDate.getTime()) / (1000 * 60 * 60);

    // Boost recent content
    if (hoursSinceCreated < 24) return 1.0;
    if (hoursSinceCreated < 72) return 0.8;
    if (hoursSinceCreated < 168) return 0.6; // 1 week
    return 0.3;
  }

  private static async calculateLocationRelevance(video: any, userProfile: UserProfile): Promise<number> {
    // Simple location-based scoring (can be enhanced with actual geo data)
    return 0.5; // Default moderate relevance
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private static analyzeCuisinePreferences(interactions: any[]): string[] {
    const cuisineCount: Map<string, number> = new Map();

    interactions.forEach(interaction => {
      // Extract cuisine preferences from interaction data
      const tags = interaction.value?.tags || [];
      tags.forEach((tag: string) => {
        cuisineCount.set(tag, (cuisineCount.get(tag) || 0) + 1);
      });
    });

    return Array.from(cuisineCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine);
  }

  private static analyzeBehaviorPatterns(interactions: any[]): any {
    const totalWatchTime = interactions.reduce((sum, i) => sum + (i.watchTime || 0), 0);
    const avgWatchTime = interactions.length > 0 ? totalWatchTime / interactions.length : 0;

    const creatorCounts: Map<string, number> = new Map();
    interactions.forEach(i => {
      if (i.interactionType === 'like' || i.interactionType === 'share') {
        creatorCounts.set(i.creatorId, (creatorCounts.get(i.creatorId) || 0) + 1);
      }
    });

    const favoriteCreators = Array.from(creatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([creatorId]) => creatorId);

    return {
      avgViewTime: avgWatchTime,
      favoriteCreators,
    };
  }

  private static analyzeOrderPatterns(orders: any[]): any {
    if (!orders.length) {
      return {
        priceRange: { min: 0, max: 1000 },
        dietaryRestrictions: [],
        spiceLevel: 2,
        frequency: 0,
        peakTimes: [],
      };
    }

    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const avgOrderValue = totalAmount / orders.length;

    const orderHours = orders.map(order => new Date(order.createdAt).getHours());
    const peakTimes = this.findPeakTimes(orderHours);

    return {
      priceRange: {
        min: Math.max(0, avgOrderValue * 0.7),
        max: avgOrderValue * 1.5,
      },
      dietaryRestrictions: [], // Extract from order items
      spiceLevel: 2, // Default
      frequency: orders.length / 30, // Orders per day (assuming 30-day period)
      peakTimes,
    };
  }

  private static findPeakTimes(hours: number[]): string[] {
    const hourCounts: Map<number, number> = new Map();
    hours.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => {
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
      });
  }

  private static async updateUserProfileFromInteraction(
    userId: string,
    videoId: string,
    interactionType: string,
    value?: any
  ): Promise<void> {
    // Update user profile based on new interaction
    const profile = this.userProfiles.get(userId);
    if (profile && interactionType === 'view' && value?.watchTime) {
      // Update average watch time
      profile.behaviors.viewTime = (profile.behaviors.viewTime + value.watchTime) / 2;
      this.userProfiles.set(userId, profile);
    }
  }

  static async getVideoSimilarity(videoId1: string, videoId2: string): Promise<number> {
    try {
      const video1 = await storage.db.select()
        .from(videos)
        .where(eq(videos.id, videoId1))
        .limit(1);

      const video2 = await storage.db.select()
        .from(videos)
        .where(eq(videos.id, videoId2))
        .limit(1);

      if (!video1.length || !video2.length) return 0;

      // Simple tag-based similarity
      const tags1 = new Set(video1[0].tags || []);
      const tags2 = new Set(video2[0].tags || []);
      
      const intersection = new Set([...tags1].filter(x => tags2.has(x)));
      const union = new Set([...tags1, ...tags2]);
      
      return intersection.size / union.size;
    } catch (error) {
      console.error('Error calculating video similarity:', error);
      return 0;
    }
  }

  static async getTrendingContent(limit: number = 10): Promise<any[]> {
    try {
      const trendingVideos = await storage.db.select()
        .from(videos)
        .where(eq(videos.status, 'published'))
        .orderBy(desc(sql`(${videos.views} * 0.3 + ${videos.likes} * 0.5 + ${videos.orders} * 2.0) / EXTRACT(epoch FROM (NOW() - ${videos.createdAt})) * 86400`))
        .limit(limit);

      return trendingVideos;
    } catch (error) {
      console.error('Error getting trending content:', error);
      return [];
    }
  }

  static async retrainModel(): Promise<void> {
    try {
      console.log('Starting ML model retraining...');
      
      // Collect training data
      const interactions = await storage.db.select()
        .from(videoInteractions)
        .orderBy(desc(videoInteractions.createdAt))
        .limit(10000);

      // Process and update recommendation weights
      const learningRate = 0.01;
      
      // Simplified gradient descent for recommendation weights
      for (const interaction of interactions) {
        if (interaction.interactionType === 'like' || interaction.interactionType === 'order') {
          // Positive feedback - increase weights for similar content
          await this.adjustWeights(interaction.userId, interaction.videoId, learningRate);
        }
      }

      console.log('ML model retraining completed');
    } catch (error) {
      console.error('Error retraining model:', error);
    }
  }

  private static async adjustWeights(userId: string, videoId: string, learningRate: number): Promise<void> {
    // Simplified weight adjustment logic
    // In production, this would use proper ML algorithms
  }
}
