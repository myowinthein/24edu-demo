import { Index } from '@upstash/vector';

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

const CHUNK_SIZE = 5;

export function chunkCsv(csv: string, filename: string): string[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0];
  const dataRows = lines.slice(1);
  const chunks: string[] = [];
  for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
    const rows = dataRows.slice(i, i + CHUNK_SIZE);
    chunks.push(`File: ${filename}\n${header}\n${rows.join('\n')}`);
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
  for (let i = 0; i < chunks.length; i += BATCH) {
    await vectorIndex.upsert(
      chunks.slice(i, i + BATCH).map((text, j) => ({
        id: chunkVectorId(sourceId, i + j),
        data: text,
        metadata: { sourceId, chunkIndex: i + j, text },
      }))
    );
  }

  return chunks.length;
}

export async function deleteSourceVectors(sourceId: string, chunkCount: number) {
  const ids = Array.from({ length: chunkCount }, (_, i) => chunkVectorId(sourceId, i));
  await vectorIndex.delete(ids);
}

export async function queryRelevantChunks(question: string, topK = 6): Promise<string[]> {
  const results = await vectorIndex.query({
    data: question,
    topK,
    includeMetadata: true,
  });
  return results
    .filter((r) => r.score > 0.4)
    .map((r) => (r.metadata as { text: string }).text)
    .filter(Boolean);
}
