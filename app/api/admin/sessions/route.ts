import { NextRequest, NextResponse } from 'next/server';
import { redis, SESSIONS_ACTIVE_KEY, sessionModeKey, sessionMetaKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SessionMode, SessionMeta } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionIds = (await redis.zrange(SESSIONS_ACTIVE_KEY, 0, -1, {
    rev: true,
  })) as string[];

  if (sessionIds.length === 0) return NextResponse.json([]);

  const p = redis.pipeline();
  for (const id of sessionIds) {
    p.zscore(SESSIONS_ACTIVE_KEY, id);
    p.get<SessionMeta>(sessionMetaKey(id));
    p.get<SessionMode>(sessionModeKey(id));
  }
  const results = await p.exec();

  const sessions = sessionIds.map((id, i) => {
    const score = results[i * 3] as number | null;
    const meta = results[i * 3 + 1] as SessionMeta | null;
    const mode = results[i * 3 + 2] as SessionMode | null;
    return {
      id,
      mode: mode ?? 'ai',
      guestId: meta?.guestId ?? '',
      createdAt: meta?.createdAt ?? '',
      lastActiveAt: score ? new Date(score).toISOString() : '',
      browser: meta?.browser ?? '',
      browserVersion: meta?.browserVersion ?? '',
      os: meta?.os ?? '',
      osVersion: meta?.osVersion ?? '',
      device: meta?.device ?? '',
      timezone: meta?.timezone ?? '',
    };
  });

  return NextResponse.json(sessions);
}
