import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { QueryFailedError } from 'pg';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  errors?: ValidationError[];
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;
  let errorCode = err.code || 'SERVER_ERROR';

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
    errorCode = 'INVALID_TOKEN';
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || Array.isArray(err.errors)) {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    
    if (Array.isArray(err.errors)) {
      err.errors.forEach((error: ValidationError) => {
        if (!errors[error.param]) {
          errors[error.param] = [];
        }
        errors[error.param].push(error.msg);
      });
    }
  }

  // Handle database errors
  if (err instanceof QueryFailedError) {
    // @ts-ignore - driverError exists on QueryFailedError
    const { code, detail } = err.driverError || {};
    
    // Handle unique constraint violation
    if (code === '23505') {
      statusCode = 409;
      message = 'A record with these details already exists';
      errorCode = 'DUPLICATE_ENTRY';
    }
    // Handle foreign key violation
    else if (code === '23503') {
      statusCode = 400;
      message = 'Referenced record not found';
      errorCode = 'FOREIGN_KEY_VIOLATION';
    }
    // Handle not null violation
    else if (code === '23502') {
      statusCode = 400;
      message = 'Required field missing';
      errorCode = 'NOT_NULL_VIOLATION';
    }
  }

  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      code: errorCode,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  } else {
    // In production, log to a file or monitoring service
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(errors && { details: errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// 404 Not Found handler
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
};

// Async handler wrapper to catch async/await errors
export const asyncHandler = (fn: Function) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
