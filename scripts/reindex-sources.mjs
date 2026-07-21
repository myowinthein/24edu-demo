/**
 * Reindexes all .xlsx files in sources/ directly via Upstash REST APIs.
 * Run with: node --env-file=.env.local scripts/reindex-sources.mjs
 */

import XLSX from 'xlsx';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
const VECTOR_URL  = process.env.UPSTASH_VECTOR_REST_URL;
const VECTOR_TOKEN= process.env.UPSTASH_VECTOR_REST_TOKEN;
const SOURCES_KEY = 'sources:list';
const CHUNK_SIZE    = 5;
const MAX_ROW_CHARS = 1000; // truncate long rows before embedding
const UPSERT_BATCH  = 10;
const UPSERT_DELAY  = 200;  // ms between batches

if (!REDIS_URL || !REDIS_TOKEN || !VECTOR_URL || !VECTOR_TOKEN) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scripts/reindex-sources.mjs');
  process.exit(1);
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function toCSVCell(c) {
  const s = String(c ?? '').replace(/\r?\n/g, ' ').trim();
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSVRow(cells) { return cells.map(toCSVCell).join(','); }

// ── xlsxToCSV (mirrors lib/xlsx-utils.ts) ────────────────────────────────────

function xlsxToCSV(workbook) {
  const getRows = (name) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '' });

  const countNonEmpty = (row) => row.filter((c) => String(c).trim()).length;

  const headerScore = (row) => {
    const ne = countNonEmpty(row);
    if (ne === 0) return 0;
    const numericCount = row.filter((c) => String(c).trim() && !isNaN(Number(c))).length;
    const totalLen = row.reduce((s, c) => s + String(c).length, 0);
    const avgLen = totalLen / Math.max(ne, 1);
    const stringRatio = 1 - numericCount / ne;
    const lengthPenalty = avgLen > 80 ? 0.2 : avgLen > 40 ? 0.7 : 1;
    return ne * stringRatio * lengthPenalty;
  };

  const findHeaderIdx = (rows) => {
    let best = { idx: 0, score: -1 };
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const s = headerScore(rows[i]);
      if (s > best.score) best = { idx: i, score: s };
    }
    return best.idx;
  };

  const isDataRow = (row) =>
    row.some((c) => {
      const s = String(c).trim();
      if (!s) return false;
      if (!isNaN(Number(s))) return true;
      return s.length > 25;
    });

  const findDataStart = (rows, headerIdx) => {
    const threshold = Math.max(2, countNonEmpty(rows[headerIdx]) * 0.25);
    let firstCandidate = -1;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (countNonEmpty(rows[i]) < threshold) continue;
      if (isDataRow(rows[i])) return i;
      if (firstCandidate === -1) firstCandidate = i;
    }
    return firstCandidate !== -1 ? firstCandidate : headerIdx + 1;
  };

  const buildHeader = (rows, headerIdx, dataStart) => {
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

  const sections = [];

  for (const name of workbook.SheetNames) {
    const rows = getRows(name);
    const nonEmptyRows = rows.filter((r) => countNonEmpty(r) > 0);
    if (nonEmptyRows.length <= 2) continue;

    const headerIdx = findHeaderIdx(rows);
    const dataStart = findDataStart(rows, headerIdx);
    const header    = buildHeader(rows, headerIdx, dataStart);

    const keepIdx   = header.reduce((acc, h, i) => (h !== null ? [...acc, i] : acc), []);
    const colHeaders = keepIdx.map((i) => header[i]);

    const dataLines = [];
    rows.slice(dataStart).filter((r) => countNonEmpty(r) > 0).forEach((r) => {
      dataLines.push(toCSVRow(keepIdx.map((i) => r[i] ?? '')));
    });

    if (dataLines.length > 0) {
      sections.push(`# Sheet: ${name}\n${toCSVRow(colHeaders)}\n${dataLines.join('\n')}`);
    }
  }

  return sections.join('\n');
}

// ── chunkCsv (mirrors lib/vector.ts) ─────────────────────────────────────────

const truncateRow = (line) =>
  line.length > MAX_ROW_CHARS ? line.slice(0, MAX_ROW_CHARS) + '…' : line;

