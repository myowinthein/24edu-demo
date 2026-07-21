import { NextRequest } from 'next/server';
import { sessionChannel } from '@/lib/pubsub';
import { createChannelSSE } from '@/lib/sse';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return createChannelSSE(sessionChannel(params.id), req);
}
