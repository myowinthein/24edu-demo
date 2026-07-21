import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import { deleteSourceVectors } from '@/lib/vector';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SourceEntry } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  return NextResponse.json({ total: sources.length });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  if (sources.length === 0) return NextResponse.json({ cleared: 0 });

  await Promise.all([
    redis.del(SOURCES_KEY),
    ...sources.map((s) => deleteSourceVectors(s.id, s.chunkCount)),
  ]);

  return NextResponse.json({ cleared: sources.length });
}
