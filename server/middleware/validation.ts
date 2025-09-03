import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Common validation schemas
export const schemas = {
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(
    /^\+?[1-9]\d{1,14}$/,
    'Invalid phone number format. Use international format (e.g., +1234567890)'
  ),
  url: z.string().url('Invalid URL format'),
  uuid: z.string().uuid('Invalid UUID format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid date format'
  ),
};

// Request validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request) => {
    try {
      let data;
      const contentType = req.headers.get('content-type');
      
      // Parse request body based on content type
      if (contentType?.includes('application/json')) {
        data = await req.json();
      } else if (contentType?.includes('form-data')) {
        const formData = await req.formData();
        data = Object.fromEntries(formData.entries());
      } else {
        data = {};
      }

      // Validate data against schema
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation failed', { errors });
        
        return {
          isValid: false,
          response: NextResponse.json(
            { 
              error: 'Validation failed',
              details: errors 
            },
            { status: 400 }
          ),
        };
      }

      return { 
        isValid: true, 
        data: result.data 
      };
    } catch (error) {
      logger.error('Error during validation', { error });
      return {
        isValid: false,
        response: NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        ),
      };
    }
  };
}

// URL parameter validation
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, params: Record<string, string>) => {
    try {
      const result = schema.safeParse(params);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          param: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Invalid URL parameters', { errors });
        
        return {
          isValid: false,
          response: NextResponse.json(
            { 
              error: 'Invalid URL parameters',
              details: errors 
            },
            { status: 400 }
          ),
        };
      }

      return { 
        isValid: true, 
        params: result.data 
      };
    } catch (error) {
      logger.error('Error validating URL parameters', { error });
      return {
        isValid: false,
        response: NextResponse.json(
          { error: 'Invalid URL parameters' },
          { status: 400 }
        ),
      };
    }
  };
}

// Query parameter validation
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      
      const result = schema.safeParse(queryParams);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          param: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Invalid query parameters', { errors });
        
        return {
          isValid: false,
          response: NextResponse.json(
            { 
              error: 'Invalid query parameters',
              details: errors 
            },
            { status: 400 }
          ),
        };
      }

      return { 
        isValid: true, 
        query: result.data 
      };
    } catch (error) {
      logger.error('Error validating query parameters', { error });
      return {
        isValid: false,
        response: NextResponse.json(
          { error: 'Invalid query parameters' },
          { status: 400 }
        ),
      };
    }
  };
}

// Request validation middleware with schema validation
export function validate(schemas: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) {
  return async (req: Request, nextParams?: Record<string, string>) => {
    // Validate request body if schema is provided
    if (schemas.body) {
      const { isValid, response, data } = await validateRequest(schemas.body)(req);
      if (!isValid) return { isValid, response };
      req.json = () => Promise.resolve(data);
    }

    // Validate URL parameters if schema is provided
    if (schemas.params && nextParams) {
      const { isValid, response, params } = validateParams(schemas.params)(req, nextParams);
      if (!isValid) return { isValid, response };
      Object.assign(nextParams, params);
    }

    // Validate query parameters if schema is provided
    if (schemas.query) {
      const { isValid, response, query } = validateQuery(schemas.query)(req);
      if (!isValid) return { isValid, response };
      // Attach validated query to request object
      (req as any).query = query;
    }

    return { isValid: true };
  };
}
