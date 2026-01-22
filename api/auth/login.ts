import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase, UserDoc } from '../lib/db';
import { generateToken, comparePassword } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
