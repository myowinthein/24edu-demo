import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { mockAdminAuthModule } from '@/tests/helpers/mock-admin-auth'

vi.mock('@/lib/admin-auth', () => mockAdminAuthModule())
import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const mockDeleteSourceVectors = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/lib/vector', () => ({ deleteSourceVectors: mockDeleteSourceVectors }))

const sourceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue('OK'),
}))
vi.mock('@/lib/redis', () => ({
  redis: { get: sourceMocks.get, set: sourceMocks.set },
  SOURCES_KEY: 'sources:list',
}))

import { DELETE } from '@/app/api/sources/[id]/route'

const SOURCES = [
  { id: 's1', filename: 'a.csv', rowCount: 3, uploadedAt: '2024-01-01T00:00:00Z', chunkCount: 2 },
  { id: 's2', filename: 'b.csv', rowCount: 5, uploadedAt: '2024-01-02T00:00:00Z', chunkCount: 3 },
]

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/sources/${id}`, {
    method: 'DELETE',
    headers: { Cookie: 'admin_token=t' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
  sourceMocks.get.mockResolvedValue([...SOURCES])
  mockDeleteSourceVectors.mockResolvedValue(undefined)
})

describe('DELETE /api/sources/[id] — auth guard', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await DELETE(makeReq('s1'), { params: { id: 's1' } })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/sources/[id] — not found', () => {
  it('returns 404 when no source matches the id', async () => {
    const res = await DELETE(makeReq('missing'), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
    expect(sourceMocks.set).not.toHaveBeenCalled()
    expect(mockDeleteSourceVectors).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/sources/[id] — success', () => {
  it('removes the matching source, persists the remaining list, and deletes its vectors', async () => {
    const res = await DELETE(makeReq('s1'), { params: { id: 's1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([SOURCES[1]])
    expect(sourceMocks.set).toHaveBeenCalledWith('sources:list', [SOURCES[1]])
    expect(mockDeleteSourceVectors).toHaveBeenCalledWith('s1', 2)
  })
})
