import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionMessagesKey, sessionModeKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SessionMessage, SessionMode } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const [messages, mode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(id)),
    redis.get<SessionMode>(sessionModeKey(id)),
  ]);

  return NextResponse.json({ messages: messages ?? [], mode: mode ?? 'ai' });
}
