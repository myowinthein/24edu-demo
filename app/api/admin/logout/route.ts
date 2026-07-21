import { NextRequest, NextResponse } from 'next/server';
import { redis, adminSessionKey } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (token) await redis.del(adminSessionKey(token));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  return res;
}
