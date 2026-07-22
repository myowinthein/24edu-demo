import { NextRequest, NextResponse } from 'next/server';
import { SESSIONS_CHANNEL } from '@/lib/pubsub';
import { createChannelSSE } from '@/lib/sse';
import { verifyAdminToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return createChannelSSE(SESSIONS_CHANNEL, req);
}
