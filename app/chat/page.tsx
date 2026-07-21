'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDeviceInfo } from '@/lib/device-info';
import type { SessionMessage, SessionMode } from '@/lib/types';
import { DEFAULT_MODEL, type ModelId, type SessionRow } from './constants';
import { ChatSidebar } from './components/ChatSidebar';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';

const LS_GUEST_ID = 'chat:guestId';

function getOrCreateGuestId(): string {
  try {
    const stored = localStorage.getItem(LS_GUEST_ID);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(LS_GUEST_ID, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export default function ChatPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [mode, setMode] = useState<SessionMode>('ai');
  const [hasSources, setHasSources] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGuestId(getOrCreateGuestId());
    setDeviceInfo(getDeviceInfo());
  }, []);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => r.json())
      .then((s) => setHasSources(Array.isArray(s) && s.length > 0))
      .catch(() => setHasSources(false));
  }, []);

  const fetchSessions = useCallback(async (gid: string) => {
    const res = await fetch(`/api/guest/${gid}/sessions`);
    if (!res.ok) return [];
    return (await res.json()) as SessionRow[];
  }, []);

  useEffect(() => {
    if (!guestId) return;
    fetchSessions(guestId).then((list) => {
      setSessions(list);
      if (list.length > 0) {
        setSessionId(list[0].id);
      } else {
        setSessionId(crypto.randomUUID());
      }
    });
  }, [guestId, fetchSessions]);

  const fetchSession = useCallback(async (id: string) => {
    const res = await fetch(`/api/session/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: SessionMessage[]; mode: SessionMode };
    setMessages(data.messages);
    setMode(data.mode);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setMessages([]);
    setMode('ai');
    fetchSession(sessionId);
  }, [sessionId, fetchSession]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let es: EventSource | null = null;
    const connect = () => {
      if (!active) return;
      es = new EventSource(`/api/session/${sessionId}/stream`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.typing) {
            setAdminTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000);
          } else {
            setMessages(data.messages);
            setMode(data.mode);
            setAdminTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          }
        } catch (e) { console.error('SSE parse error', e); }
      };
      es.onerror = () => { es?.close(); if (active) setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      active = false;
      es?.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const newChat = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setMode('ai');
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const switchSession = (id: string) => {
    if (id === sessionId) return;
    setSessionId(id);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading || !sessionId || !guestId) return;

    const optimistic: SessionMessage = {
      role: 'guest',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    const isNewSession = !sessions.find((s) => s.id === sessionId);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, guestId, model: selectedModel, deviceInfo }),
      });
      if (!resp.ok) throw new Error('API error');
      await resp.json();
      if (isNewSession && guestId) {
        fetchSessions(guestId).then(setSessions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Something went wrong. Please try again.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const requestHuman = async () => {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/request-human`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    });
  };

  const switchToAI = async () => {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/switch-ai`, { method: 'POST' });
  };

  const isReady = guestId !== null && sessionId !== null && hasSources !== null;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        sessions={sessions}
        sessionId={sessionId}
        onNewChat={newChat}
        onSwitchSession={switchSession}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            flexShrink: 0,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 20px',
            borderBottom: '1px solid #e3e3e6',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            <Link
              href="/chat"
              style={{
                padding: '7px 13px',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                color: '#14151a',
                background: '#f1f1f3',
                textDecoration: 'none',
              }}
            >
              💬 Chat
            </Link>
          </div>
        </div>

        {!isReady ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 14 }}>
              <SpinnerIcon />
              Loading chat…
            </div>
          </div>
        ) : !hasSources && mode === 'ai' ? (
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
        ) : (
          <>
            <MessageList
              messages={messages}
              mode={mode}
              isLoading={isLoading}
              adminTyping={adminTyping}
              messagesEndRef={messagesEndRef}
            />
            <ChatInput
              inputText={inputText}
              isLoading={isLoading}
              selectedModel={selectedModel}
              mode={mode}
              textareaRef={textareaRef}
              onInputChange={setInputText}
              onSend={sendMessage}
              onRequestHuman={requestHuman}
              onSwitchToAI={switchToAI}
              onModelSelect={setSelectedModel}
            />
          </>
        )}
      </div>
    </div>
  );
}
