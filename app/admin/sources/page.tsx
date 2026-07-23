'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDate } from '@/lib/format';
import { xlsxToCSV } from '@/lib/xlsx-utils';
import type { SourceEntry } from '@/lib/types';

function formatRows(n: number) {
  return n.toLocaleString();
}

const PAGE_SIZE = 20;

type SheetData = { name: string; headers: string[]; rows: string[][] };

function SheetTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            {headers.map((_, i) => <col key={i} style={{ minWidth: 120 }} />)}
          </colgroup>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} title={h} style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1, padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: '1px solid var(--border)', background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg-hover)' }}>
                {headers.map((_, ci) => {
                  const cell = row[ci] ?? '';
                  return (
                    <td key={ci} title={cell} style={{ padding: '8px 12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 13 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-md)', background: 'var(--bg)', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--text-4)' : 'var(--text-2)' }}>← Prev</button>
          <span style={{ color: 'var(--text-3)', flex: 1, textAlign: 'center' }}>
            Page {page + 1} of {totalPages} · rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {formatRows(rows.length)}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-md)', background: 'var(--bg)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', color: page === totalPages - 1 ? 'var(--text-4)' : 'var(--text-2)' }}>Next →</button>
        </div>
      )}
    </>
  );
}

function SourceModal({ src, onClose }: { src: SourceEntry; onClose: () => void }) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setActiveSheet(0);
    fetch(`/api/sources/${src.id}/rows`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        if (data.type === 'multi-sheet') {
          setSheets(data.sheets);
        } else {
          setSheets([{ name: '', headers: data.headers, rows: data.rows }]);
        }
      })
      .catch(() => setError('Failed to load rows.'))
      .finally(() => setLoading(false));
  }, [src.id]);

  const current = sheets[activeSheet];
  const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg)', borderRadius: 12, width: '100%', maxWidth: 1100, maxHeight: '90vh', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{src.filename}</div>
            {!loading && !error && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {formatRows(totalRows)} rows total · {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        {/* sheet tabs */}
        {!loading && !error && sheets.length > 1 && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
            {sheets.map((sh, i) => (
              <button
                key={i}
                onClick={() => setActiveSheet(i)}
                style={{
                  padding: '8px 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  borderBottom: i === activeSheet ? '2px solid #2563eb' : '2px solid transparent',
                  color: i === activeSheet ? '#2563eb' : '#6b7280', fontWeight: i === activeSheet ? 600 : 400,
                }}
              >
                {sh.name} <span style={{ fontSize: 11, color: '#9ca3af' }}>({formatRows(sh.rows.length)})</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, color: '#6b7280', fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Loading rows…
          </div>
        ) : error ? (
          <div style={{ padding: 32, color: '#b91c1c', fontSize: 14 }}>{error}</div>
        ) : !current || current.rows.length === 0 ? (
          <div style={{ padding: 32, color: '#6b7280', fontSize: 14 }}>No rows found.</div>
        ) : (
          <SheetTable key={activeSheet} headers={current.headers} rows={current.rows} />
        )}
      </div>
    </div>
  );
}


export default function SourcesPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
  const [uploadError, setUploadError] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [viewSource, setViewSource] = useState<SourceEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadStatus !== 'idle';

  useEffect(() => {
    setIsLoadingSources(true);
    fetch('/api/sources')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSources(data); })
      .catch(() => {})
      .finally(() => setIsLoadingSources(false));
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (sources.some((s) => s.filename === file.name)) {
      setUploadError(`"${file.name}" is already in your sources. Remove it first or rename the file.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      let csv: string;
      if (file.name.toLowerCase().endsWith('.csv')) {
        setUploadStatus('converting');
        csv = await file.text();
      } else {
        setUploadStatus('converting');
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        csv = xlsxToCSV(XLSX, workbook);
      }

      setUploadStatus('uploading');
      const resp = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, csv }),
      });
      if (!resp.ok) { setUploadError('Upload failed. Please try again.'); return; }
      const updated = await resp.json();
      if (Array.isArray(updated)) setSources(updated);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploadStatus('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (id: string) => {
    if (pendingRemoveId !== id) { setPendingRemoveId(id); return; }
    setPendingRemoveId(null);
    const resp = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    if (!resp.ok) return;
    const updated = await resp.json();
    if (Array.isArray(updated)) setSources(updated);
  };

  const uploadLabel =
    uploadStatus === 'converting' ? 'Converting…' :
    uploadStatus === 'uploading'  ? 'Uploading…'  : 'Add source';

  return (
    <>
      {viewSource && <SourceModal src={viewSource} onClose={() => setViewSource(null)} />}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
          maxWidth: 820, width: '100%', margin: '0 auto', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Sources</div>
          <label
            style={{
              padding: '9px 16px', fontSize: 14, fontWeight: 500,
              background: isUploading ? '#93c5fd' : '#2563eb',
              color: '#ffffff', borderRadius: 8,
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploadLabel}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelected}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {uploadError && (
          <div style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '8px 12px' }}>
            {uploadError}
          </div>
        )}

        {isLoadingSources ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#6b7280', fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Loading sources…
          </div>
        ) : sources.length > 0 ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 110px 140px', padding: '10px 16px', background: 'var(--bg-surface)', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
              <div>Filename</div><div>Upload date</div><div>Rows</div><div />
            </div>
            {sources.map((src) => (
              <div
                key={src.id}
                style={{ display: 'grid', gridTemplateColumns: '1fr 160px 110px 140px', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid var(--border)', fontSize: 14 }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{src.filename}</div>
                <div style={{ color: 'var(--text-3)' }}>{formatDate(src.uploadedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div style={{ color: 'var(--text-3)' }}>{formatRows(src.rowCount)}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setViewSource(src)} style={{ padding: '6px 12px', fontSize: 13, background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border-md)', borderRadius: 6, cursor: 'pointer' }}>View</button>
                  {pendingRemoveId === src.id ? (
                    <>
                      <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>Sure?</span>
                      <button onClick={() => handleRemove(src.id)} style={{ padding: '6px 12px', fontSize: 13, background: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Yes</button>
                      <button onClick={() => setPendingRemoveId(null)} style={{ padding: '6px 12px', fontSize: 13, background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border-md)', borderRadius: 6, cursor: 'pointer' }}>No</button>
                    </>
                  ) : (
                    <button onClick={() => handleRemove(src.id)} style={{ padding: '6px 12px', fontSize: 13, background: 'var(--bg)', color: '#b91c1c', border: '1px solid var(--border-md)', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', color: '#6b7280', fontSize: 15, textAlign: 'center' }}>
            No sources uploaded yet. Use &quot;Add source&quot; to upload one.
          </div>
        )}
      </div>

    </>
  );
}
