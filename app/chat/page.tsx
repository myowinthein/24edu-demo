'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { formatRelativeTime, formatDate } from '@/lib/format';
import { getDeviceInfo } from '@/lib/device-info';
import type { SessionMessage, SessionMode } from '@/lib/types';

const LS_GUEST_ID = 'chat:guestId';

const MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
] as const;
type ModelId = (typeof MODELS)[number];
const DEFAULT_MODEL: ModelId = 'gemini-3.1-flash-lite';

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

interface SessionRow {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isChat = pathname.startsWith('/chat');

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
  const [openPopover, setOpenPopover] = useState<'actions' | 'model' | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (openPopover === 'actions' && !actionsContainerRef.current?.contains(target)) {
        setOpenPopover(null);
      }
      if (openPopover === 'model' && !modelContainerRef.current?.contains(target)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

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
        } catch {}
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
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
    setOpenPopover(null);
    await fetch(`/api/session/${sessionId}/request-human`, { method: 'POST' });
  };

  const switchToAI = async () => {
    if (!sessionId) return;
    setOpenPopover(null);
    await fetch(`/api/session/${sessionId}/switch-ai`, { method: 'POST' });
  };

  const roleLabel: Record<SessionMessage['role'], string> = {
    guest: 'You',
    ai: 'AI',
    admin: 'Support',
  };

  const isReady = guestId !== null && sessionId !== null && hasSources !== null;

  const navLinkStyle = (active: boolean) => ({
    padding: '7px 13px',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
    color: active ? '#14151a' : '#6b7280',
    background: active ? '#f1f1f3' : 'transparent',
    textDecoration: 'none' as const,
  });

  const popoverItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '9px 12px',
    fontSize: 13,
    border: 'none',
    borderRadius: 7,
    background: 'transparent',
    cursor: 'pointer',
    color: '#14151a',
    fontFamily: 'inherit',
  };

  const toolbarBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 11px',
    fontSize: 12,
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: 20,
    cursor: 'pointer',
    color: '#6b7280',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* ── Sidebar (full page height) ── */}
      <div
        style={{
          width: sidebarOpen ? 260 : 48,
          flexShrink: 0,
          borderRight: '1px solid #e3e3e6',
          display: 'flex',
          flexDirection: 'column',
          background: '#f9fafb',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Brand row (visually aligns with top nav height) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            padding: '0 12px',
            height: 56,
            flexShrink: 0,
            borderBottom: '1px solid #e3e3e6',
          }}
        >
          {sidebarOpen && (
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
              Internal Demo
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid #e3e3e6',
              borderRadius: 6,
              background: '#ffffff',
              cursor: 'pointer',
              flexShrink: 0,
              color: '#6b7280',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        {sidebarOpen && (
          <>
            <div style={{ padding: '10px 10px 6px' }}>
              <button
                onClick={newChat}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  background: '#111827',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                }}
              >
                + New chat
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
              {sessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => switchSession(s.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: 7,
                      border: isActive ? '1px solid #d1d5db' : '1px solid transparent',
                      cursor: 'pointer',
                      marginBottom: 3,
                      background: isActive ? '#ffffff' : 'transparent',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: '#9ca3af',
                        letterSpacing: '0.03em',
                      }}
                    >
                      #{s.id.slice(0, 8)}
                    </span>
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isActive ? '#111827' : '#374151',
                      }}
                    >
                      {s.title}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {formatDate(s.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · {formatRelativeTime(s.lastActiveAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Right column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Top nav strip */}
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
            <Link href="/chat" style={navLinkStyle(isChat)}>💬 Chat</Link>
          </div>
        </div>

        {/* Chat body */}
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
            {/* Mode banners */}
            {mode === 'requested' && (
              <div
                style={{
                  flexShrink: 0,
                  background: '#fef3c7',
                  borderBottom: '1px solid #fde68a',
                  padding: '8px 20px',
                  fontSize: 13,
                  color: '#92400e',
                  textAlign: 'center',
                }}
              >
                Waiting for a support agent to join…
              </div>
            )}
            {mode === 'human' && (
              <div
                style={{
                  flexShrink: 0,
                  background: '#d1fae5',
                  borderBottom: '1px solid #a7f3d0',
                  padding: '8px 20px',
                  fontSize: 13,
                  color: '#065f46',
                  textAlign: 'center',
                }}
              >
                You are now chatting with a support agent.
              </div>
            )}

            {/* Messages */}
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
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'guest' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: 520,
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: 15,
                      lineHeight: 1.5,
                      background:
                        msg.role === 'guest' ? '#f1f1f3'
                        : msg.role === 'admin' ? '#eff6ff'
                        : '#ffffff',
                      border:
                        msg.role === 'guest' ? 'none'
                        : msg.role === 'admin' ? '1px solid #bfdbfe'
                        : '1px solid #e3e3e6',
                      color: '#14151a',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                      {roleLabel[msg.role]}
                    </div>
                    {msg.role === 'ai' || msg.role === 'admin' ? (
                      <div className="md-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}

              {adminTyping && mode === 'human' && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: 15,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#9ca3af',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Support</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 200, 400].map((delay) => (
                        <span
                          key={delay}
                          style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#93c5fd',
                            display: 'inline-block',
                            animation: 'pulse 1.2s ease-in-out infinite',
                            animationDelay: `${delay}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isLoading && mode === 'ai' && (
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

            {/* ── Input area ── */}
            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid #e3e3e6',
                padding: '12px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Textarea + Send */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={textareaRef}
                  placeholder="Message… (Enter to send, Shift+Enter for new line)"
                  value={inputText}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isLoading}
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: 15,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    minHeight: 42,
                    maxHeight: 120,
                    overflowY: 'auto',
                    color: '#14151a',
                    background: '#ffffff',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputText.trim()}
                  style={{
                    padding: '0 18px',
                    fontSize: 14,
                    fontWeight: 500,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !inputText.trim() ? 0.6 : 1,
                    flexShrink: 0,
                    height: 42,
                  }}
                >
                  Send
                </button>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Quick actions trigger */}
                <div ref={actionsContainerRef} style={{ position: 'relative' }}>
                  {openPopover === 'actions' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: 0,
                        background: '#ffffff',
                        border: '1px solid #e3e3e6',
                        borderRadius: 10,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        minWidth: 210,
                        padding: 6,
                        zIndex: 20,
                      }}
                    >
                      {mode === 'ai' && (
                        <button onClick={requestHuman} style={popoverItemStyle}>
                          💬 Talk to a human
                        </button>
                      )}
                      {(mode === 'requested' || mode === 'human') && (
                        <button onClick={switchToAI} style={popoverItemStyle}>
                          🤖 Switch back to AI
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setOpenPopover((p) => (p === 'actions' ? null : 'actions'))}
                    style={{
                      ...toolbarBtnStyle,
                      borderColor: openPopover === 'actions' ? '#6b7280' : '#d1d5db',
                      color: openPopover === 'actions' ? '#14151a' : '#6b7280',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Actions
                  </button>
                </div>

                {/* Model picker trigger */}
                <div ref={modelContainerRef} style={{ position: 'relative' }}>
                  {openPopover === 'model' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: 0,
                        background: '#ffffff',
                        border: '1px solid #e3e3e6',
                        borderRadius: 10,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        minWidth: 230,
                        padding: 6,
                        zIndex: 20,
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 12px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#9ca3af',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Model
                      </div>
                      {MODELS.map((m) => (
                        <button
                          key={m}
                          onClick={() => { setSelectedModel(m); setOpenPopover(null); }}
                          style={{
                            ...popoverItemStyle,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: m === selectedModel ? 600 : 400,
                            color: m === selectedModel ? '#2563eb' : '#14151a',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: `2px solid ${m === selectedModel ? '#2563eb' : '#d1d5db'}`,
                              background: m === selectedModel ? '#2563eb' : 'transparent',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {m === selectedModel && (
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff', display: 'block' }} />
                            )}
                          </span>
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setOpenPopover((p) => (p === 'model' ? null : 'model'))}
                    style={{
                      ...toolbarBtnStyle,
                      borderColor: openPopover === 'model' ? '#6b7280' : '#d1d5db',
                      color: openPopover === 'model' ? '#14151a' : '#6b7280',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                    </svg>
                    {selectedModel}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
