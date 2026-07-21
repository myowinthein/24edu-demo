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
  const modes = await Promise.all(ids.map((id) => redis.get<SessionMode>(sessionModeKey(id))));

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

  // Collect guestIds to clean up their session lists
  const guestToSessions = new Map<string, string[]>();
  ids.forEach((id, i) => {
    const guestId = metas[i]?.guestId;
    if (guestId) {
      if (!guestToSessions.has(guestId)) guestToSessions.set(guestId, []);
      guestToSessions.get(guestId)!.push(id);
    }
  });

  const p = redis.pipeline();
  for (const id of ids) {
    p.del(sessionMessagesKey(id));
    p.del(sessionModeKey(id));
    p.del(sessionMetaKey(id));
  }
  p.del(SESSIONS_ACTIVE_KEY);
  for (const [guestId] of guestToSessions) {
    p.del(guestSessionsKey(guestId));
  }
  await p.exec();
  await publishSessions();

  return NextResponse.json({ cleared: ids.length });
}
