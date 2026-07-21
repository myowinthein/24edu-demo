import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionMessagesKey, sessionModeKey, SESSIONS_ACTIVE_KEY } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { text } = (await req.json()) as { text: string };

  const messages = (await redis.get<SessionMessage[]>(sessionMessagesKey(id))) ?? [];
  messages.push({ role: 'admin', text, timestamp: new Date().toISOString() });

  const now = Date.now();
  await Promise.all([
    redis.set(sessionMessagesKey(id), messages),
    redis.set(sessionModeKey(id), 'human'),
    redis.zadd(SESSIONS_ACTIVE_KEY, { score: now, member: id }),
  ]);
  await Promise.all([publishSession(id, { messages, mode: 'human' }), publishSessions()]);

  return NextResponse.json({ ok: true });
}
