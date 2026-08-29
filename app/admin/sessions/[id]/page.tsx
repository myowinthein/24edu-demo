'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SessionMessage, SessionMode } from '@/lib/types';
import { toolbarBtnStyle } from '@/lib/ui-styles';
import { useEventSource } from '@/lib/use-event-source';

export default function AdminSessionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [mode, setMode] = useState<SessionMode>('ai');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef(0);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions/${id}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      setMode(data.mode);
    } catch (err) {
      console.error('Failed to fetch session', err);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEventSource(`/api/admin/sessions/${id}/stream`, (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.typing) return;
      setMessages(data.messages);
      setMode(data.mode);
    } catch (err) { console.error('SSE parse error', err); }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setActionError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const res = await fetch(`/api/admin/sessions/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setInputText(text);
        setActionError('Failed to send message. Please try again.');
      }
    } catch {
      setInputText(text);
      setActionError('Network error. Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const takeOver = async () => {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}/join`, { method: 'POST' });
      if (!res.ok) setActionError('Failed to take over session. Please try again.');
    } catch {
      setActionError('Network error. Failed to take over session.');
    }
  };

  const handBack = async () => {
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${id}/leave`, { method: 'POST' });
      if (!res.ok) setActionError('Failed to hand back to AI. Please try again.');
    } catch {
      setActionError('Network error. Failed to hand back to AI.');
    }
  };

  const summarize = async () => {
    if (summarizing) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await fetch(`/api/session/${id}/summary`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const roleLabel: Record<SessionMessage['role'], string> = {
    guest: 'Guest', ai: 'AI', admin: 'You',
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
                background: msg.role === 'guest' ? 'var(--msg-self)' : msg.role === 'ai' ? 'var(--bg)' : 'var(--accent-bg)',
                border: msg.role === 'guest' ? 'none' : msg.role === 'ai' ? '1px solid var(--border)' : '1px solid var(--accent-br)',
                color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 11, marginBottom: 3, color: 'var(--text-4)' }}>
                {roleLabel[msg.role]}
              </div>
              {msg.role === 'ai' ? (
                <div className="md-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              ) : msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Summary panel */}
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

      {/* Input area */}
      <div
        style={{
          flexShrink: 0, borderTop: '1px solid var(--border)',
          padding: '12px 20px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {actionError && (
          <div style={{ fontSize: 12, color: '#dc2626', padding: '0 2px' }}>
            {actionError}
          </div>
        )}

        {/* Textarea + Send */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            placeholder={mode === 'human' ? 'Reply as admin… (Enter to send)' : 'Observing: take over to reply'}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            disabled={sending || mode !== 'human'}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', fontSize: 14,
              border: '1px solid var(--border-md)', borderRadius: 8,
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              lineHeight: 1.5, minHeight: 42, maxHeight: 120, overflowY: 'auto',
              color: 'var(--text)', background: mode !== 'human' ? 'var(--bg-surface)' : 'var(--bg)',
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
          <button
            onClick={summarize}
            disabled={summarizing}
            style={{ ...toolbarBtnStyle, opacity: summarizing ? 0.6 : 1, cursor: summarizing ? 'not-allowed' : 'pointer' }}
          >
            {summarizing ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Summarizing…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                Summary
              </>
            )}
          </button>
          {(mode === 'ai' || mode === 'requested') && (
            <button onClick={takeOver} style={toolbarBtnStyle}>
              🎯 Take over chat
            </button>
          )}
          {mode === 'human' && (
            <button onClick={handBack} style={toolbarBtnStyle}>
              🤖 Hand back to AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
