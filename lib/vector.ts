import { Index } from '@upstash/vector';

if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
  throw new Error('UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set');
}

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

export const VECTOR_CHUNK_SIZE = 5;
export const VECTOR_TOP_K = 6;
export const VECTOR_MIN_SCORE = 0.4;

export function chunkCsv(csv: string, _filename: string): string[] {
  // Multi-section format produced by xlsxToCSV for Excel files
  if (csv.startsWith('# Sheet:') || csv.includes('\n# Sheet:')) {
    const chunks: string[] = [];
    const sections = csv.split(/(?=^# Sheet: )/m).filter((s) => s.trim());
    for (const section of sections) {
      const lines = section.split('\n').filter((l) => l.trim());
      if (lines.length < 3) continue;
      const sheetName = lines[0].replace(/^# Sheet: /, '').trim();
      const header = lines[1];
      const dataRows = lines.slice(2);
      for (let i = 0; i < dataRows.length; i += VECTOR_CHUNK_SIZE) {
        const rows = dataRows.slice(i, i + VECTOR_CHUNK_SIZE);
        chunks.push(`Sheet: ${sheetName}\n${header}\n${rows.join('\n')}`);
      }
    }
    return chunks;
  }

  // Flat CSV format (direct .csv uploads)
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0];
  const dataRows = lines.slice(1);
  const chunks: string[] = [];
  for (let i = 0; i < dataRows.length; i += VECTOR_CHUNK_SIZE) {
    const rows = dataRows.slice(i, i + VECTOR_CHUNK_SIZE);
    chunks.push(`${header}\n${rows.join('\n')}`);
  }
  return chunks;
}

export function chunkVectorId(sourceId: string, chunkIndex: number) {
  return `${sourceId}_chunk_${chunkIndex}`;
}

export async function indexSource(sourceId: string, filename: string, csv: string): Promise<number> {
  const chunks = chunkCsv(csv, filename);
  if (chunks.length === 0) return 0;

  const BATCH = 10;
  const batches: Promise<unknown>[] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    batches.push(
      vectorIndex.upsert(
        chunks.slice(i, i + BATCH).map((text, j) => ({
          id: chunkVectorId(sourceId, i + j),
          data: text,
          metadata: { sourceId, chunkIndex: i + j, text },
        }))
      )
    );
  }
  await Promise.all(batches);

  return chunks.length;
}

export async function deleteSourceVectors(sourceId: string, chunkCount: number) {
  const ids = Array.from({ length: chunkCount }, (_, i) => chunkVectorId(sourceId, i));
  await vectorIndex.delete(ids);
}

export async function queryRelevantChunks(question: string, topK = VECTOR_TOP_K): Promise<string[]> {
  const results = await vectorIndex.query({
    data: question,
    topK,
    includeMetadata: true,
  });
  return results
    .filter((r) => r.score >= VECTOR_MIN_SCORE)
    .map((r) => (r.metadata as { text: string }).text)
    .filter(Boolean);
}
