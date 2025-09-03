import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a postgres client
const queryClient = postgres(databaseUrl);

// Create drizzle instance with schema
export const db = drizzle(queryClient, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// Helper function to connect to the database
export const connectDB = async () => {
  try {
    // Test the connection
    await queryClient`SELECT 1`;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Export types for type safety
export type * from 'drizzle-orm';
export * as schemaExports from '../../shared/schema';

// Helper function to handle database errors
export function handleDatabaseError(error: unknown, context?: string): never {
  console.error('Database error', { error, context });
  
  if (error instanceof Error) {
    // Handle specific error types if needed
    if ('code' in error) {
      switch (error.code) {
        case '23505': // Unique violation
          throw new Error('A record with these details already exists');
        case '23503': // Foreign key violation
          throw new Error('Referenced record not found');
        case '23502': // Not null violation
          throw new Error('Required field missing');
      }
    }
    throw error;
  }
  throw new Error('An unexpected database error occurred');
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      tx.rollback();
      throw error;
    }
  });
}
