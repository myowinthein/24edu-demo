import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionMessagesKey, sessionModeKey, SESSIONS_ACTIVE_KEY } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage, SessionMode } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { text } = (await req.json()) as { text: unknown };
  if (!text || typeof text !== 'string' || text.length > 4000) {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
  }

  const [messages, currentMode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(id)),
    redis.get<SessionMode>(sessionModeKey(id)),
  ]);

  const updated = [...(messages ?? []), { role: 'admin' as const, text, timestamp: new Date().toISOString() }];
  const mode = currentMode ?? 'human';
  const now = Date.now();

  await Promise.all([
    redis.set(sessionMessagesKey(id), updated),
    redis.set(sessionModeKey(id), mode),
    redis.zadd(SESSIONS_ACTIVE_KEY, { score: now, member: id }),
  ]);
  await Promise.all([publishSession(id, { messages: updated, mode }), publishSessions()]);

  return NextResponse.json({ ok: true });
}
