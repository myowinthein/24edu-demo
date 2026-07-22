import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: vi.fn().mockResolvedValue(true),
}))
import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const mockPublish = vi.hoisted(() => ({
  publishSession:  vi.fn().mockResolvedValue(undefined),
  publishSessions: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/pubsub', () => mockPublish)

const redisMocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
}))
vi.mock('@/lib/redis', () => ({
  redis: {
    get: redisMocks.get,
    set: redisMocks.set,
  },
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
  sessionModeKey:     (id: string) => `session:${id}:mode`,
  sessionMetaKey:     (id: string) => `session:${id}:meta`,
}))

import { POST as endPOST }      from '@/app/api/session/[id]/end/route'
import { POST as switchAIPOST } from '@/app/api/session/[id]/switch-ai/route'

const SESSION  = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const GUEST    = '11111111-2222-3333-4444-555555555555'
const GUEST2   = 'aaaaaaaa-bbbb-cccc-dddd-000000000000'

function makeEndReq(id: string, body?: object) {
  return new NextRequest(`http://localhost/api/session/${id}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
}
function makeSwitchReq(id: string) {
  return new NextRequest(`http://localhost/api/session/${id}/switch-ai`, {
    method: 'POST',
    headers: { Cookie: 'admin_token=tok' },
  })
}
const makeEndParams    = (id = SESSION) => ({ params: { id } })
const makeSwitchParams = (id = SESSION) => ({ params: { id } })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
  redisMocks.get.mockResolvedValue(null)
  redisMocks.set.mockResolvedValue('OK')
})

// ── END SESSION ───────────────────────────────────────────────────────────────
describe('POST /api/session/[id]/end', () => {
  it('returns 400 for non-UUID session id', async () => {
    const res = await endPOST(makeEndReq('not-a-uuid'), makeEndParams('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when session messages do not exist', async () => {
    redisMocks.get.mockResolvedValue(null)
    const res = await endPOST(makeEndReq(SESSION), makeEndParams())
    expect(res.status).toBe(404)
  })

  it('returns 403 when guestId does not match meta', async () => {
    redisMocks.get
      .mockResolvedValueOnce([])                 // messages
      .mockResolvedValueOnce({ guestId: GUEST }) // meta
    const res = await endPOST(makeEndReq(SESSION, { guestId: GUEST2 }), makeEndParams())
    expect(res.status).toBe(403)
  })

  it('ends session when guestIds match and publishes events', async () => {
    redisMocks.get
      .mockResolvedValueOnce([])                 // messages
      .mockResolvedValueOnce({ guestId: GUEST }) // meta
    const res = await endPOST(makeEndReq(SESSION, { guestId: GUEST }), makeEndParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(redisMocks.set).toHaveBeenCalledWith(expect.stringContaining(':mode'), 'ended')
    expect(mockPublish.publishSession).toHaveBeenCalledOnce()
    expect(mockPublish.publishSessions).toHaveBeenCalledOnce()
  })

  it('ends session with no guestId check when body has no guestId', async () => {
    redisMocks.get
      .mockResolvedValueOnce([{ role: 'guest', text: 'hi', timestamp: 't' }])
      .mockResolvedValueOnce({ guestId: GUEST })
    const res = await endPOST(makeEndReq(SESSION, {}), makeEndParams())
    expect(res.status).toBe(200)
  })
})

// ── SWITCH TO AI ─────────────────────────────────────────────────────────────
describe('POST /api/session/[id]/switch-ai', () => {
  it('returns 400 for non-UUID session id', async () => {
    const res = await switchAIPOST(makeSwitchReq('bad-id'), makeSwitchParams('bad-id'))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await switchAIPOST(makeSwitchReq(SESSION), makeSwitchParams())
    expect(res.status).toBe(401)
  })

  it('sets mode to "ai", publishes, and returns ok', async () => {
    redisMocks.get.mockResolvedValue([])
    const res = await switchAIPOST(makeSwitchReq(SESSION), makeSwitchParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockPublish.publishSession).toHaveBeenCalledWith(SESSION, { messages: [], mode: 'ai' })
    expect(mockPublish.publishSessions).toHaveBeenCalledOnce()
  })
})
