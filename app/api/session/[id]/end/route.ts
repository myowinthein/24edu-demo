import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey, sessionMetaKey } from '@/lib/redis';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage, SessionMeta } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { guestId?: string };

  const [messages, meta] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
    redis.get<SessionMeta>(sessionMetaKey(params.id)),
  ]);

  if (!messages) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (body.guestId && meta?.guestId && body.guestId !== meta.guestId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await redis.set(sessionModeKey(params.id), 'ended');
  await Promise.all([
    publishSession(params.id, { messages, mode: 'ended' }),
    publishSessions(),
  ]);
  return NextResponse.json({ ok: true });
}
