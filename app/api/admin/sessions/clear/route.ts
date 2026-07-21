import { NextRequest, NextResponse } from 'next/server';
import {
  redis,
  SESSIONS_ACTIVE_KEY,
  sessionMessagesKey,
  sessionModeKey,
  sessionMetaKey,
  guestSessionsKey,
} from '@/lib/redis';
import { publishSessions } from '@/lib/pubsub';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SessionMode, SessionMeta } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ids = (await redis.zrange(SESSIONS_ACTIVE_KEY, 0, -1)) as string[];
  const p0 = redis.pipeline();
  ids.forEach((id) => p0.get(sessionModeKey(id)));
  const modes = (await p0.exec()) as (SessionMode | null)[];

  const ai = modes.filter((m) => !m || m === 'ai').length;
  const human = modes.filter((m) => m === 'requested' || m === 'human').length;

  return NextResponse.json({ total: ids.length, ai, human });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ids = (await redis.zrange(SESSIONS_ACTIVE_KEY, 0, -1)) as string[];
  if (ids.length === 0) return NextResponse.json({ cleared: 0 });

  const metas = await Promise.all(ids.map((id) => redis.get<SessionMeta>(sessionMetaKey(id))));

  const guestIds = new Set<string>();
  ids.forEach((_, i) => {
    const guestId = metas[i]?.guestId;
    if (guestId) guestIds.add(guestId);
  });

  const p = redis.pipeline();
  for (const id of ids) {
    p.del(sessionMessagesKey(id));
    p.del(sessionModeKey(id));
    p.del(sessionMetaKey(id));
  }
  p.del(SESSIONS_ACTIVE_KEY);
  for (const guestId of guestIds) {
    p.del(guestSessionsKey(guestId));
  }
  await p.exec();
  await publishSessions();

  return NextResponse.json({ cleared: ids.length });
}
