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

function parseCSVPreview(csv: string) {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { columns: [] as string[], rows: [] as string[][] };

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const columns = parseRow(lines[0]);
  const rows = lines.slice(1, 51).map(parseRow);
  return { columns, rows };
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [viewingSource, setViewingSource] = useState<SourceEntry | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch(() => {});
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let csv: string;

      if (file.name.toLowerCase().endsWith('.csv')) {
        csv = await file.text();
      } else {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        csv = XLSX.utils.sheet_to_csv(sheet);
      }

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
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (id: string) => {
    const resp = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    const updated = await resp.json();
    if (Array.isArray(updated)) setSources(updated);
    if (viewingSource?.id === id) setViewingSource(null);
  };

  const preview = viewingSource ? parseCSVPreview(viewingSource.csv) : null;

  return (
    <>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 820,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Sources</div>
          <label
            style={{
              padding: '9px 16px',
              fontSize: 14,
              fontWeight: 500,
              background: isUploading ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              borderRadius: 8,
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? 'Uploading…' : 'Add source'}
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

        {/* Sources table */}
        {sources.length > 0 ? (
          <div
            style={{ border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 110px 140px',
                padding: '10px 16px',
                background: '#f7f7f8',
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 500,
              }}
            >
              <div>Filename</div>
              <div>Upload date</div>
              <div>Rows</div>
              <div />
            </div>

            {sources.map((src) => (
              <div
                key={src.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 110px 140px',
                  padding: '12px 16px',
                  alignItems: 'center',
                  borderTop: '1px solid #e3e3e6',
                  fontSize: 14,
                }}
              >
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: 12,
                  }}
                >
                  {src.filename}
                </div>
                <div style={{ color: '#6b7280' }}>{formatDate(src.uploadedAt)}</div>
                <div style={{ color: '#6b7280' }}>{formatRows(src.rowCount)}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setViewingSource(src)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background: '#ffffff',
                      color: '#14151a',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleRemove(src.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background: '#ffffff',
                      color: '#b91c1c',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              color: '#6b7280',
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            No sources uploaded yet. Use &quot;Add source&quot; to upload one.
          </div>
        )}
      </div>

      {/* View modal */}
      {viewingSource && preview && (
        <div
          onClick={() => setViewingSource(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 10,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 10,
              maxWidth: 760,
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #e3e3e6',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{viewingSource.filename}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {formatRows(viewingSource.rowCount)} rows &middot; uploaded{' '}
                  {formatDate(viewingSource.uploadedAt)}
                </div>
              </div>
              <button
                onClick={() => setViewingSource(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 20,
                  lineHeight: 1,
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal table */}
            <div style={{ overflow: 'auto', padding: '0 20px 20px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    {preview.columns.map((col, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          borderBottom: '1px solid #e3e3e6',
                          color: '#6b7280',
                          fontWeight: 500,
                          position: 'sticky',
                          top: 0,
                          background: '#ffffff',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid #f0f0f1',
                            color: '#14151a',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
