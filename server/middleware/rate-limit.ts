import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { logger } from '../utils/logger';

// Initialize Redis client if UPSTASH_REDIS_REST_URL is available
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

// Create rate limiters for different endpoints
const rateLimiters = {
  // Strict rate limiting for auth endpoints
  auth: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    prefix: 'ratelimit:auth',
  }),
  // More lenient rate limiting for general API endpoints
  api: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
    prefix: 'ratelimit:api',
  }),
  // Stricter rate limiting for password reset
  passwordReset: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
    prefix: 'ratelimit:password-reset',
  }),
};

type RateLimitType = keyof typeof rateLimiters;

export async function rateLimit(
  request: Request,
  type: RateLimitType = 'api',
  identifier?: string
): Promise<{ isRateLimited: boolean; response?: NextResponse }> {
  // If Redis is not configured, skip rate limiting in development
  if (!redis) {
    if (process.env.NODE_ENV === 'development') {
      return { isRateLimited: false };
    }
    // In production, we should have Redis configured
    logger.error('Redis is not configured for rate limiting');
    return {
      isRateLimited: true,
      response: NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      ),
    };
  }

  try {
    // Use the IP address as the default identifier if not provided
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const id = identifier || ip;

    const result = await rateLimiters[type].limit(id);

    // Add rate limit headers to the response
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    };

    if (!result.success) {
      logger.warn('Rate limit exceeded', {
        type,
        id,
        limit: result.limit,
        remaining: result.remaining,
      });

      return {
        isRateLimited: true,
        response: new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
          }
        ),
      };
    }

    return { isRateLimited: false };
  } catch (error) {
    logger.error('Error in rate limiting', { error });
    // In case of error, fail open to not block legitimate traffic
    return { isRateLimited: false };
  }
}
