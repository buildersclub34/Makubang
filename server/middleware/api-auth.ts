import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { rateLimit } from './rate-limit';
import { logger } from '../utils/logger';

type RouteConfig = {
  public?: boolean;
  rateLimit?: {
    type: 'auth' | 'api' | 'password-reset';
    identifier?: string;
  };
};

export async function apiAuthMiddleware(
  request: NextRequest,
  config: RouteConfig = { public: false }
) {
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting
  if (config.rateLimit) {
    const { isRateLimited, response } = await rateLimit(
      request,
      config.rateLimit.type,
      config.rateLimit.identifier
    );
    
    if (isRateLimited) {
      return response;
    }
  }

  // Skip authentication for public routes
  if (config.public) {
    return null;
  }

  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    logger.warn('Unauthorized API access attempt', { path: pathname });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Add user to request context
  return { user: session.user };
}

// Helper function to create protected API handlers
export function createApiHandler(
  handler: (req: Request, context: { user: any }) => Promise<NextResponse>,
  config: RouteConfig = { public: false }
) {
  return async (req: Request) => {
    try {
      const authResult = await apiAuthMiddleware(req as unknown as NextRequest, config);
      
      // If authResult is a response, it means there was an error
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      
      // If not public and no user, return unauthorized
      if (!config.public && !authResult?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Call the handler with user context
      return handler(req, authResult || {});
    } catch (error) {
      logger.error('API handler error', { 
        error,
        path: new URL(req.url).pathname 
      });
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
