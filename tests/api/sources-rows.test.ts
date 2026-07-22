import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: vi.fn().mockResolvedValue(true),
}))

const mockFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/vector', () => ({
  vectorIndex: { fetch: mockFetch },
  chunkVectorId: (sourceId: string, i: number) => `${sourceId}_chunk_${i}`,
}))

const mockGet = vi.hoisted(() => vi.fn())
vi.mock('@/lib/redis', () => ({
  redis: { get: mockGet },
  SOURCES_KEY: 'sources:list',
}))

import { GET } from '@/app/api/sources/[id]/rows/route'

const SOURCE_ID = 'src-123'

function makeReq(id = SOURCE_ID) {
  return new NextRequest(`http://localhost/api/sources/${id}/rows`, {
    headers: { Cookie: 'admin_token=t' },
  })
}

function makeParams(id = SOURCE_ID) {
  return { params: { id } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/sources/[id]/rows — 404 for unknown source', () => {
  it('returns 404 when source id not found in stored sources', async () => {
    mockGet.mockResolvedValue([{ id: 'other-id', chunkCount: 2 }])
    mockFetch.mockResolvedValue([])
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })
})

describe('GET /api/sources/[id]/rows — flat CSV dispatch', () => {
  it('returns type: flat with headers and rows', async () => {
    mockGet.mockResolvedValue([{ id: SOURCE_ID, chunkCount: 1 }])
    mockFetch.mockResolvedValue([{
      id: `${SOURCE_ID}_chunk_0`,
      metadata: { text: 'File: test.csv\nName,Age\nAlice,30\nBob,25' },
    }])
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('flat')
    expect(body.headers).toEqual(['Name', 'Age'])
    expect(body.rows).toContainEqual(['Alice', '30'])
    expect(body.rows).toContainEqual(['Bob', '25'])
  })
})

describe('GET /api/sources/[id]/rows — multi-sheet dispatch', () => {
  it('returns type: multi-sheet with named sheets', async () => {
    mockGet.mockResolvedValue([{ id: SOURCE_ID, chunkCount: 2 }])
    mockFetch.mockResolvedValue([
      {
        id: `${SOURCE_ID}_chunk_0`,
        metadata: { text: 'File: wb.xlsx\nSheet: Programs\nName,Duration\nMBA,2 years' },
      },
      {
        id: `${SOURCE_ID}_chunk_1`,
        metadata: { text: 'File: wb.xlsx\nSheet: Fees\nProgram,Cost\nMBA,50000' },
      },
    ])
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('multi-sheet')
    expect(body.sheets).toHaveLength(2)
    const names = body.sheets.map((s: { name: string }) => s.name)
    expect(names).toContain('Programs')
    expect(names).toContain('Fees')
  })
})

describe('GET /api/sources/[id]/rows — parseCSVLine (via flat CSV chunks)', () => {
  function setupSource(text: string) {
    mockGet.mockResolvedValue([{ id: SOURCE_ID, chunkCount: 1 }])
    mockFetch.mockResolvedValue([{ id: `${SOURCE_ID}_chunk_0`, metadata: { text } }])
  }

  it('splits plain comma-separated fields', async () => {
    setupSource('File: t.csv\nA,B,C\n1,2,3')
    const body = await (await GET(makeReq(), makeParams())).json()
    expect(body.headers).toEqual(['A', 'B', 'C'])
    expect(body.rows[0]).toEqual(['1', '2', '3'])
  })

  it('handles quoted fields containing commas', async () => {
    setupSource('File: t.csv\nName,Value\n"Smith, John",100')
    const body = await (await GET(makeReq(), makeParams())).json()
    expect(body.rows[0][0]).toBe('Smith, John')
    expect(body.rows[0][1]).toBe('100')
  })

  it('handles escaped double quotes (doubled quotes inside quoted field)', async () => {
    setupSource('File: t.csv\nNote\n"say ""hello"""')
    const body = await (await GET(makeReq(), makeParams())).json()
    expect(body.rows[0][0]).toBe('say "hello"')
  })

  it('handles empty cells', async () => {
    setupSource('File: t.csv\nA,B,C\n1,,3')
    const body = await (await GET(makeReq(), makeParams())).json()
    expect(body.rows[0]).toEqual(['1', '', '3'])
  })

  it('skips chunks with fewer than 3 lines', async () => {
    setupSource('File: t.csv\nOnlyHeader')
    const body = await (await GET(makeReq(), makeParams())).json()
    expect(body.rows).toHaveLength(0)
  })
})
