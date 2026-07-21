'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { HistoryEntry } from '@/lib/types';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const LS_MESSAGES = 'chat:messages';
const LS_HISTORY = 'chat:history';

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage not available — keep in memory only
  }
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hasSources, setHasSources] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessages = lsGet<DisplayMessage[]>(LS_MESSAGES);
    const storedHistory = lsGet<HistoryEntry[]>(LS_HISTORY);
    if (storedMessages) setMessages(storedMessages);
    if (storedHistory) setHistory(storedHistory);
  }, []);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => r.json())
      .then((sources) => setHasSources(Array.isArray(sources) && sources.length > 0))
      .catch(() => setHasSources(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    const prevHistory = [...history];

    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: prevHistory }),
      });

      if (!resp.ok) throw new Error('API error');
      const data = (await resp.json()) as { text: string };

      const aiMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.text,
      };

      const finalMessages = [...updatedMessages, aiMsg];
      const finalHistory: HistoryEntry[] = [
        ...prevHistory,
        { role: 'user', text },
        { role: 'assistant', text: data.text },
      ];

      setMessages(finalMessages);
      setHistory(finalHistory);
      lsSet(LS_MESSAGES, finalMessages);
      lsSet(LS_HISTORY, finalHistory);
    } catch {
      const errMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Something went wrong. Please try again.',
      };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasSources === null) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 14, color: '#9ca3af' }}>Loading…</div>
      </div>
    );
  }

  if (!hasSources) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 15, color: '#6b7280', maxWidth: 340 }}>
          No data sources have been uploaded yet. Add a source to start chatting.
        </div>
        <button
          onClick={() => router.push('/sources')}
          style={{
            padding: '9px 16px',
            fontSize: 14,
            fontWeight: 500,
            background: '#111827',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Go to Sources
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: 520,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 15,
                lineHeight: 1.5,
                background: msg.role === 'user' ? '#f1f1f3' : '#ffffff',
                border: msg.role === 'user' ? 'none' : '1px solid #e3e3e6',
                color: '#14151a',
              }}
            >
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                {msg.role === 'user' ? 'You' : 'AI'}
              </div>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                maxWidth: 520,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 15,
                background: '#ffffff',
                border: '1px solid #e3e3e6',
                color: '#9ca3af',
              }}
            >
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>AI</div>
              Thinking…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #e3e3e6',
          padding: '16px 20px',
          display: 'flex',
          gap: 10,
        }}
      >
        <input
          type="text"
          placeholder="Message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 15,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            outline: 'none',
            color: '#14151a',
            fontFamily: 'inherit',
            background: '#ffffff',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputText.trim()}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 500,
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !inputText.trim() ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
