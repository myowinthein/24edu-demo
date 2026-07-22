import { describe, it, expect, vi } from 'vitest'

vi.mock('@upstash/vector', () => ({
  Index: class {
    constructor() {}
    upsert = vi.fn()
    delete = vi.fn()
    query = vi.fn()
  },
}))

import { chunkCsv, chunkVectorId, VECTOR_CHUNK_SIZE } from '@/lib/vector'

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
    expect(chunks[0]).toContain('File: data.csv')
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

  it('each flat chunk includes the filename prefix', () => {
    const csv = 'A,B\n1,2'
    const [chunk] = chunkCsv(csv, 'my-file.csv')
    expect(chunk.startsWith('File: my-file.csv\n')).toBe(true)
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

  it('includes filename, sheet name, and data in each chunk', () => {
    const chunks = chunkCsv(multiSheet, 'workbook.xlsx')
    const programsChunk = chunks.find((c) => c.includes('Sheet: Programs'))
    expect(programsChunk).toBeDefined()
    expect(programsChunk).toContain('File: workbook.xlsx')
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
