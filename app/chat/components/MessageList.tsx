'use client';

import type { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SessionMessage, SessionMode } from '@/lib/types';

const roleLabel: Record<SessionMessage['role'], string> = {
  guest: 'You',
  ai: 'AI',
  admin: 'Support',
};

interface MessageListProps {
  messages: SessionMessage[];
  mode: SessionMode;
  isLoading: boolean;
  adminTyping: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function MessageList({ messages, mode, isLoading, adminTyping, messagesEndRef }: MessageListProps) {
  return (
    <>
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
            style={{ display: 'flex', justifyContent: msg.role === 'guest' ? 'flex-end' : 'flex-start' }}
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
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
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
    </>
  );
}
