import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, SubscriptionDoc } from '../lib/db';
import { getAuthUser } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: '未授权访问' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<SubscriptionDoc>('subscriptions');

  if (req.method === 'GET') {
    try {
      const subscription = await collection.findOne({ id, userId: user.userId });
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      res.json(subscription);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await collection.deleteOne({ id, userId: user.userId });
      res.json({ success: true });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
