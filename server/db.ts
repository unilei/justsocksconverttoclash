import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('convertsub');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export interface SubscriptionDoc {
  _id?: string;
  id: string;
  userId: string;
  name: string;
  sourceUrl: string;
  config: string;
  createdAt: number;
  lastRefresh: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface UserDoc {
  _id?: string;
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}
