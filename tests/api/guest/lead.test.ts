import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/redis', () => ({
  redis: { get: mockGet },
  leadKey: (id: string) => `lead:${id}`,
}))

import { GET } from '@/app/api/guest/[guestId]/lead/route'

const VALID_GUEST = '550e8400-e29b-41d4-a716-446655440000'

function makeReq(guestId: string) {
  return new NextRequest(`http://localhost/api/guest/${guestId}/lead`)
}
function makeParams(guestId: string) {
  return { params: { guestId } }
}

beforeEach(() => mockGet.mockReset())

describe('GET /api/guest/[guestId]/lead', () => {
  it('returns 400 for non-UUID guestId', async () => {
    const res = await GET(makeReq('not-a-uuid'), makeParams('not-a-uuid'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid/i)
  })

  it('returns 404 when no lead found for valid guestId', async () => {
    mockGet.mockResolvedValue(null)
    const res = await GET(makeReq(VALID_GUEST), makeParams(VALID_GUEST))
    expect(res.status).toBe(404)
  })

  it('returns the lead data for a valid guestId with existing lead', async () => {
    const lead = { guestId: VALID_GUEST, name: 'Alice', email: 'alice@example.com' }
    mockGet.mockResolvedValue(lead)
    const res = await GET(makeReq(VALID_GUEST), makeParams(VALID_GUEST))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Alice')
  })
})
