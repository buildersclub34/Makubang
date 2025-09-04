
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
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

    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
      }
    });
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

    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
      }
    });
  };
};
