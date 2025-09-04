// This file is now deprecated. Please use ./lib/mongodb.ts instead.
// This file is kept for backward compatibility.

import { connectDB as connectMongoDB, getDB as getMongoDB } from './lib/mongodb';

export const connectDB = connectMongoDB;
export const getDB = getMongoDB;

export default connectDB;
