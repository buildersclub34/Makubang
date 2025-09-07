import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Default CORS configuration
const DEFAULT_OPTIONS = {
  // Allowed origins (use * to allow all, or specify domains)
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token',
  ],
  // Exposed headers
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  // Credentials
  credentials: true,
  // Max age in seconds
  maxAge: 86400, // 24 hours
} as const;

type CorsOptions = Partial<typeof DEFAULT_OPTIONS>;

/**
 * CORS middleware for Next.js API routes
 * @param options CORS configuration options
 * @returns Middleware function
 */
export function cors(options: CorsOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return function corsMiddleware(request: NextRequest) {
    const origin = request.headers.get('origin') || '';
    const isPreflight = request.method === 'OPTIONS';
    const isAllowedOrigin = 
      config.origin === '*' || 
      (Array.isArray(config.origin) 
        ? config.origin.includes(origin) 
        : config.origin === origin);

    // Create response
    const response = isPreflight 
      ? new NextResponse(null, { status: 204 }) // No content for preflight
      : NextResponse.next();

    // Set CORS headers
    if (isAllowedOrigin) {
      // Allow the actual origin instead of * when credentials are true
      const allowOrigin = config.credentials && config.origin !== '*' ? origin : config.origin;
      
      // Set CORS headers
      response.headers.set('Access-Control-Allow-Origin', 
        Array.isArray(allowOrigin) ? allowOrigin.join(',') : allowOrigin);
      
      if (config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (isPreflight) {
        // Handle preflight request
        response.headers.set('Access-Control-Allow-Methods', config.methods.join(','));
        response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(','));
        response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(','));
        response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
      } else {
        // For actual requests, expose these headers
        config.exposedHeaders.forEach(header => {
          response.headers.set('Access-Control-Expose-Headers', header);
        });
      }
    }

    return response;
  };
}

/**
 * CORS middleware for Next.js API routes with default options
 */
export const corsWithDefaults = cors();

/**
 * Apply CORS to an API route handler
 * @param handler API route handler
 * @param options CORS options
 * @returns Wrapped API route handler with CORS
 */
export function withCors(
  handler: (req: Request) => Promise<Response>,
  options?: CorsOptions
) {
  const corsHandler = cors(options);
  
  return async (req: Request) => {
    const nextRequest = req as unknown as NextRequest;
    const corsResponse = corsHandler(nextRequest);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return corsResponse;
    }
    
    // Call the actual handler
    const response = await handler(req);
    
    // Copy CORS headers to the response
    corsResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}
