'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PROMPT_LOCAL_DATA,
  PROMPT_LOCAL_DATA_SUFFIX_FOUND,
  PROMPT_LOCAL_DATA_SUFFIX_EMPTY,
  PROMPT_GROUNDING_ONLY,
  PROMPT_GROUNDING_WITH_CONTEXT,
} from '@/lib/prompts';

interface SessionStats { total: number; ai: number; human: number; }
interface SourceStats { total: number; }
interface LeadStats { total: number; }

function useFetchStat<T>(url: string): [T | null, boolean, () => Promise<void>] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return [data, loading, load];
}

function useClearResource(url: string, reload: () => Promise<void>) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState<number | null>(null);

  const onClear = async () => {
    setClearing(true); setCleared(null);
    try {
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCleared(data.cleared); setConfirming(false);
        await reload();
      }
    } finally { setClearing(false); }
  };

  return {
    confirming, clearing, cleared,
    onConfirm: () => { setConfirming(true); setCleared(null); },
    onClear,
    onCancel: () => setConfirming(false),
  };
}

const TABS = ['Data', 'Prompts'] as const;
type Tab = typeof TABS[number];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('Data');

  const [sessionStats, sessionLoading, loadSessionStats] = useFetchStat<SessionStats>('/api/admin/sessions/clear');
  const [sourceStats, sourceLoading, loadSourceStats] = useFetchStat<SourceStats>('/api/admin/sources/clear');
  const [leadStats, leadLoading, loadLeadStats] = useFetchStat<LeadStats>('/api/admin/leads/clear');

  const sessionClear = useClearResource('/api/admin/sessions/clear', loadSessionStats);
  const sourceClear = useClearResource('/api/admin/sources/clear', loadSourceStats);
  const leadClear = useClearResource('/api/admin/leads/clear', loadLeadStats);

  return (
    <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Settings</div>
        <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>Manage data and system configuration</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-3)',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Data' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>

        {/* Sessions */}
        <SettingCard
          title="Chat Sessions"
          description="All chat sessions and message history stored in Redis"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {sessionLoading ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                <StatCard label="Total" value={sessionStats?.total ?? 0}
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
                  iconColor="#6b7280" bg="var(--bg-surface)" />
                <StatCard label="AI handled" value={sessionStats?.ai ?? 0}
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>}
                  iconColor="#6366f1" bg="var(--bg)" />
                <StatCard label="Human involved" value={sessionStats?.human ?? 0}
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                  iconColor="#10b981" bg="var(--bg-surface)" />
              </>
            )}
          </div>
          <ClearRow
            label="Clear all sessions"
            count={sessionStats?.total ?? 0}
            loading={sessionLoading}
            clearedLabel="session"
            {...sessionClear}
          />
        </SettingCard>

        {/* Sources */}
        <SettingCard
          title="Data Sources"
          description="Uploaded CSV / Excel files and their vector embeddings in Upstash"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {sourceLoading ? <SkeletonCard /> : (
              <StatCard label="Total sources" value={sourceStats?.total ?? 0}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                iconColor="#6b7280" bg="var(--bg-surface)" />
            )}
          </div>
          <ClearRow
            label="Clear all sources"
            count={sourceStats?.total ?? 0}
            loading={sourceLoading}
            clearedLabel="source"
            {...sourceClear}
          />
        </SettingCard>

        {/* Leads */}
        <SettingCard
          title="Leads"
          description="Student lead submissions captured from the chat entry form"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {leadLoading ? <SkeletonCard /> : (
              <StatCard label="Total leads" value={leadStats?.total ?? 0}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                iconColor="#f59e0b" bg="var(--bg-surface)" />
            )}
          </div>
          <ClearRow
            label="Clear all leads"
            count={leadStats?.total ?? 0}
            loading={leadLoading}
            clearedLabel="lead"
            {...leadClear}
          />
        </SettingCard>

      </div>}

      {tab === 'Prompts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
          <SettingCard title="Local data (no web search)" description="Used when vector search returns results. Chunks are appended at runtime.">
            <PromptBlock value={PROMPT_LOCAL_DATA + PROMPT_LOCAL_DATA_SUFFIX_FOUND} />
          </SettingCard>
          <SettingCard title="Local data (no results)" description="Used when vector search returns nothing and grounding is not triggered.">
            <PromptBlock value={PROMPT_LOCAL_DATA + PROMPT_LOCAL_DATA_SUFFIX_EMPTY} />
          </SettingCard>
          <SettingCard title="Web search (grounding only)" description="Used when no local chunks exist but the question is education-related.">
            <PromptBlock value={PROMPT_GROUNDING_ONLY} />
          </SettingCard>
          <SettingCard title="Web search + local context" description="Used for contact-info queries when local chunks exist. Chunks are appended at runtime.">
            <PromptBlock value={PROMPT_GROUNDING_WITH_CONTEXT} />
          </SettingCard>
        </div>
      )}
    </div>
  );
}

function SettingCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ padding: '16px 20px', flex: 1 }}>{children}</div>
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
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12, color: '#166534' }}>
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
          <button onClick={onClear} disabled={clearing}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 7, cursor: clearing ? 'not-allowed' : 'pointer', opacity: clearing ? 0.7 : 1, fontFamily: 'inherit' }}>
            {clearing ? 'Clearing…' : 'Confirm'}
          </button>
          <button onClick={onCancel}
            style={{ padding: '7px 14px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, icon, iconColor, bg }: { label: string; value: number; icon: React.ReactNode; iconColor: string; bg: string; }) {
  return (
    <div style={{ background: bg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: iconColor }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function PromptBlock({ value }: { value: string }) {
  return (
    <div
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 12px', fontSize: 12, fontFamily: 'ui-monospace, monospace',
        lineHeight: 1.6, color: 'var(--text-2)', background: 'var(--bg-surface)',
        border: '1px solid var(--border)', borderRadius: 7,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text',
      }}
    >
      {value}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-surface)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 15, height: 15, borderRadius: 4, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div>
        <div style={{ width: 40, height: 24, borderRadius: 5, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: 64, height: 11, borderRadius: 4, background: 'var(--border)', marginTop: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
