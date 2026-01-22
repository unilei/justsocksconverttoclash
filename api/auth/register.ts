import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, UserDoc } from '../lib/db';
import { generateToken, hashPassword } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
