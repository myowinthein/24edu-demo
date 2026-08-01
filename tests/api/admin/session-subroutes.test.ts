import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { mockAdminAuthModule } from '@/tests/helpers/mock-admin-auth'

vi.mock('@/lib/admin-auth', () => mockAdminAuthModule())

import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const mockSetSessionMode = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/lib/session-actions', () => ({ setSessionMode: mockSetSessionMode }))

const mockPublish = vi.hoisted(() => ({
  publishSession: vi.fn().mockResolvedValue(undefined),
  publishTyping:  vi.fn().mockResolvedValue(undefined),
  publishSessions: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/pubsub', () => mockPublish)

const redisMocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  zadd: vi.fn().mockResolvedValue(0),
}))
vi.mock('@/lib/redis', () => ({
  redis: {
    get: redisMocks.get,
    set: redisMocks.set,
    zadd: redisMocks.zadd,
  },
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
  sessionModeKey:     (id: string) => `session:${id}:mode`,
  SESSIONS_ACTIVE_KEY: 'sessions:active',
}))

import { POST as joinPOST }    from '@/app/api/admin/sessions/[id]/join/route'
import { POST as leavePOST }   from '@/app/api/admin/sessions/[id]/leave/route'
import { POST as messagePOST } from '@/app/api/admin/sessions/[id]/message/route'
import { POST as typingPOST }  from '@/app/api/admin/sessions/[id]/typing/route'
import { GET  as sessionGET }  from '@/app/api/admin/sessions/[id]/route'

const SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const makeParams = (id = SESSION) => ({ params: { id } })
const makeReq = (path: string, body?: unknown) =>
  new NextRequest(`http://localhost/api/admin/sessions/${SESSION}/${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=tok' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
  redisMocks.get.mockResolvedValue(null)
  redisMocks.set.mockResolvedValue('OK')
  redisMocks.zadd.mockResolvedValue(0)
})

// ── JOIN ─────────────────────────────────────────────────────────────────────
describe('POST /api/admin/sessions/[id]/join', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await joinPOST(makeReq('join'), makeParams())
    expect(res.status).toBe(401)
  })

  it('calls setSessionMode with "human" and returns ok', async () => {
    const res = await joinPOST(makeReq('join'), makeParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockSetSessionMode).toHaveBeenCalledWith(SESSION, 'human')
  })
})

// ── LEAVE ────────────────────────────────────────────────────────────────────
describe('POST /api/admin/sessions/[id]/leave', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await leavePOST(makeReq('leave'), makeParams())
    expect(res.status).toBe(401)
  })

  it('calls setSessionMode with "ai" and returns ok', async () => {
    const res = await leavePOST(makeReq('leave'), makeParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockSetSessionMode).toHaveBeenCalledWith(SESSION, 'ai')
  })
})

// ── MESSAGE ──────────────────────────────────────────────────────────────────
describe('POST /api/admin/sessions/[id]/message', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await messagePOST(makeReq('message', { text: 'hi' }), makeParams())
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing text', async () => {
    const res = await messagePOST(makeReq('message', {}), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 400 for text exceeding 4000 chars', async () => {
    const res = await messagePOST(makeReq('message', { text: 'x'.repeat(4001) }), makeParams())
    expect(res.status).toBe(400)
  })

  it('appends message, publishes, and returns ok', async () => {
    const existing = [{ role: 'guest', text: 'Hello', timestamp: '2024-01-01T00:00:00Z' }]
    redisMocks.get
      .mockResolvedValueOnce(existing) // sessionMessages
      .mockResolvedValueOnce('human')  // sessionMode
    const res = await messagePOST(makeReq('message', { text: 'Reply here' }), makeParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockPublish.publishSession).toHaveBeenCalledOnce()
    expect(mockPublish.publishSessions).toHaveBeenCalledOnce()
  })
})

// ── TYPING ───────────────────────────────────────────────────────────────────
describe('POST /api/admin/sessions/[id]/typing', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await typingPOST(makeReq('typing'), makeParams())
    expect(res.status).toBe(401)
  })

  it('publishes typing event and returns ok', async () => {
    const res = await typingPOST(makeReq('typing'), makeParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockPublish.publishTyping).toHaveBeenCalledWith(SESSION)
  })
})

// ── GET /api/admin/sessions/[id] ─────────────────────────────────────────────
describe('GET /api/admin/sessions/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await sessionGET(makeReq(''), makeParams())
    expect(res.status).toBe(401)
  })

  it('returns messages and mode from Redis', async () => {
    const msgs = [{ role: 'guest', text: 'hi', timestamp: '2024-01-01T00:00:00Z' }]
    redisMocks.get
      .mockResolvedValueOnce(msgs)
      .mockResolvedValueOnce('ai')
    const res = await sessionGET(makeReq(''), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toEqual(msgs)
    expect(body.mode).toBe('ai')
  })

  it('returns empty messages and "ai" mode when nothing is stored', async () => {
    redisMocks.get.mockResolvedValue(null)
    const res = await sessionGET(makeReq(''), makeParams())
    const body = await res.json()
    expect(body.messages).toEqual([])
    expect(body.mode).toBe('ai')
  })
})
