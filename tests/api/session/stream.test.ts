import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateChannelSSE = vi.hoisted(() => vi.fn().mockReturnValue(new Response('sse')))
vi.mock('@/lib/sse', () => ({ createChannelSSE: mockCreateChannelSSE }))

import { GET } from '@/app/api/session/[id]/stream/route'

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'

beforeEach(() => {
  mockCreateChannelSSE.mockClear()
})

describe('GET /api/session/[id]/stream', () => {
  it('opens an SSE stream on the session-specific channel', async () => {
    const req = new NextRequest(`http://localhost/api/session/${SESSION_ID}/stream`)
    await GET(req, { params: { id: SESSION_ID } })
    expect(mockCreateChannelSSE).toHaveBeenCalledWith(`session:${SESSION_ID}:events`, req)
  })

  it('returns whatever createChannelSSE produces', async () => {
    const req = new NextRequest(`http://localhost/api/session/${SESSION_ID}/stream`)
    const res = await GET(req, { params: { id: SESSION_ID } })
    expect(res).toBeInstanceOf(Response)
  })
})
