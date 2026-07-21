import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import { indexSource } from '@/lib/vector';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SourceEntry } from '@/lib/types';

export async function GET() {
  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { filename, csv } = await req.json();

  const lines = (csv as string).split('\n').filter((l: string) => l.trim());
  const rowCount = Math.max(0, lines.length - 1);
  const id = crypto.randomUUID();

  const chunkCount = await indexSource(id, filename, csv);

  const newSource: SourceEntry = { id, filename, rowCount, uploadedAt: new Date().toISOString(), chunkCount };

  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  const updated = [...sources, newSource];
  await redis.set(SOURCES_KEY, updated);

  return NextResponse.json(updated);
}
