import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis, sessionMessagesKey } from '@/lib/redis';
import { DEFAULT_MODEL } from '@/app/chat/constants';
import type { SessionMessage } from '@/lib/types';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }
  if (!genAI) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const messages = await redis.get<SessionMessage[]>(sessionMessagesKey(params.id));
  if (!messages || messages.length === 0) {
    return NextResponse.json({ summary: 'No messages in this session yet.' });
  }

  const transcript = messages
    .map((m) => {
      const speaker = m.role === 'guest' ? 'User' : m.role === 'ai' ? 'AI' : 'Support';
      return `${speaker}: ${m.text}`;
    })
    .join('\n');

  try {
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      systemInstruction:
        'Summarize the following conversation in 3–5 concise bullet points. ' +
        'Cover: what the user was asking about, what information was provided, and any unresolved questions or next steps. ' +
        'Be brief and direct. Use plain bullet points (- item).',
    });

    const result = await model.generateContent(transcript);
    return NextResponse.json({ summary: result.response.text() });
  } catch (err) {
    console.error('[summary] Gemini error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
