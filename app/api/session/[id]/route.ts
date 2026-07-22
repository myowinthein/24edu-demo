import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionMessagesKey, sessionModeKey } from '@/lib/redis';
import type { SessionMessage, SessionMode } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }
  const [messages, mode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(id)),
    redis.get<SessionMode>(sessionModeKey(id)),
  ]);
  return NextResponse.json({ messages: messages ?? [], mode: mode ?? 'ai' });
}
