import { describe, it, expect, vi, beforeEach } from 'vitest'

const vectorMocks = vi.hoisted(() => ({
  upsert: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  query:  vi.fn().mockResolvedValue([]),
}))

vi.mock('@upstash/vector', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Index: vi.fn(function () { return vectorMocks as any }),
}))

import {
  chunkCsv, chunkVectorId, VECTOR_CHUNK_SIZE,
  indexSource, deleteSourceVectors, queryRelevantChunks, VECTOR_MIN_SCORE,
} from '@/lib/vector'

beforeEach(() => {
  vectorMocks.upsert.mockReset().mockResolvedValue(undefined)
  vectorMocks.delete.mockReset().mockResolvedValue(undefined)
  vectorMocks.query.mockReset().mockResolvedValue([])
})

describe('chunkVectorId', () => {
  it('produces a stable, predictable key', () => {
    expect(chunkVectorId('src-abc', 0)).toBe('src-abc_chunk_0')
    expect(chunkVectorId('src-abc', 5)).toBe('src-abc_chunk_5')
  })

  it('is deterministic — same inputs produce the same id', () => {
    expect(chunkVectorId('x', 3)).toBe(chunkVectorId('x', 3))
  })
})

describe('chunkCsv — flat CSV', () => {
  it('returns empty array for empty input', () => {
    expect(chunkCsv('', 'test.csv')).toEqual([])
  })

  it('returns empty array for header-only CSV (1 line)', () => {
    expect(chunkCsv('Name,Age', 'test.csv')).toEqual([])
  })

  it('chunks a simple flat CSV into one chunk when rows < CHUNK_SIZE', () => {
    const csv = 'Name,Age\nAlice,30\nBob,25'
    const chunks = chunkCsv(csv, 'data.csv')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('Name,Age')
    expect(chunks[0]).toContain('Alice,30')
    expect(chunks[0]).toContain('Bob,25')
  })

  it(`creates multiple chunks when data rows exceed ${VECTOR_CHUNK_SIZE}`, () => {
    const rows = Array.from({ length: VECTOR_CHUNK_SIZE + 2 }, (_, i) => `Row${i},${i}`)
    const csv = ['Name,Num', ...rows].join('\n')
    const chunks = chunkCsv(csv, 'big.csv')
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toContain('Name,Num')
    expect(chunks[1]).toContain('Name,Num')
  })

  it('each flat chunk starts directly with the header row', () => {
    const csv = 'A,B\n1,2'
    const [chunk] = chunkCsv(csv, 'my-file.csv')
    expect(chunk.startsWith('A,B\n')).toBe(true)
    expect(chunk).not.toContain('File:')
  })
})

