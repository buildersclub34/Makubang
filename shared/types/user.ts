import { users } from '../schema';

// Infer the type of a user from the schema
export type User = typeof users.$inferSelect;

// Type for a user with sensitive information
export type SafeUser = Omit<User, 'password' | 'refreshToken' | 'resetToken'>;

// Type for the authenticated user in the request
export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role'>;
