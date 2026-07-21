'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { formatRelativeTime, formatDate } from '@/lib/format';
import { navLinkStyle } from '@/lib/ui-styles';
import type { SessionMode } from '@/lib/types';

interface AdminSession {
  id: string;
  mode: SessionMode;
  guestId: string;
  createdAt: string;
  lastActiveAt: string;
  name: string;
  email: string;
  phone: string;
}

interface GuestGroup {
  guestId: string;
  name: string;
  email: string;
  phone: string;
  sessions: AdminSession[];
}


const modeLabel: Record<SessionMode, string> = {
  ai: 'AI',
  requested: 'Requested',
  human: 'Live',
};

const modeBadgeStyle: Record<SessionMode, React.CSSProperties> = {
  ai:        { background: '#f3f4f6', color: '#6b7280' },
  requested: { background: '#fef3c7', color: '#b45309' },
  human:     { background: '#d1fae5', color: '#065f46' },
};

const modeDot: Record<SessionMode, string> = {
  ai:        '#9ca3af',
  requested: '#f59e0b',
  human:     '#10b981',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const isChats = pathname === '/admin' || pathname.startsWith('/admin/sessions');
  const isSources = pathname === '/admin/sources';
  const isLeads = pathname === '/admin/leads';
  const isSettings = pathname === '/admin/settings';
  const activeSessionId = pathname.match(/^\/admin\/sessions\/([^/]+)/)?.[1] ?? null;

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [readAt, setReadAt] = useState<Record<string, number>>({});
  const prevModesRef = useRef<Record<string, SessionMode>>({});
  const isRefetchingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    if (isRefetchingRef.current) return;
    isRefetchingRef.current = true;
    try {
      const res = await fetch('/api/admin/sessions');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) return;
      const data = (await res.json()) as AdminSession[];

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        data.forEach((s) => {
          if (s.mode === 'requested' && prevModesRef.current[s.id] !== 'requested') {
            new Notification('Support requested', {
              body: `Guest #${s.guestId.slice(0, 8)} needs a human agent`,
              icon: '/favicon.ico',
            });
          }
        });
      }
      prevModesRef.current = Object.fromEntries(data.map((s) => [s.id, s.mode]));
      setSessions(data);
    } finally {
      isRefetchingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      setReadAt((prev) => ({ ...prev, [activeSessionId]: Date.now() }));
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (isLogin) return;
    fetchSessions();
    let active = true;
    let es: EventSource | null = null;
    const connect = () => {
      if (!active) return;
      es = new EventSource('/api/admin/sessions/stream');
      es.onmessage = () => fetchSessions();
      es.onerror = () => { es?.close(); if (active) setTimeout(connect, 3000); };
    };
    connect();
    return () => { active = false; es?.close(); };
  }, [isLogin, fetchSessions]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleAccept = async (sessionId: string) => {
    await fetch(`/api/admin/sessions/${sessionId}/join`, { method: 'POST' });
    router.push(`/admin/sessions/${sessionId}`);
  };

  const guestGroups = useMemo<GuestGroup[]>(() => {
    const map = new Map<string, GuestGroup>();
    for (const s of sessions) {
      const gid = s.guestId || '__unknown__';
      if (!map.has(gid)) {
        map.set(gid, { guestId: gid, name: s.name, email: s.email, phone: s.phone, sessions: [] });
      }
      const group = map.get(gid)!;
      if (!group.name && s.name) { group.name = s.name; group.email = s.email; group.phone = s.phone; }
      group.sessions.push(s);
    }
    return Array.from(map.values());
  }, [sessions]);

  if (isLogin) return <>{children}</>;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* Sidebar — full window height */}
      <div
        style={{
          width: sidebarOpen ? 300 : 48,
          flexShrink: 0,
          borderRight: '1px solid #e3e3e6',
          display: 'flex',
          flexDirection: 'column',
          background: '#f9fafb',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Brand row — aligns with top nav height */}
        <div
          style={{
            height: 56,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
            padding: sidebarOpen ? '0 12px 0 14px' : '0',
            borderBottom: '1px solid #e3e3e6',
          }}
        >
          {sidebarOpen && (
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
              Admin
            </span>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
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
              color: '#6b7280',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {sidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>
        </div>

        {/* Sessions list */}
        {sidebarOpen && (
          <>
            {guestGroups.length > 0 && (
              <div style={{ padding: '10px 14px 4px' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Guests ({guestGroups.length})
                </span>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
              {guestGroups.length === 0 ? (
                <div style={{ padding: '20px 8px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                  No sessions yet.
                </div>
              ) : (
                guestGroups.map((group) => {
                  return (
                    <div
                      key={group.guestId}
                      style={{
                        marginBottom: 10,
                        border: '1px solid #e3e3e6',
                        borderRadius: 9,
                        background: '#ffffff',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Guest header */}
                      <div style={{ padding: '9px 12px 8px', borderBottom: '1px solid #f0f0f1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                          {group.name ? (
                            <span style={{ fontSize: 12, color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {group.name}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151', fontWeight: 600 }}>
                              #{group.guestId === '__unknown__' ? 'unknown' : group.guestId.slice(0, 12)}
                            </span>
                          )}
                        </div>
                        {group.email ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {group.email}
                            </div>
                            {group.phone && (
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{group.phone}</div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>No lead info</div>
                        )}
                      </div>

                      {/* Sessions under this guest */}
                      <div style={{ padding: '4px 6px' }}>
                        {group.sessions.map((s) => {
                          const isActive = s.id === activeSessionId;
                          const isRequested = s.mode === 'requested';
                          const hasUnread = !isActive &&
                            new Date(s.lastActiveAt).getTime() > (readAt[s.id] ?? 0);
                          return (
                            <div
                              key={s.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                marginBottom: 2,
                                borderRadius: 6,
                                background: isRequested ? '#fffbeb' : isActive ? '#eff6ff' : 'transparent',
                                border: isRequested ? '1px solid #fde68a' : isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                              }}
                            >
                              <Link
                                href={`/admin/sessions/${s.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  flex: 1,
                                  padding: '7px 8px',
                                  textDecoration: 'none',
                                  minWidth: 0,
                                }}
                              >
                                <span
                                  title={modeLabel[s.mode]}
                                  style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: modeDot[s.mode], flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 10, fontWeight: 600,
                                    padding: '1px 6px', borderRadius: 8,
                                    ...modeBadgeStyle[s.mode], flexShrink: 0,
                                  }}
                                >
                                  {modeLabel[s.mode]}
                                </span>
                                <span
                                  style={{
                                    fontFamily: 'monospace', fontSize: 11,
                                    color: isActive ? '#1d4ed8' : '#374151',
                                    flex: 1, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}
                                >
                                  #{s.id.slice(0, 8)}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                                  {hasUnread && (
                                    <span
                                      style={{
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: '#2563eb', flexShrink: 0,
                                        marginBottom: 1,
                                      }}
                                    />
                                  )}
                                  {s.createdAt && <span style={{ fontSize: 9, color: '#d1d5db' }}>{formatDate(s.createdAt)}</span>}
                                  {s.lastActiveAt && <span style={{ fontSize: 9, color: '#9ca3af' }}>{formatRelativeTime(s.lastActiveAt)}</span>}
                                </div>
                              </Link>
                              {isRequested && (
                                <button
                                  onClick={() => handleAccept(s.id)}
                                  title="Accept request"
                                  style={{
                                    flexShrink: 0,
                                    marginRight: 6,
                                    padding: '3px 8px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: '#d97706',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Accept
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Right column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Top bar — links right-aligned */}
        <div
          style={{
            height: 56,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 20px',
            gap: 4,
            borderBottom: '1px solid #e3e3e6',
          }}
        >
          <Link href="/admin" style={navLinkStyle(isChats)}>💬 Chats</Link>
          <Link href="/admin/leads" style={navLinkStyle(isLeads)}>🎯 Leads</Link>
          <Link href="/admin/sources" style={navLinkStyle(isSources)}>📂 Sources</Link>
          <Link href="/admin/settings" style={navLinkStyle(isSettings)}>⚙ Settings</Link>
          <div style={{ width: 1, height: 18, background: '#e3e3e6', margin: '0 8px' }} />
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 13px',
              fontSize: 13,
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#6b7280',
              fontFamily: 'inherit',
            }}
          >
            Log out
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
