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

// ── Layer 1: topic gate ───────────────────────────────────────────────────────
// Grounding only triggers when chunks are empty AND the message is about education.
const EDU_KEYWORDS = [
  'university', 'universities', 'college', 'colleges', 'course', 'courses',
  'program', 'programme', 'programs', 'programmes', 'degree', 'degrees',
  'diploma', 'bachelor', 'master', 'mba', 'phd', 'doctorate', 'postgraduate',
  'undergraduate', 'faculty', 'tuition', 'fee', 'fees', 'scholarship',
  'scholarships', 'intake', 'intakes', 'admission', 'admissions', 'application',
  'semester', 'credit', 'campus', 'campuses', 'student', 'students',
  'enroll', 'enrol', 'graduate', 'study', 'studies', 'academic', 'academics',
  'accredited', 'accreditation', 'school', 'institute', 'institution',
  'foundation', 'engineering', 'medicine', 'law', 'architecture', 'accounting',
  'finance', 'marketing', 'ranking', 'rankings', 'education',
];

function isEducationRelated(msg: string): boolean {
  const lower = msg.toLowerCase();
  return EDU_KEYWORDS.some((kw) => lower.includes(kw));
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: NextRequest) {
  const { message, sessionId, guestId, model, deviceInfo } = (await req.json()) as {
    message: string;
    sessionId: string;
    guestId?: string;
    model?: string;
    deviceInfo?: Record<string, string>;
  };

  if (!message || typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }
  if (guestId && !UUID_RE.test(guestId)) {
    return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
  }

  const now = Date.now();
  const [stored, storedMode] = await Promise.all([
    redis.get<SessionMessage[]>(sessionMessagesKey(sessionId)),
    redis.get<SessionMode>(sessionModeKey(sessionId)),
  ]);

  const messages = stored ?? [];
  const mode = storedMode ?? 'ai';
  const isFirstMessage = messages.length === 0;

  if (mode === 'ai' && !genAI) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

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

  const relevantChunks = await queryRelevantChunks(message);

  // Layer 1 gate: only ground when local data has no match AND topic is education-related.
  const useGrounding = relevantChunks.length === 0 && isEducationRelated(message);

  let systemInstruction: string;

  if (useGrounding) {
    // Layer 2: system prompt restricts the grounded search to education topics only.
    systemInstruction =
      'You are a university and higher education information assistant. ' +
      'Use your web search capability to find accurate, up-to-date information about universities, degree programs, tuition fees, scholarship opportunities, admission requirements, and intake dates. ' +
      'STRICT RESTRICTION: You must ONLY answer questions related to higher education — universities, colleges, programs, degrees, tuition, scholarships, intakes, admissions, and directly related education topics. ' +
      'If the user asks about anything unrelated to higher education (for example: stock prices, weather, news, sports, entertainment, recipes, or general knowledge), politely decline and explain that you can only assist with university and education-related inquiries. ' +
      'When citing web sources, include the source name in your response.';
  } else {
    systemInstruction =
      'You are a university program information assistant. ' +
      'You may ONLY answer questions using the data excerpts provided to you. ' +
      'You must NOT use your own training knowledge to answer any question — not for general facts, geography, current events, time, weather, or anything else outside the provided data. ' +
      'If a question is not answerable from the data excerpts, politely say the information is not available in the uploaded data and suggest the user contact the university directly.';

    if (relevantChunks.length > 0) {
      systemInstruction += '\n\nHere are the relevant data excerpts:\n\n';
      systemInstruction += relevantChunks.join('\n\n');
      systemInstruction +=
        '\n\nIMPORTANT: Only answer what is explicitly and directly stated in the excerpts above. ' +
        'If the specific detail requested (e.g. a specific fee, intake date, or program name) is not clearly present in the excerpts, say that this specific information is not available in the current data — do not infer, guess, or substitute with similar-looking data from other programs.';
    } else {
      systemInstruction +=
        '\n\nNo data sources are currently loaded. Let the user know they should upload a CSV or Excel file in the Sources section.';
    }
  }

  const modelName = model ?? 'gemini-3.1-flash-lite';
  const geminiModel = genAI!.getGenerativeModel({
    model: modelName,
    systemInstruction,
    ...(useGrounding
      ? {
          tools: [
            {
              googleSearchRetrieval: {
                dynamicRetrievalConfig: { dynamicThreshold: 0 },
              },
            },
          ],
        }
      : {}),
  });

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