describe('chunkCsv — multi-sheet format', () => {
  const multiSheet = [
    '# Sheet: Programs',
    'Name,Duration',
    'MBA,2 years',
    'BSc,4 years',
    '',
    '# Sheet: Fees',
    'Program,Amount',
    'MBA,50000',
  ].join('\n')

  it('detects multi-sheet format by # Sheet: marker', () => {
    const chunks = chunkCsv(multiSheet, 'workbook.xlsx')
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('includes sheet name and data in each chunk, but not the filename', () => {
    const chunks = chunkCsv(multiSheet, 'workbook.xlsx')
    const programsChunk = chunks.find((c) => c.includes('Sheet: Programs'))
    expect(programsChunk).toBeDefined()
    expect(programsChunk).not.toContain('File:')
    expect(programsChunk).toContain('Name,Duration')
  })

  it('skips sheet sections with fewer than 3 lines', () => {
    const tiny = '# Sheet: Empty\nHeader\n# Sheet: Real\nName,Val\nAlice,1'
    const chunks = chunkCsv(tiny, 'test.xlsx')
    const emptyChunks = chunks.filter((c) => c.includes('Sheet: Empty'))
    expect(emptyChunks).toHaveLength(0)
    const realChunks = chunks.filter((c) => c.includes('Sheet: Real'))
    expect(realChunks.length).toBeGreaterThan(0)
  })
})

describe('indexSource', () => {
  it('returns 0 and does not call upsert for an empty CSV', async () => {
    const count = await indexSource('src-1', 'empty.csv', '')
    expect(count).toBe(0)
    expect(vectorMocks.upsert).not.toHaveBeenCalled()
  })

  it('returns 0 for header-only CSV', async () => {
    const count = await indexSource('src-2', 'hdr.csv', 'Name,Age')
    expect(count).toBe(0)
  })

  it('calls upsert with the correct id/data/metadata for each chunk', async () => {
    const csv = 'Name,Age\nAlice,30\nBob,25'
    const count = await indexSource('src-3', 'data.csv', csv)
    expect(count).toBe(1)
    expect(vectorMocks.upsert).toHaveBeenCalledOnce()
    const [items] = vectorMocks.upsert.mock.calls[0] as [Array<{ id: string; data: string; metadata: { sourceId: string; text: string } }>]
    expect(items[0].id).toBe('src-3_chunk_0')
    expect(items[0].metadata.sourceId).toBe('src-3')
    expect(items[0].data).toContain('Name,Age')
  })

  it('returns the total chunk count', async () => {
    const rows = Array.from({ length: VECTOR_CHUNK_SIZE + 1 }, (_, i) => `R${i},${i}`)
    const csv = ['Name,Num', ...rows].join('\n')
    const count = await indexSource('src-4', 'big.csv', csv)
    expect(count).toBe(2)
  })

  it('splits into multiple upsert batches of 10 when chunk count exceeds the batch size', async () => {
    // 55 data rows / VECTOR_CHUNK_SIZE(5) = 11 chunks -> batches of [10, 1]
    const rows = Array.from({ length: VECTOR_CHUNK_SIZE * 11 }, (_, i) => `R${i},${i}`)
    const csv = ['Name,Num', ...rows].join('\n')
    const count = await indexSource('src-5', 'huge.csv', csv)
    expect(count).toBe(11)
    expect(vectorMocks.upsert).toHaveBeenCalledTimes(2)
    const [firstBatch] = vectorMocks.upsert.mock.calls[0] as [unknown[]]
    const [secondBatch] = vectorMocks.upsert.mock.calls[1] as [unknown[]]
    expect(firstBatch).toHaveLength(10)
    expect(secondBatch).toHaveLength(1)
  })
})

describe('deleteSourceVectors', () => {
  it('calls delete with the correct list of chunk ids', async () => {
    await deleteSourceVectors('src-5', 3)
    expect(vectorMocks.delete).toHaveBeenCalledOnce()
    const [ids] = vectorMocks.delete.mock.calls[0] as [string[]]
    expect(ids).toEqual(['src-5_chunk_0', 'src-5_chunk_1', 'src-5_chunk_2'])
  })

  it('calls delete with an empty array when chunkCount is 0', async () => {
    await deleteSourceVectors('src-6', 0)
    expect(vectorMocks.delete).toHaveBeenCalledWith([])
  })
})

describe('queryRelevantChunks', () => {
  it('returns empty array when query returns no results', async () => {
    vectorMocks.query.mockResolvedValue([])
    const result = await queryRelevantChunks('test question')
    expect(result).toEqual([])
  })

  it('filters out results with score strictly below VECTOR_MIN_SCORE', async () => {
    vectorMocks.query.mockResolvedValue([
      { score: VECTOR_MIN_SCORE - 0.01, metadata: { text: 'below threshold' } },
    ])
    const result = await queryRelevantChunks('test')
    expect(result).toHaveLength(0)
  })

  it('includes results with score exactly equal to VECTOR_MIN_SCORE (>= threshold)', async () => {
    vectorMocks.query.mockResolvedValue([
      { score: VECTOR_MIN_SCORE, metadata: { text: 'at threshold' } },
    ])
    const result = await queryRelevantChunks('test')
    expect(result).toEqual(['at threshold'])
  })

  it('includes results with score above VECTOR_MIN_SCORE', async () => {
    vectorMocks.query.mockResolvedValue([
      { score: VECTOR_MIN_SCORE + 0.01, metadata: { text: 'relevant chunk' } },
    ])
    const result = await queryRelevantChunks('test')
    expect(result).toEqual(['relevant chunk'])
  })

  it('extracts text from metadata and filters falsy values', async () => {
    vectorMocks.query.mockResolvedValue([
      { score: 0.9, metadata: { text: 'good data' } },
      { score: 0.8, metadata: { text: '' } },
      { score: 0.7, metadata: {} },
    ])
    const result = await queryRelevantChunks('test')
    expect(result).toEqual(['good data'])
  })
})
