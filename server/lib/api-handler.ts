import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cors } from '../middleware/cors';
import { requestLogger, requestIdMiddleware, slowRequestLogger } from '../middleware/request-logger';
import { errorHandler, withErrorHandling, ApiError } from '../middleware/error-handler';
import { validate, schemas } from '../middleware/validation';
import { rateLimit } from '../middleware/rate-limit';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

type RouteHandler = (req: NextRequest, params: any) => Promise<NextResponse>;

type RouteConfig = {
  method: HttpMethod | HttpMethod[];
  path: string;
  handler: RouteHandler;
  middleware?: ((req: NextRequest) => Promise<NextResponse | void> | NextResponse | void)[];
  schema?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  auth?: {
    required?: boolean;
    roles?: string[];
  };
  rateLimit?: {
    type: 'auth' | 'api' | 'password-reset';
    identifier?: string;
  };
  cors?: boolean | {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
};

export class ApiHandler {
  private routes: RouteConfig[] = [];
  private globalMiddleware: ((req: NextRequest) => Promise<NextResponse | void> | NextResponse | void)[] = [];

  constructor() {
    // Add default global middleware
    this.use(requestIdMiddleware());
    this.use(requestLogger());
    this.use(slowRequestLogger(2000)); // Log requests slower than 2s
  }

  use(middleware: (req: NextRequest) => Promise<NextResponse | void> | NextResponse | void) {
    this.globalMiddleware.push(middleware);
    return this;
  }

  route(config: RouteConfig) {
    this.routes.push(config);
    return this;
  }

  get(path: string, handler: RouteHandler, options?: Omit<RouteConfig, 'method' | 'path' | 'handler'>) {
    return this.route({ method: 'GET', path, handler, ...options });
  }

  post(path: string, handler: RouteHandler, options?: Omit<RouteConfig, 'method' | 'path' | 'handler'>) {
    return this.route({ method: 'POST', path, handler, ...options });
  }

  put(path: string, handler: RouteHandler, options?: Omit<RouteConfig, 'method' | 'path' | 'handler'>) {
    return this.route({ method: 'PUT', path, handler, ...options });
  }

  patch(path: string, handler: RouteHandler, options?: Omit<RouteConfig, 'method' | 'path' | 'handler'>) {
    return this.route({ method: 'PATCH', path, handler, ...options });
  }

  delete(path: string, handler: RouteHandler, options?: Omit<RouteConfig, 'method' | 'path' | 'handler'>) {
    return this.route({ method: 'DELETE', path, handler, ...options });
  }

  private async handleRequest(req: NextRequest) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, ''); // Remove /api prefix

    // Find matching route
    const route = this.routes.find(r => {
      // Convert route path to regex pattern
      const pattern = r.path
        .replace(/\//g, '\\/')
        .replace(/:[^\/]+/g, '([^\/]+)');
      
      const regex = new RegExp(`^${pattern}$`);
      const matches = path.match(regex);
      
      // Check if method matches
      const methodMatches = Array.isArray(r.method)
        ? r.method.includes(req.method as HttpMethod)
        : r.method === req.method;
      
      return matches && methodMatches;
    });

    if (!route) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Extract route parameters
    const params: Record<string, string> = {};
    const patternParts = route.path.split('/');
    const pathParts = path.split('/').filter(Boolean);
    
    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[index] || '';
      }
    });

    try {
      // Apply global middleware
      for (const middleware of this.globalMiddleware) {
        const result = await middleware(req);
        if (result) return result;
      }

      // Apply route-specific middleware
      if (route.middleware) {
        for (const middleware of route.middleware) {
          const result = await middleware(req);
          if (result) return result;
        }
      }

      // Apply rate limiting
      if (route.rateLimit) {
        const { isRateLimited, response } = await rateLimit(
          req,
          route.rateLimit.type,
          route.rateLimit.identifier
        );
        
        if (isRateLimited) {
          return response;
        }
      }

      // Apply CORS
      if (route.cors !== false) {
        const corsOptions = typeof route.cors === 'object' ? route.cors : undefined;
        const corsResponse = cors(corsOptions)(req);
        if (corsResponse) return corsResponse;
      }

      // Apply validation
      if (route.schema) {
        const validationResult = await validate(route.schema)(req, params);
        if (!validationResult.isValid) {
          return validationResult.response as NextResponse;
        }
      }

      // Apply authentication
      if (route.auth?.required) {
        // TODO: Implement authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Check roles if specified
        if (route.auth.roles?.length) {
          const hasRole = route.auth.roles.some(role => 
            session.user.roles?.includes(role)
          );
          
          if (!hasRole) {
            return NextResponse.json(
              { error: 'Forbidden' },
              { status: 403 }
            );
          }
        }
      }

      // Call the route handler
      const response = await route.handler(req, params);
      
      // Ensure the response is a NextResponse
      return response instanceof NextResponse 
        ? response 
        : NextResponse.json(response);

    } catch (error) {
      // Handle errors
      return errorHandler()(error);
    }
  }

  getHandler() {
    return withErrorHandling((req: Request) => {
      const nextReq = req as unknown as NextRequest;
      return this.handleRequest(nextReq);
    });
  }
}

// Helper function to create a new API handler
export function createApiHandler() {
  return new ApiHandler();
}

// Example usage:
/*
const api = createApiHandler()
  .use(someGlobalMiddleware)
  .get(
    '/users', 
    async (req) => {
      const users = await db.query.users.findMany();
      return NextResponse.json(users);
    },
    {
      auth: { required: true, roles: ['admin'] },
      schema: {
        query: z.object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
        }),
      },
    }
  )
  .post(
    '/users',
    async (req) => {
      const body = await req.json();
      const user = await db.insert(users).values(body).returning();
      return NextResponse.json(user, { status: 201 });
    },
    {
      schema: {
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(8),
        }),
      },
    }
  );

export const GET = api.getHandler();
export const POST = api.getHandler();
*/
