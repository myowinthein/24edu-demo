import { NextRequest } from 'next/server';
import { createSubscriber, sessionChannel } from '@/lib/pubsub';
import { verifyAdminToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const channel = sessionChannel(params.id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sub = createSubscriber();
      sub.subscribe(channel);
      sub.on('message', (_channel: string, message: string) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });
      req.signal.addEventListener('abort', () => {
        sub.unsubscribe().then(() => sub.disconnect());
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
