import { NextRequest, NextResponse } from 'next/server';
import { redis, adminSessionKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = req.cookies.get('admin_token')?.value;
  if (token) await redis.del(adminSessionKey(token));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  return res;
}
