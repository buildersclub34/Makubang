import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../utils/logger';

type NextRequestWithMetadata = NextRequest & {
  metadata?: {
    startTime?: number;
    requestId?: string;
    userId?: string;
    [key: string]: any;
  };
};

/**
 * Request logging middleware
 * Logs incoming requests and their responses
 */
export function requestLogger() {
  return async function (request: NextRequestWithMetadata) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    // Add metadata to request
    request.metadata = {
      ...request.metadata,
      startTime,
      requestId,
    };

    // Log request
    logger.info('Request received', {
      requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      ip: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    try {
      // Continue to next middleware/handler
      const response = NextResponse.next();
      
      // Log response
      const responseTime = Date.now() - startTime;
      
      // Clone the response so we can read the body
      const responseClone = response.clone();
      let responseBody = '';
      
      try {
        // Try to get response body if it's JSON
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const body = await responseClone.json().catch(() => ({}));
          responseBody = JSON.stringify(body);
        }
      } catch (error) {
        // Ignore errors when reading response body
      }
      
      logger.info('Response sent', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        responseSize: responseBody.length,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      return response;
    } catch (error) {
      // Log any errors that occur during request processing
      const responseTime = Date.now() - startTime;
      
      logger.error('Request processing error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: `${responseTime}ms`,
      });
      
      // Re-throw the error to be handled by the error handler
      throw error;
    }
  };
}

/**
 * Middleware to add request ID to response headers
 */
export function requestIdMiddleware() {
  return function (request: NextRequestWithMetadata) {
    const requestId = request.metadata?.requestId || crypto.randomUUID();
    
    // Add request ID to response headers
    const response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);
    
    return response;
  };
}

/**
 * Middleware to log slow requests
 * @param thresholdMs Threshold in milliseconds to consider a request as slow
 */
export function slowRequestLogger(thresholdMs = 1000) {
  return async function (request: NextRequestWithMetadata) {
    const startTime = Date.now();
    const requestId = request.metadata?.requestId || crypto.randomUUID();
    
    try {
      const response = NextResponse.next();
      const responseTime = Date.now() - startTime;
      
      if (responseTime > thresholdMs) {
        logger.warn('Slow request detected', {
          requestId,
          method: request.method,
          url: request.url,
          responseTime: `${responseTime}ms`,
          threshold: `${thresholdMs}ms`,
        });
      }
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (responseTime > thresholdMs) {
        logger.warn('Slow request with error', {
          requestId,
          method: request.method,
          url: request.url,
          responseTime: `${responseTime}ms`,
          threshold: `${thresholdMs}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      throw error;
    }
  };
}

/**
 * Middleware to log request/response body for debugging
 * @param options Configuration options
 */
export function requestResponseLogger(options: {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
} = {}) {
  const {
    logRequestBody = false,
    logResponseBody = false,
    maxBodySize = 1024, // 1KB
  } = options;
  
  return async function (request: NextRequestWithMetadata) {
    const requestId = request.metadata?.requestId || crypto.randomUUID();
    
    // Log request body if enabled
    if (logRequestBody) {
      try {
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const requestBody = await request.clone().text();
          
          logger.debug('Request body', {
            requestId,
            method: request.method,
            url: request.url,
            body: requestBody.length > maxBodySize 
              ? `${requestBody.substring(0, maxBodySize)}... (truncated)` 
              : requestBody,
          });
        }
      } catch (error) {
        logger.warn('Failed to log request body', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Get the response
    const response = NextResponse.next();
    
    // Log response body if enabled
    if (logResponseBody) {
      try {
        const responseClone = response.clone();
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const responseBody = await responseClone.text();
          
          logger.debug('Response body', {
            requestId,
            method: request.method,
            url: request.url,
            status: response.status,
            body: responseBody.length > maxBodySize
              ? `${responseBody.substring(0, maxBodySize)}... (truncated)`
              : responseBody,
          });
        }
      } catch (error) {
        logger.warn('Failed to log response body', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return response;
  };
}
