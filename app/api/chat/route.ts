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
import { MODELS, DEFAULT_MODEL } from '@/app/chat/constants';
import type { SessionMessage, SessionMode } from '@/lib/types';
import {
  PROMPT_LOCAL_DATA,
  PROMPT_LOCAL_DATA_SUFFIX_FOUND,
  PROMPT_LOCAL_DATA_SUFFIX_EMPTY,
  PROMPT_GROUNDING_ONLY,
  PROMPT_GROUNDING_WITH_CONTEXT,
} from '@/lib/prompts';

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
  // \buni\b catches "uni" as a standalone word (common shorthand for "university")
  // without false-positives from words like "unique", "reunify", "unit".
  return /\buni\b/.test(lower) || EDU_KEYWORDS.some((kw) => lower.includes(kw));
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

  // Check recent guest messages too so follow-up questions ("can you search online?")
  // inherit the education topic context from earlier in the session.
  const recentContext = messages
    .filter((m) => m.role === 'guest')
    .slice(-4)
    .map((m) => m.text)
    .join(' ');
  const eduRelated = isEducationRelated(message + ' ' + recentContext);

  // Contact queries (email, phone, website) always need web search — program CSVs
  // never contain this kind of detail, so grounding fires even when local chunks exist.
  const isContactQuery = /\b(email|e-mail|phone|telephone|hotline|website|homepage|web address|contact)\b/i.test(message);

  const useGrounding = eduRelated && (relevantChunks.length === 0 || isContactQuery);

  let systemInstruction: string;

  if (useGrounding && relevantChunks.length > 0) {
    // Chunks found but user wants contact info: provide program context + web search.
    systemInstruction =
      PROMPT_GROUNDING_WITH_CONTEXT +
      '\n\nHere are the relevant data excerpts for context:\n\n' +
      relevantChunks.join('\n\n');
  } else if (useGrounding) {
    // No local match: web search is the primary source.
    // Layer 2: system prompt restricts the grounded search to education topics only.
    systemInstruction = PROMPT_GROUNDING_ONLY;
  } else {
    systemInstruction = PROMPT_LOCAL_DATA;
    if (relevantChunks.length > 0) {
      systemInstruction += '\n\nHere are the relevant data excerpts:\n\n';
      systemInstruction += relevantChunks.join('\n\n');
      systemInstruction += PROMPT_LOCAL_DATA_SUFFIX_FOUND;
    } else {
      systemInstruction += PROMPT_LOCAL_DATA_SUFFIX_EMPTY;
    }
  }

  const modelName = (typeof model === 'string' && (MODELS as readonly string[]).includes(model))
    ? model
    : DEFAULT_MODEL;
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
  let text: string;
  try {
    const result = await chat.sendMessage(message);
    text = result.response.text();
  } catch (err) {
    console.error('[chat] Gemini error:', err);
    const isQuota = String(err).includes('429') || String(err).includes('quota');
    const message = isQuota
      ? 'Request limit reached. Please wait a moment and try again.'
      : 'AI temporarily unavailable, please try again.';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  messages.push({ role: 'ai', text, timestamp: new Date().toISOString() });
  await redis.set(sessionMessagesKey(sessionId), messages);
  await Promise.all([publishSession(sessionId, { messages, mode: 'ai' }), publishSessions()]);

  return NextResponse.json({ text });
}
