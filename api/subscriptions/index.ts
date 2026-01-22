import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, SubscriptionDoc } from '../lib/db';
import { getAuthUser } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: '未授权访问' });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<SubscriptionDoc>('subscriptions');

  if (req.method === 'GET') {
    try {
      const subscriptions = await collection.find({ userId: user.userId }).toArray();
      res.json(subscriptions);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else if (req.method === 'POST') {
    try {
      const data = req.body as SubscriptionDoc;
      if (!data.id || !data.sourceUrl) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      data.userId = user.userId;

      const existing = await collection.findOne({ id: data.id, userId: data.userId });
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...updateData } = data;
        await collection.updateOne({ id: data.id, userId: data.userId }, { $set: updateData });
      } else {
        await collection.insertOne(data);
      }

      res.json({ success: true, id: data.id });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
