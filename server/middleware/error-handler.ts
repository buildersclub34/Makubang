import { NextResponse } from 'next/server';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// Custom error classes
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: any) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, message, code);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found', code = 'NOT_FOUND') {
    super(404, message, code);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(409, message, code);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation Error', details?: any) {
    super(422, message, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too Many Requests', code = 'RATE_LIMIT_EXCEEDED') {
    super(429, message, code);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') {
    super(500, message, code);
  }
}

// Error handler middleware
export function errorHandler() {
  return (error: any) => {
    // Log the error
    logger.error('API Error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
      details: error.details,
    });

    // Handle specific error types
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          code: 'VALIDATION_ERROR',
          details,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle custom API errors
    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          details: error.details,
        }),
        { 
          status: error.statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Default error response
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  };
}

// Error handler wrapper for async functions
export function withErrorHandling<T extends any[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorHandler()(error);
    }
  };
}

// 404 handler
export function notFoundHandler() {
  return new Response(
    JSON.stringify({
      error: 'Not Found',
      code: 'NOT_FOUND',
    }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
