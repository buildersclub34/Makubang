import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';

// Custom error class for validation errors
export class ValidationRequestError extends Error {
  statusCode: number;
  errors: any;

  constructor(message: string, errors: any) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = StatusCodes.BAD_REQUEST;
    this.errors = errors;
  }
}

// Middleware to validate request using express-validator
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string[]> = {};
    
    errors.array().forEach(error => {
      const param = error.param;
      if (!formattedErrors[param]) {
        formattedErrors[param] = [];
      }
      formattedErrors[param].push(error.msg);
    });
    
    throw new ValidationRequestError('Validation failed', formattedErrors);
  }
  
  next();
};

// Higher-order function to combine validation chains and error handling
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors: Record<string, string[]> = {};
    errors.array().forEach(error => {
      const param = error.param;
      if (!formattedErrors[param]) {
        formattedErrors[param] = [];
      }
      formattedErrors[param].push(error.msg);
    });

    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
      }
    });
  };
};

// Common validation rules
export const commonValidators = {
  email: (field = 'email') => {
    return [
      body(field)
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
    ];
  },
  
  password: (field = 'password') => {
    return [
      body(field)
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
    ];
  },
  
  name: (field = 'name') => {
    return [
      body(field)
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    ];
  },
  
  phone: (field = 'phone') => {
    return [
      body(field)
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number')
    ];
  },
  
  objectId: (field: string, name: string) => {
    return [
      param(field)
        .isMongoId()
        .withMessage(`Invalid ${name} ID format`)
    ];
  },
  
  pagination: () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
    ];
  }
};

// Middleware to validate file uploads
export const validateFileUpload = (field: string, allowedTypes: string[], maxSizeMB = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || !req.files[field]) {
      return next(new ValidationRequestError('No file uploaded', {
        [field]: ['No file was uploaded']
      }));
    }

    const file = Array.isArray(req.files[field]) 
      ? req.files[field][0] 
      : req.files[field];

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return next(new ValidationRequestError('Invalid file type', {
        [field]: [`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`]
      }));
    }

    // Check file size (default 5MB)
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      return next(new ValidationRequestError('File too large', {
        [field]: [`File size must be less than ${maxSizeMB}MB`]
      }));
    }

    next();
  };
};
