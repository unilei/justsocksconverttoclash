import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthUser } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: '未授权访问' });
  }

  res.json({ user });
}
