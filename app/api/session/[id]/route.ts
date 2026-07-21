import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionMessagesKey, sessionModeKey } from '@/lib/redis';
import type { SessionMessage, SessionMode } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const [messages, mode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(id)),
    redis.get<SessionMode>(sessionModeKey(id)),
  ]);
  return NextResponse.json({ messages: messages ?? [], mode: mode ?? 'ai' });
}
