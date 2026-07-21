import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import { deleteSourceVectors } from '@/lib/vector';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SourceEntry } from '@/lib/types';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = params;
  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  const target = sources.find((s) => s.id === id);
  const updated = sources.filter((s) => s.id !== id);

  await Promise.all([
    redis.set(SOURCES_KEY, updated),
    target ? deleteSourceVectors(id, target.chunkCount) : Promise.resolve(),
  ]);

  return NextResponse.json(updated);
}
