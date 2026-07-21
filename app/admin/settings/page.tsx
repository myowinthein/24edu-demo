'use client';

import { useState, useEffect } from 'react';

interface SessionStats { total: number; ai: number; human: number; }
interface SourceStats { total: number; }

export default function AdminSettingsPage() {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionConfirming, setSessionConfirming] = useState(false);
  const [sessionClearing, setSessionClearing] = useState(false);
  const [sessionCleared, setSessionCleared] = useState<number | null>(null);

  const [sourceStats, setSourceStats] = useState<SourceStats | null>(null);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceConfirming, setSourceConfirming] = useState(false);
  const [sourceClearing, setSourceClearing] = useState(false);
  const [sourceCleared, setSourceCleared] = useState<number | null>(null);

  const loadSessionStats = async () => {
    setSessionLoading(true);
    try {
      const res = await fetch('/api/admin/sessions/clear');
      if (res.ok) setSessionStats(await res.json());
    } finally {
      setSessionLoading(false);
    }
  };

  const loadSourceStats = async () => {
    setSourceLoading(true);
    try {
      const res = await fetch('/api/admin/sources/clear');
      if (res.ok) setSourceStats(await res.json());
    } finally {
      setSourceLoading(false);
    }
  };

  useEffect(() => { loadSessionStats(); loadSourceStats(); }, []);

  const handleClearSessions = async () => {
    setSessionClearing(true);
    setSessionCleared(null);
    try {
      const res = await fetch('/api/admin/sessions/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessionCleared(data.cleared);
        setSessionConfirming(false);
        await loadSessionStats();
      }
    } finally {
      setSessionClearing(false);
    }
  };

  const handleClearSources = async () => {
    setSourceClearing(true);
    setSourceCleared(null);
    try {
      const res = await fetch('/api/admin/sources/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSourceCleared(data.cleared);
        setSourceConfirming(false);
        await loadSourceStats();
      }
    } finally {
      setSourceClearing(false);
    }
  };

  const loading = sessionLoading;

  return (
    <div style={{ flex: 1, padding: 32, maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
        Settings
      </div>

      <div
        style={{
          border: '1px solid #e3e3e6',
          borderRadius: 12,
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f1' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
            Session overview
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            All chat sessions stored in Redis
          </div>
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 1,
            background: '#f0f0f1',
            borderBottom: '1px solid #f0f0f1',
          }}
        >
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Total"
                value={sessionStats?.total ?? 0}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                  </svg>
                }
                iconColor="#6b7280"
                bg="#f9fafb"
              />
              <StatCard
                label="AI handled"
                value={sessionStats?.ai ?? 0}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                  </svg>
                }
                iconColor="#6366f1"
                bg="#ffffff"
              />
              <StatCard
                label="Human involved"
                value={sessionStats?.human ?? 0}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                }
                iconColor="#10b981"
                bg="#f9fafb"
              />
            </>
          )}
        </div>

        {/* Clear section */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
            Clear all sessions
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>
            Permanently deletes all sessions and their message history. This cannot be undone.
          </div>

          <ClearRow
            label="Clear all sessions"
            count={sessionStats?.total ?? 0}
            loading={sessionLoading}
            confirming={sessionConfirming}
            clearing={sessionClearing}
            cleared={sessionCleared}
            clearedLabel="session"
            onConfirm={() => { setSessionConfirming(true); setSessionCleared(null); }}
            onClear={handleClearSessions}
            onCancel={() => setSessionConfirming(false)}
          />
        </div>
      </div>

      {/* Sources card */}
      <div
        style={{
          border: '1px solid #e3e3e6',
          borderRadius: 12,
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f1' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Sources</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            Uploaded files and their vector embeddings
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', background: '#f0f0f1', borderBottom: '1px solid #f0f0f1' }}>
          {sourceLoading ? (
            <SkeletonCard />
          ) : (
            <StatCard
              label="Total sources"
              value={sourceStats?.total ?? 0}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              }
              iconColor="#6b7280"
              bg="#f9fafb"
            />
          )}
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>
            Clear all sources
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14, lineHeight: 1.6 }}>
            Permanently deletes all uploaded files and their vector embeddings from Upstash Vector.
          </div>
          <ClearRow
            label="Clear all sources"
            count={sourceStats?.total ?? 0}
            loading={sourceLoading}
            confirming={sourceConfirming}
            clearing={sourceClearing}
            cleared={sourceCleared}
            clearedLabel="source"
            onConfirm={() => { setSourceConfirming(true); setSourceCleared(null); }}
            onClear={handleClearSources}
            onCancel={() => setSourceConfirming(false)}
          />
        </div>
      </div>
    </div>
  );
}

function ClearRow({
  label, count, loading, confirming, clearing, cleared, clearedLabel,
  onConfirm, onClear, onCancel,
}: {
  label: string; count: number; loading: boolean; confirming: boolean;
  clearing: boolean; cleared: number | null; clearedLabel: string;
  onConfirm: () => void; onClear: () => void; onCancel: () => void;
}) {
  const isEmpty = count === 0;
  return (
    <>
      {cleared !== null && (
        <div style={{ marginBottom: 14, padding: '9px 13px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534' }}>
          Cleared {cleared} {clearedLabel}{cleared !== 1 ? 's' : ''}.
        </div>
      )}
      {!confirming ? (
        <button
          onClick={onConfirm}
          disabled={loading || isEmpty}
          style={{
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            background: loading || isEmpty ? '#f3f4f6' : '#fef2f2',
            color: loading || isEmpty ? '#9ca3af' : '#dc2626',
            border: `1px solid ${loading || isEmpty ? '#e5e7eb' : '#fecaca'}`,
            borderRadius: 7, cursor: loading || isEmpty ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {label}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#374151' }}>Delete all {count} {clearedLabel}{count !== 1 ? 's' : ''}?</span>
          <button onClick={onClear} disabled={clearing} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 7, cursor: clearing ? 'not-allowed' : 'pointer', opacity: clearing ? 0.7 : 1, fontFamily: 'inherit' }}>
            {clearing ? 'Clearing…' : 'Confirm'}
          </button>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

function StatCard({
  label, value, icon, iconColor, bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconColor: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ color: iconColor }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#f9fafb', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div>
        <div style={{ width: 48, height: 28, borderRadius: 6, background: '#e5e7eb', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 72, height: 12, borderRadius: 4, background: '#e5e7eb', marginTop: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
