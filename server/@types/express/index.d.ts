import { Request } from 'express';
import { AuthenticatedUser } from '../../types/user';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// This ensures the file is treated as a module
export {};
