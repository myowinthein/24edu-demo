import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey, sessionMetaKey } from '@/lib/redis';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage, SessionMode, SessionMeta } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({})) as { guestId?: string };

  const [current, messages, meta] = await Promise.all([
    redis.get<SessionMode>(sessionModeKey(params.id)),
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
    redis.get<SessionMeta>(sessionMetaKey(params.id)),
  ]);

  if (body.guestId && meta?.guestId && body.guestId !== meta.guestId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!current || current === 'ai') {
    await redis.set(sessionModeKey(params.id), 'requested');
    await Promise.all([publishSession(params.id, { messages: messages ?? [], mode: 'requested' }), publishSessions()]);
  }
  return NextResponse.json({ ok: true });
}
