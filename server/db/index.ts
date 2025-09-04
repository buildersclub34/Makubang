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
export const db = drizzle(queryClient, { schema });

export * from '../../shared/schema';

// Export types
export type { InferModel, InferSelectModel, InferInsertModel } from 'drizzle-orm';

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
        case '23514': // Check violation
          throw new Error('Data validation failed');
      }
    }
    
    throw new Error(`Database error: ${error.message}`);
  }
  
  throw new Error('An unknown database error occurred');
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      handleDatabaseError(error, 'Transaction failed');
    }
  });
}
