import { NextRequest, NextResponse } from 'next/server';
import { redis, guestSessionsKey, sessionMetaKey, sessionModeKey } from '@/lib/redis';
import type { SessionMeta, SessionMode } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { guestId: string } }
) {
  if (!UUID_RE.test(params.guestId)) {
    return NextResponse.json({ error: 'Invalid guest id' }, { status: 400 });
  }
  const ids = (await redis.zrange(guestSessionsKey(params.guestId), 0, -1, {
    rev: true,
  })) as string[];

  if (ids.length === 0) return NextResponse.json([]);

  const p = redis.pipeline();
  for (const id of ids) {
    p.zscore(guestSessionsKey(params.guestId), id);
    p.get<SessionMeta>(sessionMetaKey(id));
    p.get<SessionMode>(sessionModeKey(id));
  }
  const results = await p.exec();

  const sessions = ids.map((id, i) => {
    const score = results[i * 3] as number | null;
    const meta = results[i * 3 + 1] as SessionMeta | null;
    const mode = (results[i * 3 + 2] as SessionMode | null) ?? 'ai';
    return {
      id,
      title: meta?.title ?? 'Chat',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      lastActiveAt: score ? new Date(score).toISOString() : new Date().toISOString(),
      mode,
    };
  });

  return NextResponse.json(sessions);
}
