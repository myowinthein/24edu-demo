'use client';

import { formatDate, formatRelativeTime } from '@/lib/format';
import type { SessionRow } from '../constants';

interface ChatSidebarProps {
  sidebarOpen: boolean;
  onToggle: () => void;
  sessions: SessionRow[];
  sessionId: string | null;
  name?: string | null;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
}

export function ChatSidebar({
  sidebarOpen,
  onToggle,
  sessions,
  sessionId,
  name,
  onNewChat,
  onSwitchSession,
}: ChatSidebarProps) {
  return (
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
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
            {name ?? 'Student'}
          </span>
        )}
        <button
          onClick={onToggle}
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
              onClick={onNewChat}
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
                  onClick={() => onSwitchSession(s.id)}
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
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af', letterSpacing: '0.03em' }}>
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
  );
}
