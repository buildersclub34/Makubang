import { User } from '../../shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Express.Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// This ensures the file is treated as a module
export {};
