'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDeviceInfo } from '@/lib/device-info';
import type { SessionMessage, SessionMode } from '@/lib/types';
import { DEFAULT_MODEL, type ModelId, type SessionRow } from '@/app/chat/constants';
import { MessageList } from '@/app/chat/components/MessageList';
import { ChatInput } from '@/app/chat/components/ChatInput';
import { LeadForm } from '@/app/chat/components/LeadForm';
import { useUserArea } from '../UserAreaContext';

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
  const {
    guestId,
    sessions,
    setSessions,
    sessionsLoaded,
    leadSubmitted, setLeadSubmitted,
    setActiveSessionId,
    pendingSession, setPendingSession,
  } = useUserArea();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [mode, setMode] = useState<SessionMode>('ai');
  const [hasSources, setHasSources] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});
  const [adminTyping, setAdminTyping] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // One-time setup
  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
    fetch('/api/sources')
      .then((r) => r.json())
      .then((s) => setHasSources(Array.isArray(s) && s.length > 0))
      .catch(() => setHasSources(false));
  }, []);

  // Session initialization + pendingSession handling
  useEffect(() => {
    if (!guestId || !sessionsLoaded) return;

    if (!initialized.current) {
      initialized.current = true;
      if (pendingSession === 'new') {
        setPendingSession(null);
        setSessionId(crypto.randomUUID());
        setTimeout(() => textareaRef.current?.focus(), 0);
      } else if (pendingSession) {
        setPendingSession(null);
        setSessionId(pendingSession);
      } else {
        setSessionId(sessions.length > 0 ? sessions[0].id : crypto.randomUUID());
      }
    } else if (pendingSession) {
      const p = pendingSession;
      setPendingSession(null);
      if (p === 'new') {
        setSessionId(crypto.randomUUID());
        setMessages([]);
        setMode('ai');
        setInputText('');
        setSummary(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          setTimeout(() => textareaRef.current?.focus(), 0);
        }
      } else if (p !== sessionId) {
        setSessionId(p);
        setInputText('');
        setSummary(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    }
  }, [guestId, sessionsLoaded, sessions, pendingSession, setPendingSession, sessionId]);

  // Keep sidebar highlight in sync
  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId, setActiveSessionId]);

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

  const fetchSessions = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(`/api/guest/${guestId}/sessions`);
    if (!res.ok) return;
    setSessions((await res.json()) as SessionRow[]);
  }, [guestId, setSessions]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading || !sessionId || !guestId) return;

    const optimistic: SessionMessage = { role: 'guest', text, timestamp: new Date().toISOString() };
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
      if (isNewSession) fetchSessions();
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

  const endChat = async () => {
    if (!sessionId) return;
    await fetch(`/api/session/${sessionId}/end`, { method: 'POST' });
  };

  const summarize = async () => {
    if (!sessionId || summarizing) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/summary`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  // Lead form (layout hides sidebar automatically when leadSubmitted === false)
  if (leadSubmitted === false) {
    return <LeadForm guestId={guestId!} onComplete={() => setLeadSubmitted(true)} />;
  }

  const isReady = guestId !== null && sessionId !== null && hasSources !== null && leadSubmitted !== null;

  return (
    <>
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
          {summary !== null && (
            <div
              style={{
                flexShrink: 0,
                margin: '0 16px 4px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 10,
                padding: '10px 14px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Conversation Summary
                </span>
                <button
                  onClick={() => setSummary(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0 2px', fontSize: 18, lineHeight: 1, fontFamily: 'inherit' }}
                >
                  ×
                </button>
              </div>
              <div className="md-body" style={{ fontSize: 13, color: '#0c4a6e' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              </div>
            </div>
          )}
          <ChatInput
            inputText={inputText}
            isLoading={isLoading}
            summarizing={summarizing}
            hasMessages={messages.length > 0}
            selectedModel={selectedModel}
            mode={mode}
            textareaRef={textareaRef}
            onInputChange={setInputText}
            onSend={sendMessage}
            onRequestHuman={requestHuman}
            onSwitchToAI={switchToAI}
            onModelSelect={setSelectedModel}
            onSummarize={summarize}
            onEnd={endChat}
            onNewChat={() => setPendingSession('new')}
          />
        </>
      )}
    </>
  );
}
