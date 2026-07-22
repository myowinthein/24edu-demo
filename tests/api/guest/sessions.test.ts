import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const sessionMocks = vi.hoisted(() => {
  const pipelineExec = vi.fn()
  const pipelineZscore = vi.fn()
  const pipelineGet = vi.fn()
  const zrange = vi.fn()
  return { pipelineExec, pipelineZscore, pipelineGet, zrange }
})

vi.mock('@/lib/redis', () => ({
  redis: {
    zrange: sessionMocks.zrange,
    pipeline: vi.fn(() => ({
      zscore: sessionMocks.pipelineZscore.mockReturnThis(),
      get: sessionMocks.pipelineGet.mockReturnThis(),
      exec: sessionMocks.pipelineExec,
    })),
  },
  guestSessionsKey: (id: string) => `guest:${id}:sessions`,
  sessionMetaKey:   (id: string) => `session:${id}:meta`,
}))

import { GET } from '@/app/api/guest/[guestId]/sessions/route'

const GUEST = '00000000-0000-0000-0000-000000000001'

function makeReq(guestId = GUEST) {
  return new NextRequest(`http://localhost/api/guest/${guestId}/sessions`)
}
function makeParams(guestId = GUEST) {
  return { params: { guestId } }
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionMocks.pipelineZscore.mockReturnThis()
  sessionMocks.pipelineGet.mockReturnThis()
})

describe('GET /api/guest/[guestId]/sessions', () => {
  it('returns empty array when no sessions exist', async () => {
    sessionMocks.zrange.mockResolvedValue([])
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('maps pipeline results to session rows with correct index arithmetic', async () => {
    const now = Date.now()
    sessionMocks.zrange.mockResolvedValue(['sess-1', 'sess-2'])
    sessionMocks.pipelineExec.mockResolvedValue([
      now,        // zscore for sess-1
      { title: 'Hello', createdAt: '2024-01-01T00:00:00Z' }, // meta for sess-1
      now - 1000, // zscore for sess-2
      null,       // meta for sess-2 (missing)
    ])
    const res = await GET(makeReq(), makeParams())
    const sessions = await res.json()
    expect(sessions).toHaveLength(2)
    expect(sessions[0].id).toBe('sess-1')
    expect(sessions[0].title).toBe('Hello')
    expect(sessions[1].id).toBe('sess-2')
    expect(sessions[1].title).toBe('Chat') // null meta falls back to 'Chat'
  })

  it('falls back to "Chat" title and a valid ISO time when meta is null', async () => {
    sessionMocks.zrange.mockResolvedValue(['sess-x'])
    sessionMocks.pipelineExec.mockResolvedValue([null, null])
    const res = await GET(makeReq(), makeParams())
    const [session] = await res.json()
    expect(session.title).toBe('Chat')
    expect(session.createdAt).toBeTruthy()
    expect(session.lastActiveAt).toBeTruthy()
  })
})
