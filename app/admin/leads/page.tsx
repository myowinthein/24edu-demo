'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import type { LeadData } from '@/lib/types';

const COLUMNS: { key: keyof LeadData; label: string }[] = [
  { key: 'name',              label: 'Name' },
  { key: 'email',             label: 'Email' },
  { key: 'phone',             label: 'Phone' },
  { key: 'country',           label: 'Country' },
  { key: 'educationLevel',    label: 'Education' },
  { key: 'programOfInterest', label: 'Program' },
  { key: 'intendedIntake',    label: 'Intake' },
  { key: 'submittedAt',       label: 'Submitted' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<keyof LeadData>('submittedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      sort, order, search,
    });
    const res = await fetch(`/api/admin/leads?${params}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page, sort, order, search, router]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSort = (key: keyof LeadData) => {
    if (sort === key) setOrder((o) => o === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setOrder('asc'); }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const exportCSV = () => {
    const header = COLUMNS.map((c) => c.label).join(',');
    const rows = leads.map((l) =>
      COLUMNS.map((c) => {
        const v = c.key === 'submittedAt' ? formatDate(l[c.key]) : l[c.key];
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    download(new Blob([csv], { type: 'text/csv' }), 'leads.csv');
  };

  const exportJSON = () => {
    download(new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' }), 'leads.json');
  };

  const exportExcel = () => {
    const rows = leads.map((l) =>
      Object.fromEntries(COLUMNS.map((c) => [c.label, c.key === 'submittedAt' ? formatDate(l[c.key]) : l[c.key]]))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads.xlsx');
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const sortIcon = (key: keyof LeadData) => {
    if (sort !== key) return <span style={{ color: '#d1d5db', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{order === 'asc' ? '↑' : '↓'}</span>;
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 13px', fontSize: 12, fontWeight: 500, border: '1px solid #d1d5db',
    borderRadius: 6, cursor: 'pointer', background: '#ffffff', color: '#374151',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 24px', gap: 16, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Leads</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {total} {total === 1 ? 'lead' : 'leads'} captured
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={btnStyle}>↓ CSV</button>
          <button onClick={exportJSON} style={btnStyle}>↓ JSON</button>
          <button onClick={exportExcel} style={btnStyle}>↓ Excel</button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email, country or program…"
          style={{
            flex: 1, padding: '8px 12px', fontSize: 13,
            border: '1px solid #d1d5db', borderRadius: 7, outline: 'none',
            fontFamily: 'inherit', color: '#14151a',
          }}
        />
        <button type="submit" style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: 'none' }}>
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            style={btnStyle}
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', border: '1px solid #e3e3e6', borderRadius: 10, minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e3e3e6' }}>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                    color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLUMNS.length} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                {search ? 'No leads match your search.' : 'No leads yet.'}
              </td></tr>
            ) : leads.map((lead, i) => (
              <tr
                key={lead.guestId}
                style={{ borderBottom: '1px solid #f0f0f1', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}
              >
                {COLUMNS.map((col) => (
                  <td key={col.key} style={{ padding: '10px 14px', color: '#14151a', whiteSpace: col.key === 'submittedAt' ? 'nowrap' : 'normal' }}>
                    {col.key === 'submittedAt' ? formatDate(lead[col.key]) : lead[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={{ ...btnStyle, opacity: page === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} style={{ ...btnStyle, opacity: page === 1 ? 0.4 : 1 }}>‹ Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} style={{ ...btnStyle, opacity: page === totalPages ? 0.4 : 1 }}>Next ›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ ...btnStyle, opacity: page === totalPages ? 0.4 : 1 }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
