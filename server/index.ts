import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, SubscriptionDoc, UserDoc } from './db';
import { parseSubscription, lookupCountries, generateClashConfig, ProxyNode } from '../shared';
import { authMiddleware, AuthRequest, generateToken, hashPassword, comparePassword } from './auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: '用户名至少3位，密码至少6位' });
    }

    const { db } = await connectToDatabase();
    const users = db.collection<UserDoc>('users');

    const existing = await users.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const id = Math.random().toString(36).substring(2, 15);
    const passwordHash = await hashPassword(password);
    const user: UserDoc = {
      id,
      username,
      passwordHash,
      createdAt: Date.now(),
    };

    await users.insertOne(user);
    const token = generateToken({ userId: id, username });
    res.json({ success: true, token, user: { id, username } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection<UserDoc>('users').findOne({ username });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken({ userId: user.id, username: user.username });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Subscription Routes (protected)
app.get('/api/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { db } = await connectToDatabase();
    const subscriptions = await db.collection<SubscriptionDoc>('subscriptions')
      .find({ userId: req.user!.userId })
      .toArray();
    res.json(subscriptions);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body as SubscriptionDoc;
    if (!data.id || !data.sourceUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    data.userId = req.user!.userId;

    const { db } = await connectToDatabase();
    const collection = db.collection<SubscriptionDoc>('subscriptions');

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
});

app.get('/api/subscriptions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { db } = await connectToDatabase();
    const subscription = await db.collection<SubscriptionDoc>('subscriptions')
      .findOne({ id, userId: req.user!.userId });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/subscriptions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { db } = await connectToDatabase();
    await db.collection<SubscriptionDoc>('subscriptions')
      .deleteOne({ id, userId: req.user!.userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

async function fetchSubscriptionContent(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return await response.text();
}

async function refreshSubscription(subscription: SubscriptionDoc): Promise<string> {
  const content = await fetchSubscriptionContent(subscription.sourceUrl);
  const nodes = parseSubscription(content);
  
  if (nodes.length === 0) {
    throw new Error('No valid nodes found');
  }

  const servers = nodes.map(n => n.server);
  const countryMap = await lookupCountries(servers);

  const nodesWithCountry: ProxyNode[] = nodes.map(node => ({
    ...node,
    country: countryMap.get(node.server) || 'Unknown',
  }));

  return generateClashConfig(nodesWithCountry);
}

app.get('/api/sub/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
