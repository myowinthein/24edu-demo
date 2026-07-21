import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  redis,
  SESSIONS_ACTIVE_KEY,
  sessionMessagesKey,
  sessionModeKey,
  sessionMetaKey,
  guestSessionsKey,
} from '@/lib/redis';
import { publishSession, publishSessions } from '@/lib/pubsub';
import { queryRelevantChunks } from '@/lib/vector';
import type { SessionMessage, SessionMode } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { message, sessionId, guestId, model, deviceInfo } = (await req.json()) as {
    message: string;
    sessionId: string;
    guestId?: string;
    model?: string;
    deviceInfo?: Record<string, string>;
  };

  const now = Date.now();
  const [stored, storedMode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(sessionId)),
    redis.get<SessionMode>(sessionModeKey(sessionId)),
  ]);

  const messages = stored ?? [];
  const mode = storedMode ?? 'ai';
  const isFirstMessage = messages.length === 0;

  messages.push({ role: 'guest', text: message, timestamp: new Date().toISOString() });

  const extraWrites: Promise<unknown>[] = [];
  if (guestId) {
    extraWrites.push(redis.zadd(guestSessionsKey(guestId), { score: now, member: sessionId }));
    if (isFirstMessage) {
      const title = message.length > 40 ? message.slice(0, 40) + '…' : message;
      extraWrites.push(
        redis.set(sessionMetaKey(sessionId), {
          title,
          createdAt: new Date().toISOString(),
          guestId,
          ...(deviceInfo ?? {}),
        })
      );
    }
  }

  await Promise.all([
    redis.set(sessionMessagesKey(sessionId), messages),
    redis.zadd(SESSIONS_ACTIVE_KEY, { score: now, member: sessionId }),
    ...(!storedMode ? [redis.set(sessionModeKey(sessionId), 'ai')] : []),
    ...extraWrites,
  ]);

  await Promise.all([publishSession(sessionId, { messages, mode }), publishSessions()]);

  if (mode !== 'ai') {
    return NextResponse.json({ waiting: true });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const relevantChunks = await queryRelevantChunks(message);

  let systemInstruction =
    'You are a helpful data analyst assistant. Answer questions concisely and clearly. ';

  if (relevantChunks.length > 0) {
    systemInstruction += 'Answer based on the following relevant data excerpts:\n\n';
    systemInstruction += relevantChunks.join('\n\n');
    systemInstruction += '\n\nIf the question cannot be answered from this data, say so.';
  } else {
    systemInstruction +=
      'No data sources are currently loaded. Let the user know they should upload a CSV or Excel file in the Sources section.';
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = model ?? 'gemini-3.1-flash-lite';
  const geminiModel = genAI.getGenerativeModel({ model: modelName, systemInstruction });

  // Build Gemini history from stored messages (exclude the message just sent)
  const geminiHistory = messages
    .slice(0, -1)
    .filter((m) => m.role === 'guest' || m.role === 'ai')
    .slice(-20)
    .map((m) => ({
      role: m.role === 'guest' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  const chat = geminiModel.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(message);
  const text = result.response.text();

  messages.push({ role: 'ai', text, timestamp: new Date().toISOString() });
  await redis.set(sessionMessagesKey(sessionId), messages);
  await Promise.all([publishSession(sessionId, { messages, mode: 'ai' }), publishSessions()]);

  return NextResponse.json({ text });
}
