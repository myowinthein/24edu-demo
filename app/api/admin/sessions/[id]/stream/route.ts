import { NextRequest } from 'next/server';
import { sessionChannel } from '@/lib/pubsub';
import { createChannelSSE } from '@/lib/sse';
import { verifyAdminToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyAdminToken(req))) {
    return new Response('Unauthorized', { status: 401 });
  }
  return createChannelSSE(sessionChannel(params.id), req);
}
