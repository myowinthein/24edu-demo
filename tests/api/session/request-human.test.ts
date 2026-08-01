import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const redisMocks = vi.hoisted(() => ({
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    set: redisMocks.set,
    get: redisMocks.get,
  },
  sessionModeKey:    (id: string) => `session:${id}:mode`,
  sessionMessagesKey:(id: string) => `session:${id}:messages`,
  sessionMetaKey:    (id: string) => `session:${id}:meta`,
}))

vi.mock('@/lib/pubsub', () => ({
  publishSession:  vi.fn().mockResolvedValue(undefined),
  publishSessions: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/session/[id]/request-human/route'

const SESSION = '550e8400-e29b-41d4-a716-446655440000'

function makeReq(body: unknown, sessionId = SESSION) {
  return new NextRequest(`http://localhost/api/session/${sessionId}/request-human`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function makeParams(id = SESSION) {
  return { params: { id } }
}

beforeEach(() => {
  vi.clearAllMocks()
  redisMocks.get.mockResolvedValue(null)
})

describe('POST /api/session/[id]/request-human — input validation', () => {
  it('returns 400 for a non-UUID session id', async () => {
    const res = await POST(makeReq({}, 'sess-0001'), makeParams('sess-0001'))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/session/[id]/request-human — ownership check', () => {
  it('returns 403 when guestId does not match stored meta.guestId', async () => {
    redisMocks.get
      .mockResolvedValueOnce(null)                     // mode
      .mockResolvedValueOnce([])                       // messages
      .mockResolvedValueOnce({ guestId: 'real-guest' }) // meta
    const res = await POST(makeReq({ guestId: 'attacker-guest' }), makeParams())
    expect(res.status).toBe(403)
  })

  it('proceeds when guestId matches stored meta.guestId', async () => {
    redisMocks.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ guestId: 'guest-abc' })
    const res = await POST(makeReq({ guestId: 'guest-abc' }), makeParams())
    expect(res.status).toBe(200)
  })

  it('proceeds when no guestId is provided (ownership check skipped)', async () => {
    const res = await POST(makeReq({}), makeParams())
    expect(res.status).toBe(200)
  })
})

describe('POST /api/session/[id]/request-human — mode idempotency', () => {
  it('writes "requested" mode when current mode is null', async () => {
    await POST(makeReq({}), makeParams())
    expect(redisMocks.set).toHaveBeenCalledWith(`session:${SESSION}:mode`, 'requested')
  })

  it('writes "requested" mode when current mode is "ai"', async () => {
    redisMocks.get
      .mockResolvedValueOnce('ai')  // mode
      .mockResolvedValueOnce([])    // messages
      .mockResolvedValueOnce(null)  // meta
    await POST(makeReq({}), makeParams())
    expect(redisMocks.set).toHaveBeenCalledWith(`session:${SESSION}:mode`, 'requested')
  })

  it('does NOT write mode when already "requested"', async () => {
    redisMocks.get
      .mockResolvedValueOnce('requested')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
    await POST(makeReq({}), makeParams())
    expect(redisMocks.set).not.toHaveBeenCalled()
  })

  it('does NOT write mode when already "human"', async () => {
    redisMocks.get
      .mockResolvedValueOnce('human')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
    await POST(makeReq({}), makeParams())
    expect(redisMocks.set).not.toHaveBeenCalled()
  })

  it('always returns { ok: true }', async () => {
    const res = await POST(makeReq({}), makeParams())
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
