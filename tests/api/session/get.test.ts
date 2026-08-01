import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const redisMocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/redis', () => ({
  redis: { get: redisMocks.get },
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
  sessionModeKey:     (id: string) => `session:${id}:mode`,
}))

import { GET } from '@/app/api/session/[id]/route'

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/session/${id}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  redisMocks.get.mockResolvedValue(null)
})

describe('GET /api/session/[id] — input validation', () => {
  it('returns 400 for a non-UUID session id', async () => {
    const res = await GET(makeReq('not-a-uuid'), { params: { id: 'not-a-uuid' } })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/session/[id] — success', () => {
  it('returns messages and mode from Redis', async () => {
    const messages = [{ role: 'guest', text: 'hi', timestamp: '2024-01-01T00:00:00Z' }]
    redisMocks.get
      .mockResolvedValueOnce(messages)
      .mockResolvedValueOnce('human')
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const body = await res.json()
    expect(body.messages).toEqual(messages)
    expect(body.mode).toBe('human')
  })

  it('falls back to an empty messages array and "ai" mode when nothing is stored', async () => {
    redisMocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const body = await res.json()
    expect(body.messages).toEqual([])
    expect(body.mode).toBe('ai')
  })
})
