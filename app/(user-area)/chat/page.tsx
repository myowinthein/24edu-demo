'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDeviceInfo, type DeviceInfo } from '@/lib/device-info';
import { useEventSource } from '@/lib/use-event-source';
import type { SessionMessage, SessionMode } from '@/lib/types';
import { DEFAULT_MODEL, type ModelId, type SessionRow } from '@/app/chat/constants';
import { MessageList } from '@/app/chat/components/MessageList';
import { ChatInput } from '@/app/chat/components/ChatInput';
import { LeadForm } from '@/app/chat/components/LeadForm';
import { SpinnerIcon } from '@/app/chat/components/SpinnerIcon';
import { useUserArea } from '../UserAreaContext';

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
  const [deviceInfo, setDeviceInfo] = useState<Partial<DeviceInfo>>({});
  const [adminTyping, setAdminTyping] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // One-time setup
  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
    const ac = new AbortController();
    fetch('/api/sources', { signal: ac.signal })
      .then((r) => r.json())
      .then((s) => setHasSources(Array.isArray(s) && s.length > 0))
      .catch(() => setHasSources(false));
    return () => ac.abort();
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

  const fetchSession = useCallback(async (id: string, signal?: AbortSignal) => {
    const res = await fetch(`/api/session/${id}`, { signal });
    if (!res.ok) return;
    const data = (await res.json()) as { messages: SessionMessage[]; mode: SessionMode };
    setMessages(data.messages);
    setMode(data.mode);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setMessages([]);
    setMode('ai');
    const ac = new AbortController();
    fetchSession(sessionId, ac.signal).catch(() => {});
    return () => ac.abort();
  }, [sessionId, fetchSession]);

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, [sessionId]);

  useEventSource(sessionId ? `/api/session/${sessionId}/stream` : null, (e) => {
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
    } catch (err) { console.error('SSE parse error', err); }
  });

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
    if (isNewSession && sessionId) {
      const now = new Date().toISOString();
      setSessions((prev) => [
        { id: sessionId, title: text.length > 50 ? text.slice(0, 47) + '…' : text, createdAt: now, lastActiveAt: now, mode: 'ai' },
        ...prev,
      ]);
    }
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, guestId, model: selectedModel, deviceInfo }),
      });
      if (!resp.ok) throw new Error('API error');
      await resp.json();
      if (isNewSession) fetchSessions().catch(console.error);
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
    setActionError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/request-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId }),
      });
      if (!res.ok) setActionError('Failed to request a human agent. Please try again.');
    } catch {
      setActionError('Network error. Failed to request a human agent.');
    }
  };

  const switchToAI = async () => {
    if (!sessionId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/switch-ai`, { method: 'POST' });
      if (!res.ok) setActionError('Failed to switch back to AI. Please try again.');
    } catch {
      setActionError('Network error. Failed to switch back to AI.');
    }
  };

  const endChat = async () => {
    if (!sessionId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/end`, { method: 'POST' });
      if (!res.ok) setActionError('Failed to end the chat. Please try again.');
    } catch {
      setActionError('Network error. Failed to end the chat.');
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 14 }}>
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
          <div style={{ fontSize: 15, color: 'var(--text-3)', maxWidth: 340 }}>
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
          {actionError && (
            <div
              style={{
                flexShrink: 0,
                margin: '0 16px 4px',
                padding: '8px 12px',
                fontSize: 13,
                color: '#dc2626',
                background: 'rgba(220,38,38,0.08)',
                borderRadius: 8,
              }}
            >
              {actionError}
            </div>
          )}
          {summary !== null && (
            <div
              style={{
                flexShrink: 0,
                margin: '0 16px 4px',
                background: 'var(--info-bg)',
                border: '1px solid var(--info-br)',
                borderRadius: 10,
                padding: '10px 14px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--info-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Conversation Summary
                </span>
                <button
                  onClick={() => setSummary(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 2px', fontSize: 18, lineHeight: 1, fontFamily: 'inherit' }}
                >
                  ×
                </button>
              </div>
              <div className="md-body" style={{ fontSize: 13, color: 'var(--info-body)' }}>
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
