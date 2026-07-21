import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey } from '@/lib/redis';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage } from '@/lib/types';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [, messages] = await Promise.all([
    redis.set(sessionModeKey(params.id), 'ai'),
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
  ]);
  await Promise.all([publishSession(params.id, { messages: messages ?? [], mode: 'ai' }), publishSessions()]);
  return NextResponse.json({ ok: true });
}
