import { NextRequest } from 'next/server';
import { createSubscriber } from './pubsub';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export function createChannelSSE(channel: string, req: NextRequest): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sub = createSubscriber();
      sub.subscribe(channel);
      sub.on('message', (_ch: string, message: string) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });
      req.signal.addEventListener('abort', () => {
        sub.unsubscribe().then(() => sub.disconnect()).catch(console.error);
        controller.close();
      });
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
