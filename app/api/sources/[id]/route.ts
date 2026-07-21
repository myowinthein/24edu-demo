import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import type { SourceEntry } from '@/lib/types';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  const updated = sources.filter((s) => s.id !== id);
  await redis.set(SOURCES_KEY, updated);
  return NextResponse.json(updated);
}
