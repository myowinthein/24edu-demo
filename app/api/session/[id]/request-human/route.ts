import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey } from '@/lib/redis';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage, SessionMode } from '@/lib/types';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [current, messages] = await Promise.all([
    redis.get<SessionMode>(sessionModeKey(params.id)),
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
  ]);
  if (!current || current === 'ai') {
    await redis.set(sessionModeKey(params.id), 'requested');
    await Promise.all([publishSession(params.id, { messages: messages ?? [], mode: 'requested' }), publishSessions()]);
  }
  return NextResponse.json({ ok: true });
}
