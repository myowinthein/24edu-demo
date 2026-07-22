import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminToken: vi.fn().mockResolvedValue(true),
}))
import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const redisMocks = vi.hoisted(() => {
  const pipelineExec = vi.fn().mockResolvedValue([])
  const pipelineDel  = vi.fn()
  return {
    zcard:    vi.fn().mockResolvedValue(0),
    zrange:   vi.fn().mockResolvedValue([]),
    pipelineExec,
    pipelineDel,
  }
})

vi.mock('@/lib/redis', () => ({
  redis: {
    zcard:  redisMocks.zcard,
    zrange: redisMocks.zrange,
    pipeline: vi.fn(() => ({
      del:  redisMocks.pipelineDel.mockReturnThis(),
      exec: redisMocks.pipelineExec,
    })),
  },
  leadKey:      (gid: string) => `lead:${gid}`,
  LEADS_ALL_KEY: 'leads:all',
}))

import { GET, POST } from '@/app/api/admin/leads/clear/route'

const makeReq = () => new NextRequest('http://localhost/api/admin/leads/clear', {
  headers: { Cookie: 'admin_token=tok' },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue(true)
  redisMocks.zcard.mockResolvedValue(0)
  redisMocks.zrange.mockResolvedValue([])
  redisMocks.pipelineDel.mockReturnThis()
  redisMocks.pipelineExec.mockResolvedValue([])
})

// ── GET — count ───────────────────────────────────────────────────────────────
describe('GET /api/admin/leads/clear — total count', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns total lead count from zcard', async () => {
    redisMocks.zcard.mockResolvedValue(7)
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ total: 7 })
  })

  it('returns 0 when no leads exist', async () => {
    redisMocks.zcard.mockResolvedValue(0)
    const res = await GET(makeReq())
    expect((await res.json()).total).toBe(0)
  })
})

// ── POST — clear ─────────────────────────────────────────────────────────────
describe('POST /api/admin/leads/clear — clearing leads', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns cleared: 0 when no leads exist', async () => {
    redisMocks.zrange.mockResolvedValue([])
    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cleared: 0 })
  })

  it('deletes all lead keys and the index key, returns cleared count', async () => {
    redisMocks.zrange.mockResolvedValue(['g1', 'g2', 'g3'])
    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cleared: 3 })
    const delCalls = redisMocks.pipelineDel.mock.calls.map((args) => args[0] as string)
    expect(delCalls).toContain('lead:g1')
    expect(delCalls).toContain('lead:g2')
    expect(delCalls).toContain('lead:g3')
    expect(delCalls).toContain('leads:all')
  })
})
