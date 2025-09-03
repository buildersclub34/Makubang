import { users } from '../../shared/schema';

export type User = typeof users.$inferSelect & {
  failedLoginAttempts?: number;
  lastFailedLogin?: Date | null;
};

export type NewUser = Omit<typeof users.$inferInsert, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date | null;
  failedLoginAttempts?: number;
  lastFailedLogin?: Date | null;
};

export type UserWithPassword = User & {
  password: string;
  failedLoginAttempts: number;
  lastFailedLogin: Date | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  lastPasswordChange?: number;
};
