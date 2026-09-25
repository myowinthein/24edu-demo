import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis, sessionMessagesKey, sessionModelKey } from '@/lib/redis';
import { MODELS, DEFAULT_MODEL } from '@/app/chat/constants';
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

  const storedModel = await redis.get<string>(sessionModelKey(params.id));
  const modelName = (typeof storedModel === 'string' && (MODELS as readonly string[]).includes(storedModel))
    ? storedModel
    : DEFAULT_MODEL;

  // Silently retry with the remaining models in order if the selected one fails,
  // same one-attempt-per-model pattern as job-buddy's modelsToTry.
  const modelsToTry = [modelName, ...MODELS.filter((m) => m !== modelName)];

  let summary: string | undefined;
  let lastErr: unknown;
  for (const tryModel of modelsToTry) {
    const model = genAI.getGenerativeModel({
      model: tryModel,
      systemInstruction:
        'Summarize the following conversation in 3–5 concise bullet points. ' +
        'Cover: what the user was asking about, what information was provided, and any unresolved questions or next steps. ' +
        'Be brief and direct. Use plain bullet points (- item).',
    });
    try {
      const result = await model.generateContent(transcript);
      summary = result.response.text();
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (summary === undefined) {
    console.error('[summary] Gemini error:', lastErr);
    return NextResponse.json({ error: 'Failed to generate summary, please try again' }, { status: 500 });
  }

  return NextResponse.json({ summary });
}
