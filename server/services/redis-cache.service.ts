import Redis from 'redis';

export class RedisCacheService {
  private client: Redis.RedisClientType | null = null;
  private static instance: RedisCacheService;

  static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  async connect() {
    if (this.client) return this.client;
    
    try {
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      
      await this.client.connect();
      console.log('Redis connected successfully');
      return this.client;
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.client = null;
      return null;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.client) await this.connect();
    if (!this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.client) await this.connect();
    if (!this.client) return false;
    
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) await this.connect();
    if (!this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async cachePersonalizedFeed(userId: string, feed: any[]): Promise<void> {
    await this.set(`feed:personalized:${userId}`, feed, 1800); // 30 min
  }

  async getPersonalizedFeed(userId: string): Promise<any[] | null> {
    return await this.get(`feed:personalized:${userId}`);
  }

  async cacheTrendingFeed(feed: any[]): Promise<void> {
    await this.set('feed:trending', feed, 3600); // 1 hour
  }

  async getTrendingFeed(): Promise<any[] | null> {
    return await this.get('feed:trending');
  }

  async cacheExploreFeed(feed: any[]): Promise<void> {
    await this.set('feed:explore', feed, 1800); // 30 min
  }

  async getExploreFeed(): Promise<any[] | null> {
    return await this.get('feed:explore');
  }

  async incrementEngagement(videoId: string, type: 'view' | 'like' | 'comment' | 'share'): Promise<void> {
    if (!this.client) await this.connect();
    if (!this.client) return;
    
    const key = `engagement:${videoId}:${type}`;
    await this.client.incr(key);
    await this.client.expire(key, 86400); // 24 hours
  }

  async getEngagementScore(videoId: string): Promise<number> {
    if (!this.client) await this.connect();
    if (!this.client) return 0;
    
    const [views, likes, comments, shares] = await Promise.all([
      this.client.get(`engagement:${videoId}:view`),
      this.client.get(`engagement:${videoId}:like`),
      this.client.get(`engagement:${videoId}:comment`),
      this.client.get(`engagement:${videoId}:share`),
    ]);

    const score = (parseInt(views || '0') * 1) + 
                  (parseInt(likes || '0') * 5) + 
                  (parseInt(comments || '0') * 10) + 
                  (parseInt(shares || '0') * 15);
    
    return score;
  }
}

export const redisCache = RedisCacheService.getInstance();
