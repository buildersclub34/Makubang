import mongoose from 'mongoose';

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/makubang';

// Connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Helper function to connect to the database
export const connectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 0) { // 0 = disconnected
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Helper function to handle database errors
export function handleDatabaseError(error: unknown, context?: string): never {
  console.error('Database error', { error, context });
  
  if (error instanceof Error) {
    // Handle specific MongoDB error codes if needed
    if ('code' in error) {
      switch (error.code) {
        case 11000: // Duplicate key error
          throw new Error('A record with these details already exists');
        // Add more MongoDB specific error codes as needed
      }
    }
    throw error;
  }
  throw new Error('An unknown database error occurred');
}

// Export mongoose for models to use
export { mongoose };

// Export types for type safety
export type * from 'mongoose';

// Transaction helper
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  let result: T;
  
  try {
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    await session.endSession();
    return result!;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
}
