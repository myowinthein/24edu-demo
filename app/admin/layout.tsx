'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/format';
import { navLinkStyle } from '@/lib/ui-styles';
import { ThemeToggle } from '@/app/chat/components/ThemeToggle';
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
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
}

interface GuestGroup {
  guestId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
  sessions: AdminSession[];
}


const modeLabel: Record<SessionMode, string> = {
  ai: 'AI',
  requested: 'Requested',
  human: 'Live',
  ended: 'Ended',
};

const modeBadgeStyle: Record<SessionMode, React.CSSProperties> = {
  ai:        { background: '#f3f4f6', color: '#6b7280' },
  requested: { background: '#fef3c7', color: '#b45309' },
  human:     { background: '#d1fae5', color: '#065f46' },
  ended:     { background: '#f3f4f6', color: '#d1d5db' },
};

const modeDot: Record<SessionMode, string> = {
  ai:        '#9ca3af',
  requested: '#f59e0b',
  human:     '#10b981',
  ended:     '#e5e7eb',
};

function GuestInfoDialog({ group, onClose }: { group: GuestGroup; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Name',               group.name],
    ['Email',              group.email],
    ['Phone',              group.phone],
    ['Country',            group.country],
    ['Education level',    group.educationLevel],
    ['Program of interest',group.programOfInterest],
    ['Intended intake',    group.intendedIntake],
  ];
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Guest info</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500, paddingTop: 1 }}>{label}</div>
              <div style={{ color: value ? '#111827' : '#d1d5db', wordBreak: 'break-all', fontStyle: value ? 'normal' : 'italic' }}>
                {value || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [viewGuest, setViewGuest] = useState<GuestGroup | null>(null);
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
              body: `${s.name || `Guest #${s.guestId.slice(0, 8)}`} needs a human agent`,
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

  const handleLogout = () => {
    fetch('/api/admin/logout', { method: 'POST' })
      .catch(console.error)
      .finally(() => router.push('/admin/login'));
  };

  const handleAccept = (sessionId: string) => {
    fetch(`/api/admin/sessions/${sessionId}/join`, { method: 'POST' })
      .catch(console.error)
      .finally(() => router.push(`/admin/sessions/${sessionId}`));
  };

  const guestGroups = useMemo<GuestGroup[]>(() => {
    const map = new Map<string, GuestGroup>();
    for (const s of sessions) {
      const gid = s.guestId || '__unknown__';
      if (!map.has(gid)) {
        map.set(gid, { guestId: gid, name: s.name, email: s.email, phone: s.phone, country: s.country, educationLevel: s.educationLevel, programOfInterest: s.programOfInterest, intendedIntake: s.intendedIntake, sessions: [] });
      }
      const group = map.get(gid)!;
      if (!group.name && s.name) { group.name = s.name; group.email = s.email; group.phone = s.phone; group.country = s.country; group.educationLevel = s.educationLevel; group.programOfInterest = s.programOfInterest; group.intendedIntake = s.intendedIntake; }
      group.sessions.push(s);
    }
    return Array.from(map.values());
  }, [sessions]);

  const latestSessionId = sessions.length > 0
    ? [...sessions].sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())[0].id
    : null;

  if (isLogin) return <>{children}</>;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {viewGuest && <GuestInfoDialog group={viewGuest} onClose={() => setViewGuest(null)} />}
      {/* Sidebar — full window height */}
      <div
        style={{
          width: sidebarOpen ? 300 : 48,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
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
            borderBottom: '1px solid var(--border)',
          }}
        >
          {sidebarOpen && (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
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
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg)',
              cursor: 'pointer',
              color: 'var(--text-3)',
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
                    color: 'var(--text-4)',
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
                <div style={{ padding: '20px 8px', fontSize: 13, color: 'var(--text-4)', textAlign: 'center' }}>
                  No sessions yet.
                </div>
              ) : (
                guestGroups.map((group) => {
                  return (
                    <div
                      key={group.guestId}
                      style={{
                        marginBottom: 10,
                        border: '1px solid var(--border)',
                        borderRadius: 9,
                        background: 'var(--bg)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Guest header — click to view full info */}
                      <button
                        onClick={() => setViewGuest(group)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          width: '100%', padding: '9px 12px',
                          borderBottom: '1px solid var(--border)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {group.name ? (
                            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {group.name}
                            </div>
                          ) : (
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>
                              #{group.guestId === '__unknown__' ? 'unknown' : group.guestId.slice(0, 12)}
                            </div>
                          )}
                          {group.email ? (
                            <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                              {group.email}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic' }}>No lead info</div>
                          )}
                        </div>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>

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
                                background: isRequested ? '#fffbeb' : isActive ? 'var(--accent-bg)' : 'transparent',
                                border: isRequested ? '1px solid #fde68a' : isActive ? '1px solid var(--accent-br)' : '1px solid transparent',
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
                                    fontFamily: 'monospace', fontSize: 11,
                                    color: isActive ? 'var(--accent)' : 'var(--text-2)',
                                    flex: 1, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}
                                >
                                  #{s.id.slice(0, 8)}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {hasUnread && (
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                                  )}
                                  {s.lastActiveAt && <span style={{ fontSize: 9, color: 'var(--text-4)' }}>{formatRelativeTime(s.lastActiveAt)}</span>}
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
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}
        >
          <Link href={latestSessionId ? `/admin/sessions/${latestSessionId}` : '/admin'} style={navLinkStyle(isChats)}>💬 Chats</Link>
          <Link href="/admin/leads" style={navLinkStyle(isLeads)}>🎯 Leads</Link>
          <Link href="/admin/sources" style={navLinkStyle(isSources)}>📂 Sources</Link>
          <Link href="/admin/settings" style={navLinkStyle(isSettings)}>⚙ Settings</Link>
          <ThemeToggle />
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 8px' }} />
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 13px',
              fontSize: 13,
              background: 'transparent',
              border: '1px solid var(--border-md)',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text-3)',
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
