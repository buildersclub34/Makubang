import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
});

let dbConnection: Db | null = null;

const connectDB = async (): Promise<Db> => {
  try {
    if (!dbConnection) {
      await client.connect();
      await client.db().command({ ping: 1 });
      console.log('Successfully connected to MongoDB!');
      dbConnection = client.db();
    }
    return dbConnection;
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    throw error;
  }
};

const getDB = (): Db => {
  if (!dbConnection) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return dbConnection;
};

export { connectDB, getDB };
export default { connectDB, getDB };