function chunkCsv(csv, filename) {
  const chunks = [];
  if (csv.startsWith('# Sheet:') || csv.includes('\n# Sheet:')) {
    const sections = csv.split(/(?=^# Sheet: )/m).filter((s) => s.trim());
    for (const section of sections) {
      const lines = section.split('\n').filter((l) => l.trim());
      if (lines.length < 3) continue;
      const sheetName = lines[0].replace(/^# Sheet: /, '').trim();
      const header    = lines[1];
      const dataRows  = lines.slice(2).map(truncateRow);
      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        const rows = dataRows.slice(i, i + CHUNK_SIZE);
        chunks.push(`File: ${filename}\nSheet: ${sheetName}\n${header}\n${rows.join('\n')}`);
      }
    }
    return chunks;
  }
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header   = lines[0];
  const dataRows = lines.slice(1).map(truncateRow);
  for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
    const rows = dataRows.slice(i, i + CHUNK_SIZE);
    chunks.push(`File: ${filename}\n${header}\n${rows.join('\n')}`);
  }
  return chunks;
}

function countDataRows(csv) {
  if (csv.startsWith('# Sheet:') || csv.includes('\n# Sheet:')) {
    return csv.split(/(?=^# Sheet: )/m).filter((s) => s.trim()).reduce((sum, section) => {
      const lines = section.split('\n').filter((l) => l.trim());
      return sum + Math.max(0, lines.length - 2);
    }, 0);
  }
  const lines = csv.split('\n').filter((l) => l.trim());
  return Math.max(0, lines.length - 1);
}

// ── Upstash REST helpers ──────────────────────────────────────────────────────

async function redisGet(key) {
  const res  = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  return json.result ? JSON.parse(json.result) : null;
}

async function redisSet(key, value) {
  // Use pipeline so the value string is safely embedded in JSON without double-encoding.
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]]),
  });
  if (!res.ok) throw new Error(`Redis SET failed: ${await res.text()}`);
}

async function vectorDelete(ids) {
  for (let i = 0; i < ids.length; i += 1000) {
    const batch = ids.slice(i, i + 1000);
    const res = await fetch(`${VECTOR_URL}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${VECTOR_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Vector delete failed: ${await res.text()}`);
  }
}

async function vectorUpsertData(items) {
  for (let i = 0; i < items.length; i += UPSERT_BATCH) {
    const batch = items.slice(i, i + UPSERT_BATCH);
    let lastErr;
    for (let attempt = 1; attempt <= 6; attempt++) {
      const res = await fetch(`${VECTOR_URL}/upsert-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${VECTOR_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) { lastErr = null; break; }
      lastErr = await res.text();
      if (attempt < 6) await new Promise((r) => setTimeout(r, attempt * 3000));
    }
    if (lastErr) throw new Error(`Vector upsert failed after retries: ${lastErr}`);
    process.stdout.write('.');
    if (UPSERT_DELAY > 0) await new Promise((r) => setTimeout(r, UPSERT_DELAY));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading existing sources from Redis…');
  const existing = (await redisGet(SOURCES_KEY)) ?? [];

  for (const src of existing) {
    process.stdout.write(`  Deleting ${src.chunkCount} chunks for "${src.filename}"… `);
    const ids = Array.from({ length: src.chunkCount }, (_, i) => `${src.id}_chunk_${i}`);
    await vectorDelete(ids);
    console.log('done');
  }

  const files = readdirSync('sources').filter((f) => f.endsWith('.xlsx')).sort();
  const newSources = [];

  for (const file of files) {
    console.log(`\nProcessing: ${file}`);
    const wb  = XLSX.readFile(join('sources', file), { cellDates: true });
    const csv = xlsxToCSV(wb);

    if (!csv.trim()) { console.log('  No usable data — skipping.'); continue; }

    const rowCount = countDataRows(csv);
    const chunks   = chunkCsv(csv, file);
    const id       = randomUUID();

    // Report per-sheet breakdown
    const sectionNames = csv.split(/(?=^# Sheet: )/m)
      .filter((s) => s.trim())
      .map((s) => {
        const firstLine = s.split('\n')[0];
        const name = firstLine.replace(/^# Sheet: /, '').trim();
        const dataLines = s.split('\n').filter((l) => l.trim()).length - 2;
        return `${name} (${dataLines})`;
      });
    console.log(`  Sheets: ${sectionNames.join(', ')}`);
    console.log(`  Total rows: ${rowCount} | chunks: ${chunks.length}`);
    process.stdout.write('  Uploading');

    await vectorUpsertData(
      chunks.map((text, i) => ({
        id: `${id}_chunk_${i}`,
        data: text,
        metadata: { sourceId: id, chunkIndex: i, text },
      }))
    );
    console.log(' done');

    newSources.push({ id, filename: file, rowCount, uploadedAt: new Date().toISOString(), chunkCount: chunks.length });
  }

  console.log('\nSaving sources list to Redis…');
  await redisSet(SOURCES_KEY, newSources);

  console.log('\n✅ Done!\n');
  console.log('File'.padEnd(50) + 'Rows'.padStart(8) + 'Chunks'.padStart(8));
  console.log('─'.repeat(66));
  for (const s of newSources) {
    console.log(s.filename.padEnd(50) + String(s.rowCount).padStart(8) + String(s.chunkCount).padStart(8));
  }
}

main().catch((err) => { console.error('\n❌', err.message); process.exit(1); });
