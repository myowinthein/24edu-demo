'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import type { SessionMessage, SessionMode } from '@/lib/types';

export default function AdminSessionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [mode, setMode] = useState<SessionMode>('ai');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef(0);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/admin/sessions/${id}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages);
    setMode(data.mode);
  }, [id, router]);

  useEffect(() => {
    fetchSession();
    let active = true;
    let es: EventSource | null = null;
    const connect = () => {
      if (!active) return;
      es = new EventSource(`/api/admin/sessions/${id}/stream`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.typing) return;
          setMessages(data.messages);
          setMode(data.mode);
        } catch {}
      };
      es.onerror = () => { es?.close(); if (active) setTimeout(connect, 3000); };
    };
    connect();
    return () => { active = false; es?.close(); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close popover on outside click
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setOpenPopover(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    if (mode === 'human') {
      const now = Date.now();
      if (now - lastTypingSentRef.current > 1500) {
        lastTypingSentRef.current = now;
        fetch(`/api/admin/sessions/${id}/typing`, { method: 'POST' });
      }
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending || mode !== 'human') return;
    setSending(true);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await fetch(`/api/admin/sessions/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } finally {
      setSending(false);
    }
  };

  const takeOver = async () => {
    setOpenPopover(false);
    await fetch(`/api/admin/sessions/${id}/join`, { method: 'POST' });
  };

  const handBack = async () => {
    setOpenPopover(false);
    await fetch(`/api/admin/sessions/${id}/leave`, { method: 'POST' });
  };

  const roleLabel: Record<SessionMessage['role'], string> = {
    guest: 'Guest', ai: 'AI', admin: 'You',
  };

  const toolbarBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', fontSize: 12,
    background: 'transparent', border: '1px solid #d1d5db',
    borderRadius: 20, cursor: 'pointer', color: '#6b7280',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };

  const popoverItemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '9px 12px', fontSize: 13, border: 'none',
    borderRadius: 7, background: 'transparent',
    cursor: 'pointer', color: '#14151a', fontFamily: 'inherit',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Human-requested banner */}
      {mode === 'requested' && (
        <div
          style={{
            flexShrink: 0,
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🙋</span>
            <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
              Guest requested human support
            </span>
          </div>
          <button
            onClick={takeOver}
            style={{
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Accept &amp; join
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: 20,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {messages.map((msg) => (
          <div
            key={`${msg.timestamp}-${msg.role}`}
            style={{ display: 'flex', justifyContent: msg.role === 'guest' ? 'flex-start' : 'flex-end' }}
          >
            <div
              style={{
                maxWidth: 520, padding: '9px 13px', borderRadius: 10,
                fontSize: 14, lineHeight: 1.5,
                background: msg.role === 'guest' ? '#ffffff' : msg.role === 'ai' ? '#f0f4ff' : '#f1f1f3',
                border: msg.role === 'guest' ? '1px solid #e3e3e6' : 'none',
                color: '#14151a',
              }}
            >
              <div style={{ fontSize: 11, marginBottom: 3, color: '#9ca3af' }}>
                {roleLabel[msg.role]}
              </div>
              {msg.role === 'ai' ? (
                <div className="md-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          flexShrink: 0, borderTop: '1px solid #e3e3e6',
          padding: '12px 20px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {/* Textarea + Send */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            placeholder={mode === 'human' ? 'Reply as admin… (Enter to send)' : 'Observing — use Actions to take over'}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            disabled={sending || mode !== 'human'}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', fontSize: 14,
              border: '1px solid #d1d5db', borderRadius: 8,
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              lineHeight: 1.5, minHeight: 42, maxHeight: 120, overflowY: 'auto',
              color: '#14151a', background: mode !== 'human' ? '#f9fafb' : '#ffffff',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !inputText.trim() || mode !== 'human'}
            style={{
              padding: '0 18px', fontSize: 14, fontWeight: 500,
              background: '#2563eb', color: '#ffffff', border: 'none',
              borderRadius: 8, flexShrink: 0, height: 42, fontFamily: 'inherit',
              cursor: sending || !inputText.trim() || mode !== 'human' ? 'not-allowed' : 'pointer',
              opacity: sending || !inputText.trim() || mode !== 'human' ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div ref={actionsRef} style={{ position: 'relative' }}>
            {openPopover && (
              <div
                style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                  background: '#ffffff', border: '1px solid #e3e3e6',
                  borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  minWidth: 210, padding: 6, zIndex: 20,
                }}
              >
                {(mode === 'ai' || mode === 'requested') && (
                  <button onClick={takeOver} style={popoverItemStyle}>
                    🎯 Take over chat
                  </button>
                )}
                {mode === 'human' && (
                  <button onClick={handBack} style={popoverItemStyle}>
                    🤖 Hand back to AI
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setOpenPopover((p) => !p)}
              style={{
                ...toolbarBtnStyle,
                borderColor: openPopover ? '#6b7280' : '#d1d5db',
                color: openPopover ? '#14151a' : '#6b7280',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Actions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
