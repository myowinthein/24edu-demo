'use client';

import { formatDate, formatRelativeTime } from '@/lib/format';
import type { SessionRow } from '../constants';

interface ChatSidebarProps {
  sidebarOpen: boolean;
  onToggle: () => void;
  sessions: SessionRow[];
  sessionId: string | null;
  name?: string | null;
  loading?: boolean;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
}

function SkeletonSession() {
  return (
    <div style={{ marginBottom: 6, border: '1px solid #e3e3e6', borderRadius: 9, background: '#ffffff', overflow: 'hidden' }}>
      <div style={{ padding: '9px 10px' }}>
        <div style={{ width: 48, height: 9, borderRadius: 4, background: '#e5e7eb', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '80%', height: 12, borderRadius: 4, background: '#e5e7eb', marginBottom: 5, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 72, height: 9, borderRadius: 4, background: '#f0f0f1', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

export function ChatSidebar({
  sidebarOpen,
  onToggle,
  sessions,
  sessionId,
  name,
  loading = false,
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
            {loading && sessions.length === 0 ? (
              <>
                <SkeletonSession />
                <SkeletonSession />
                <SkeletonSession />
              </>
            ) : sessions.map((s, idx) => {
              const isActive = s.id === sessionId;
              return (
                <div
                  key={s.id}
                  style={{
                    marginBottom: 6,
                    border: isActive ? '1px solid #bfdbfe' : '1px solid #e3e3e6',
                    borderRadius: 9,
                    background: isActive ? '#eff6ff' : '#ffffff',
                    overflow: 'hidden',
                    animation: idx === 0 ? 'fadeIn 0.18s ease' : undefined,
                  }}
                >
                  <button
                    onClick={() => onSwitchSession(s.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
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
                        color: isActive ? '#1d4ed8' : '#374151',
                      }}
                    >
                      {s.title}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {formatDate(s.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · {formatRelativeTime(s.lastActiveAt)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
