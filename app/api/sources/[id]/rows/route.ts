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

  let headers: string[] | null = null;
  const rows: string[][] = [];

  for (const item of fetched) {
    if (!item) continue;
    const text = (item.metadata as { text?: string })?.text ?? '';
    // chunk format: "File: <name>\n<header>\n<row>..."
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) continue;
    if (!headers) headers = parseCSVLine(lines[1]);
    for (let i = 2; i < lines.length; i++) {
      rows.push(parseCSVLine(lines[i]));
    }
  }

  return NextResponse.json({ headers: headers ?? [], rows });
}
