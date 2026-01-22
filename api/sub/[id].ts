import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, SubscriptionDoc } from '../lib/db';
import { refreshSubscription } from '../lib/subscription';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<SubscriptionDoc>('subscriptions');
    const subscription = await collection.findOne({ id });

    if (!subscription) {
      return res.status(404).send('Subscription not found');
    }

    let config = subscription.config;

    try {
      console.log(`Refreshing subscription ${id} from source...`);
      config = await refreshSubscription(subscription);
      
      await collection.updateOne(
        { id },
        { $set: { config, lastRefresh: Date.now() } }
      );
      console.log(`Subscription ${id} refreshed successfully`);
    } catch (refreshError) {
      console.error(`Failed to refresh subscription ${id}, using cached config:`, refreshError);
    }

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clash-config-${id}.yaml"`);
    res.send(config);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
