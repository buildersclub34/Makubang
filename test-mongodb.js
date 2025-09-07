import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/makubang';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`Database: ${mongoose.connection.name}`);
    
    // List all collections to verify access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => console.log(`- ${collection.name}`));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nConnection closed.');
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

testConnection();
