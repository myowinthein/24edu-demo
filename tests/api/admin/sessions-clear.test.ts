import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: vi.fn().mockResolvedValue(true),
}))

const mockPublishSessions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/lib/pubsub', () => ({
  publishSessions: mockPublishSessions,
}))

const mocks = vi.hoisted(() => {
  const pipelineExec = vi.fn().mockResolvedValue([])
  const pipelineGet = vi.fn()
  const pipelineDel = vi.fn()
  const zrange = vi.fn()
  const get = vi.fn()
  return { pipelineExec, pipelineGet, pipelineDel, zrange, get }
})

vi.mock('@/lib/redis', () => ({
  redis: {
    zrange: mocks.zrange,
    get: mocks.get,
    pipeline: vi.fn(() => ({
      get: mocks.pipelineGet.mockReturnThis(),
      del: mocks.pipelineDel.mockReturnThis(),
      exec: mocks.pipelineExec,
    })),
  },
  sessionModeKey:    (id: string) => `session:${id}:mode`,
  sessionMessagesKey:(id: string) => `session:${id}:messages`,
  sessionMetaKey:    (id: string) => `session:${id}:meta`,
  guestSessionsKey:  (gid: string) => `guest:${gid}:sessions`,
  SESSIONS_ACTIVE_KEY: 'sessions:active',
}))

import { GET, POST } from '@/app/api/admin/sessions/clear/route'

const makeReq = () => new NextRequest('http://localhost/api/admin/sessions/clear')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.pipelineGet.mockReturnThis()
  mocks.pipelineDel.mockReturnThis()
  mocks.pipelineExec.mockResolvedValue([])
})

describe('GET /api/admin/sessions/clear — mode counts', () => {
  it('counts null mode as ai', async () => {
    mocks.zrange.mockResolvedValue(['s1'])
    mocks.pipelineExec.mockResolvedValue([null])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.ai).toBe(1)
    expect(body.human).toBe(0)
  })

  it('counts "ai" mode as ai', async () => {
    mocks.zrange.mockResolvedValue(['s1'])
    mocks.pipelineExec.mockResolvedValue(['ai'])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.ai).toBe(1)
    expect(body.human).toBe(0)
  })

  it('counts "requested" mode as human', async () => {
    mocks.zrange.mockResolvedValue(['s1'])
    mocks.pipelineExec.mockResolvedValue(['requested'])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.human).toBe(1)
    expect(body.ai).toBe(0)
  })

  it('counts "human" mode as human', async () => {
    mocks.zrange.mockResolvedValue(['s1'])
    mocks.pipelineExec.mockResolvedValue(['human'])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.human).toBe(1)
    expect(body.ai).toBe(0)
  })

  it('totals correctly with mixed modes', async () => {
    mocks.zrange.mockResolvedValue(['s1', 's2', 's3', 's4'])
    mocks.pipelineExec.mockResolvedValue([null, 'ai', 'requested', 'human'])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.total).toBe(4)
    expect(body.ai).toBe(2)
    expect(body.human).toBe(2)
  })
})

describe('POST /api/admin/sessions/clear — session clearing', () => {
  it('returns cleared: 0 when no sessions exist', async () => {
    mocks.zrange.mockResolvedValue([])
    const res = await POST(makeReq())
    const body = await res.json()
    expect(body.cleared).toBe(0)
  })

  it('returns the number of cleared sessions', async () => {
    mocks.zrange.mockResolvedValue(['s1', 's2'])
    mocks.pipelineExec
      .mockResolvedValueOnce([{ guestId: 'g1' }, { guestId: 'g2' }]) // meta pipeline
      .mockResolvedValueOnce([]) // del pipeline
    const res = await POST(makeReq())
    const body = await res.json()
    expect(body.cleared).toBe(2)
  })

  it('deduplicates guestIds so each guest key is only deleted once', async () => {
    mocks.zrange.mockResolvedValue(['s1', 's2', 's3'])
    mocks.pipelineExec
      .mockResolvedValueOnce([{ guestId: 'g1' }, { guestId: 'g1' }, { guestId: 'g2' }]) // meta pipeline
      .mockResolvedValueOnce([]) // del pipeline
    await POST(makeReq())
    // publishSessions should fire once after clearing
    expect(mockPublishSessions).toHaveBeenCalledOnce()
    // Two unique guestIds → 2 del calls for guestSessionsKey
    const delCalls = mocks.pipelineDel.mock.calls.map(([key]: [string]) => key)
    const guestDelCalls = delCalls.filter((k) => k.startsWith('guest:'))
    expect(guestDelCalls).toHaveLength(2)
  })
})
