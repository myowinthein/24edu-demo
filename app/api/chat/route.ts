import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis, SOURCES_KEY } from '@/lib/redis';
import type { SourceEntry, HistoryEntry } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const { message, history } = (await req.json()) as {
    message: string;
    history: HistoryEntry[];
  };

  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];

  let systemInstruction =
    'You are a helpful data analyst assistant. Answer questions concisely and clearly. ';

  if (sources.length > 0) {
    systemInstruction +=
      'You have access to the following uploaded data sources:\n\n';
    for (const src of sources) {
      systemInstruction += `=== ${src.filename} (${src.rowCount} rows) ===\n${src.csv}\n\n`;
    }
    systemInstruction +=
      'Base your answers on this data. If the question cannot be answered from the data, say so.';
  } else {
    systemInstruction +=
      'No data sources are currently loaded. Let the user know they should upload a CSV or Excel file in the Sources section.';
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction,
  });

  // Convert stored history (last 20 entries) to Gemini format, excluding current message
  const recentHistory = history.slice(-20);
  const geminiHistory = recentHistory.map((entry) => ({
    role: entry.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: entry.text }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(message);
  const text = result.response.text();

  return NextResponse.json({ text });
}
