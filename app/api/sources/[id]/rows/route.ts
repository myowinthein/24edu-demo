import { NextRequest, NextResponse } from 'next/server';
import { redis, SOURCES_KEY } from '@/lib/redis';
import { vectorIndex, chunkVectorId } from '@/lib/vector';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SourceEntry } from '@/lib/types';

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cells.push(cell); cell = ''; }
      else cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sources = (await redis.get<SourceEntry[]>(SOURCES_KEY)) ?? [];
  const source = sources.find((s) => s.id === params.id);
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ids = Array.from({ length: source.chunkCount }, (_, i) => chunkVectorId(params.id, i));
  const fetched = await vectorIndex.fetch(ids, { includeMetadata: true });

  // Collect per-sheet data. Key = sheet name (empty string = flat CSV).
  const sheetMap = new Map<string, { headers: string[]; rows: string[][] }>();
  let isMultiSheet = false;

  for (const item of fetched) {
    if (!item) continue;
    const text = (item.metadata as { text?: string })?.text ?? '';
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) continue;

    // Multi-sheet: lines[0] = "Sheet: <name>", lines[1] = header, lines[2+] = data
    // Flat CSV:    lines[0] = header, lines[1+] = data
    if (lines[0].startsWith('Sheet:')) {
      isMultiSheet = true;
      const sheetName = lines[0].replace(/^Sheet:\s*/, '').trim();
      const headers = parseCSVLine(lines[1]);
      const dataRows = lines.slice(2).map(parseCSVLine);
      if (!sheetMap.has(sheetName)) sheetMap.set(sheetName, { headers, rows: [] });
      const target = sheetMap.get(sheetName)!.rows;
      for (const row of dataRows) target.push(row);
    } else {
      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map(parseCSVLine);
      if (!sheetMap.has('')) sheetMap.set('', { headers, rows: [] });
      const target = sheetMap.get('')!.rows;
      for (const row of dataRows) target.push(row);
    }
  }

  if (isMultiSheet) {
    const sheets = [...sheetMap.entries()].map(([name, { headers, rows }]) => ({
      name,
      headers,
      rows,
    }));
    return NextResponse.json({ type: 'multi-sheet', sheets });
  }

  const flat = sheetMap.get('') ?? { headers: [], rows: [] };
  return NextResponse.json({ type: 'flat', headers: flat.headers, rows: flat.rows });
}
