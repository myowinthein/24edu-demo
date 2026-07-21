import { NextRequest, NextResponse } from 'next/server';
import { redis, leadKey, LEADS_ALL_KEY } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const total = await redis.zcard(LEADS_ALL_KEY);
  return NextResponse.json({ total });
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const guestIds = await redis.zrange<string[]>(LEADS_ALL_KEY, 0, -1);
  if (!guestIds || guestIds.length === 0) {
    return NextResponse.json({ cleared: 0 });
  }

  const pipeline = redis.pipeline();
  for (const gid of guestIds) pipeline.del(leadKey(gid));
  pipeline.del(LEADS_ALL_KEY);
  await pipeline.exec();

  return NextResponse.json({ cleared: guestIds.length });
}
