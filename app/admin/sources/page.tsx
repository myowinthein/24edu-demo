'use client';

import { useState, useEffect, useRef } from 'react';
import type { SourceEntry } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRows(n: number) {
  return n.toLocaleString();
}

function toCSVCell(c: string): string {
  const s = String(c ?? '').replace(/\r?\n/g, ' ').trim();
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSVRow(cells: string[]): string {
  return cells.map(toCSVCell).join(',');
}

function xlsxToCSV(XLSX: typeof import('xlsx'), workbook: import('xlsx').WorkBook): string {
  type Row = string[];

  const getRows = (name: string): Row[] =>
    XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
    }) as Row[];

  const countNonEmpty = (row: Row) => row.filter((c) => String(c).trim()).length;

  const headerScore = (row: Row): number => {
    const ne = countNonEmpty(row);
    if (ne === 0) return 0;
    const numericCount = row.filter((c) => String(c).trim() && !isNaN(Number(c))).length;
    const totalLen = row.reduce((s, c) => s + String(c).length, 0);
    const avgLen = totalLen / Math.max(ne, 1);
    const stringRatio = 1 - numericCount / ne;
    const lengthPenalty = avgLen > 80 ? 0.2 : avgLen > 40 ? 0.7 : 1;
    return ne * stringRatio * lengthPenalty;
  };

  const findHeaderIdx = (rows: Row[]): number => {
    let best = { idx: 0, score: -1 };
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const s = headerScore(rows[i]);
      if (s > best.score) best = { idx: i, score: s };
    }
    return best.idx;
  };

  const isDataRow = (row: Row): boolean =>
    row.some((c) => {
      const s = String(c).trim();
      if (!s) return false;
      if (!isNaN(Number(s))) return true;
      return s.length > 25;
    });

  const findDataStart = (rows: Row[], headerIdx: number): number => {
    const threshold = Math.max(2, countNonEmpty(rows[headerIdx]) * 0.25);
    let firstCandidate = -1;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (countNonEmpty(rows[i]) < threshold) continue;
      if (isDataRow(rows[i])) return i;
      if (firstCandidate === -1) firstCandidate = i;
    }
    return firstCandidate !== -1 ? firstCandidate : headerIdx + 1;
  };

  const buildHeader = (rows: Row[], headerIdx: number, dataStart: number): (string | null)[] => {
    const main = rows[headerIdx].map((c) => String(c).trim());
    const subRows = rows.slice(headerIdx + 1, dataStart).filter((r) => countNonEmpty(r) > 0);
    let lastFilled = '';
    return main.map((cell, i) => {
      if (cell) lastFilled = cell;
      const sub = subRows.map((r) => String(r[i] ?? '').trim()).filter(Boolean).join('/');
      if (!cell && !sub) return null;
      if (!cell && sub) return `${lastFilled}: ${sub}`;
      if (cell && sub) return `${cell}: ${sub}`;
      return cell;
    });
  };

  const headersSimilar = (a: Row, b: Row): boolean => {
    const len = Math.max(a.length, b.length);
    if (len === 0) return false;
    const matches = a.filter((v, i) => v && v === b[i]).length;
    return matches / len >= 0.3;
  };

  const sheets = workbook.SheetNames.map((name) => {
    const rows = getRows(name);
    const nonEmptyRows = rows.filter((r) => countNonEmpty(r) > 0);
    return { name, rows, dataRowCount: nonEmptyRows.length };
  }).filter((s) => s.dataRowCount > 2);

  if (sheets.length === 0) return '';

  const analyzed = sheets.map((s) => {
    const headerIdx = findHeaderIdx(s.rows);
    const dataStart = findDataStart(s.rows, headerIdx);
    const header = buildHeader(s.rows, headerIdx, dataStart);
    return { ...s, headerIdx, dataStart, header };
  });

  const [first, ...rest] = analyzed;
  const combinable = rest.filter((s) =>
    headersSimilar(first.rows[first.headerIdx], s.rows[s.headerIdx])
  );
  const sheetsToMerge = combinable.length > 0 ? [first, ...combinable] : [first];
  const addSheetCol = sheetsToMerge.length > 1;

  const richest = sheetsToMerge.reduce((a, b) =>
    a.header.filter(Boolean).length >= b.header.filter(Boolean).length ? a : b
  );

  const keepIdx = richest.header.reduce<number[]>(
    (acc, h, i) => (h !== null ? [...acc, i] : acc),
    []
  );
  const colHeaders = keepIdx.map((i) => richest.header[i] as string);
  const finalHeaders = addSheetCol ? ['Sheet', ...colHeaders] : colHeaders;

  const lines = [toCSVRow(finalHeaders)];
  sheetsToMerge.forEach(({ name, rows, dataStart }) => {
    rows.slice(dataStart).filter((r) => countNonEmpty(r) > 0).forEach((r) => {
      const cells = keepIdx.map((i) => r[i] ?? '');
      lines.push(toCSVRow(addSheetCol ? [name, ...cells] : cells));
    });
  });

  return lines.join('\n');
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
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

    if (sources.some((s) => s.filename === file.name)) {
      alert(`"${file.name}" is already in your sources. Remove it first or rename the file before uploading.`);
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
      const updated = await resp.json();
      if (Array.isArray(updated)) setSources(updated);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadStatus('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (id: string, filename: string) => {
    if (!confirm(`Remove "${filename}"? This cannot be undone.`)) return;
    const resp = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    const updated = await resp.json();
    if (Array.isArray(updated)) setSources(updated);
  };

  const uploadLabel =
    uploadStatus === 'converting' ? 'Converting…' :
    uploadStatus === 'uploading'  ? 'Uploading…'  : 'Add source';

  return (
    <>
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

        {isLoadingSources ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#6b7280', fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Loading sources…
          </div>
        ) : sources.length > 0 ? (
          <div style={{ border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 110px 140px', padding: '10px 16px', background: '#f7f7f8', fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
              <div>Filename</div><div>Upload date</div><div>Rows</div><div />
            </div>
            {sources.map((src) => (
              <div
                key={src.id}
                style={{ display: 'grid', gridTemplateColumns: '1fr 160px 110px 140px', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid #e3e3e6', fontSize: 14 }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{src.filename}</div>
                <div style={{ color: '#6b7280' }}>{formatDate(src.uploadedAt)}</div>
                <div style={{ color: '#6b7280' }}>{formatRows(src.rowCount)}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => handleRemove(src.id, src.filename)} style={{ padding: '6px 12px', fontSize: 13, background: '#ffffff', color: '#b91c1c', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
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
