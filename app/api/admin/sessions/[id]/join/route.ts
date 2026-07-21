import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey } from '@/lib/redis';
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
  const [, messages] = await Promise.all([
    redis.set(sessionModeKey(params.id), 'human'),
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
  ]);
  await Promise.all([publishSession(params.id, { messages: messages ?? [], mode: 'human' }), publishSessions()]);
  return NextResponse.json({ ok: true });
}
