import { NextRequest, NextResponse } from 'next/server';
import { redis, guestSessionsKey, sessionMetaKey } from '@/lib/redis';
import type { SessionMeta } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { guestId: string } }
) {
  const ids = (await redis.zrange(guestSessionsKey(params.guestId), 0, -1, {
    rev: true,
  })) as string[];

  if (ids.length === 0) return NextResponse.json([]);

  const p = redis.pipeline();
  for (const id of ids) {
    p.zscore(guestSessionsKey(params.guestId), id);
    p.get<SessionMeta>(sessionMetaKey(id));
  }
  const results = await p.exec();

  const sessions = ids.map((id, i) => {
    const score = results[i * 2] as number | null;
    const meta = results[i * 2 + 1] as SessionMeta | null;
    return {
      id,
      title: meta?.title ?? 'Chat',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      lastActiveAt: score ? new Date(score).toISOString() : new Date().toISOString(),
    };
  });

  return NextResponse.json(sessions);
}
