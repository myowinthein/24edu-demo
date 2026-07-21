import { NextRequest } from 'next/server';
import { redis, adminSessionKey } from '@/lib/redis';

export async function verifyAdminToken(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return false;
  const username = await redis.get<string>(adminSessionKey(token));
  return username !== null;
}
