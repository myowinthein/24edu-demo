import { NextRequest, NextResponse } from 'next/server';
import { redis, sessionModeKey, sessionMessagesKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import { publishSession, publishSessions } from '@/lib/pubsub';
import type { SessionMessage } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [, messages] = await Promise.all([
    redis.set(sessionModeKey(params.id), 'ai'),
    redis.get<SessionMessage[]>(sessionMessagesKey(params.id)),
  ]);
  await Promise.all([publishSession(params.id, { messages: messages ?? [], mode: 'ai' }), publishSessions()]);
  return NextResponse.json({ ok: true });
}
