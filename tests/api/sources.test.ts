import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { mockAdminAuthModule } from '@/tests/helpers/mock-admin-auth'

vi.mock('@/lib/admin-auth', () => mockAdminAuthModule())
import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const mockIndexSource = vi.hoisted(() => vi.fn().mockResolvedValue(3))
vi.mock('@/lib/vector', () => ({ indexSource: mockIndexSource }))

const sourceMocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue('OK'),
}))

vi.mock('@/lib/redis', () => ({
  redis: { get: sourceMocks.get, set: sourceMocks.set },
  SOURCES_KEY: 'sources:list',
}))

import { GET, POST } from '@/app/api/sources/route'

function makeReq(csv: string, filename = 'test.csv') {
  return new NextRequest('http://localhost/api/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=t' },
    body: JSON.stringify({ csv, filename }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
  sourceMocks.get.mockResolvedValue([])
  mockIndexSource.mockResolvedValue(3)
})

describe('GET /api/sources', () => {
  it('returns the persisted source list', async () => {
    const sources = [{ id: 's1', filename: 'a.csv', rowCount: 2, uploadedAt: '2024-01-01T00:00:00Z', chunkCount: 1 }]
    sourceMocks.get.mockResolvedValue(sources)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(sources)
  })

  it('returns an empty array when no sources are stored', async () => {
    sourceMocks.get.mockResolvedValue(null)
    const res = await GET()
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe('POST /api/sources — auth guard', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await POST(makeReq('Name,Age\nAlice,30'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/sources — rowCount for flat CSV', () => {
  it('counts data rows (total lines minus 1 header)', async () => {
    const csv = 'Name,Age\nAlice,30\nBob,25\nCarol,28'
    await POST(makeReq(csv))
    const [, sources] = sourceMocks.set.mock.calls[0]
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(3)
  })

  it('handles a CSV with only a header (0 data rows)', async () => {
    const csv = 'Name,Age'
    await POST(makeReq(csv))
    const [, sources] = sourceMocks.set.mock.calls[0]
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(0)
  })

  it('ignores blank lines in flat CSV', async () => {
    const csv = 'Name,Age\nAlice,30\n\nBob,25\n'
    await POST(makeReq(csv))
    const [, sources] = sourceMocks.set.mock.calls[0]
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(2)
  })
})

describe('POST /api/sources — rowCount for multi-sheet CSV', () => {
  it('sums data rows across sheets (minus sheet-marker and header per section)', async () => {
    const csv = [
      '# Sheet: Programs',
      'Name,Duration',
      'MBA,2 years',
      'BSc,4 years',
      '',
      '# Sheet: Fees',
      'Program,Cost',
      'MBA,50000',
    ].join('\n')
    await POST(makeReq(csv, 'workbook.xlsx'))
    const [, sources] = sourceMocks.set.mock.calls[0]
    // Programs: 4 lines - 2 = 2, Fees: 3 lines - 2 = 1 → total 3
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(3)
  })

  it('detects multi-sheet format via # Sheet: at start of string', async () => {
    const csv = '# Sheet: OnlySheet\nName\nAlice\nBob'
    await POST(makeReq(csv, 'file.xlsx'))
    const [, sources] = sourceMocks.set.mock.calls[0]
    // 4 lines - 2 = 2
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(2)
  })

  it('detects multi-sheet format via embedded \\n# Sheet:', async () => {
    const csv = 'Name\nAlice\n# Sheet: Extra\nProg\nMBA'
    await POST(makeReq(csv, 'file.xlsx'))
    const [, sources] = sourceMocks.set.mock.calls[0]
    // 'Name\nAlice' (2 lines <3, skipped) + '# Sheet: Extra\nProg\nMBA' (1 data row) → 1
    expect((sources as { rowCount: number }[])[0].rowCount).toBe(1)
  })
})
