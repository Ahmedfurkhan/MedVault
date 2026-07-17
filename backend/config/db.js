import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medvault');
let db = null;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db('medvault');
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB not connected');
  return db;
}
