import { connectDB } from './server/src/config/db';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await connectDB();
    
    // Check if connected
    if (mongoose.connection.readyState === 1) { // 1 = connected
      console.log('✅ Successfully connected to MongoDB!');
      console.log(`Database: ${mongoose.connection.name}`);
      
      // List all collections to verify access
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('\nAvailable collections:');
      collections.forEach(collection => console.log(`- ${collection.name}`));
      
      // Close the connection
      await mongoose.connection.close();
      console.log('\nConnection closed.');
      process.exit(0);
    } else {
      console.error('❌ Failed to connect to MongoDB');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

testConnection();
