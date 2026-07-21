import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import type { SourceEntry } from '@/lib/types';

export async function GET() {
  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const { filename, csv } = await req.json();

  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];

  const lines = (csv as string).split('\n').filter((l: string) => l.trim());
  const rowCount = Math.max(0, lines.length - 1);

  const newSource: SourceEntry = {
    id: crypto.randomUUID(),
    filename,
    csv,
    rowCount,
    uploadedAt: new Date().toISOString(),
  };

  const updated = [...sources, newSource];
  await redis.set(SOURCES_KEY, updated);
  return NextResponse.json(updated);
}
