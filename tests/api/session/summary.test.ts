import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGenerateContent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ response: { text: () => '- Point one\n- Point two' } })
)

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }
  }),
}))

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/redis', () => ({
  redis: { get: mockGet },
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
}))

import { GET } from '@/app/api/session/[id]/summary/route'

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/session/${id}/summary`)
}

beforeEach(() => {
  mockGet.mockReset()
  mockGenerateContent.mockClear()
})

describe('GET /api/session/[id]/summary — UUID validation', () => {
  it('returns 400 for non-UUID id', async () => {
    const res = await GET(makeReq('not-a-uuid'), { params: { id: 'not-a-uuid' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid/i)
  })

  it('proceeds for a valid UUID', async () => {
    mockGet.mockResolvedValue([])
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(res.status).toBe(200)
  })
})

describe('GET /api/session/[id]/summary — empty messages', () => {
  it('returns a no-messages response without calling Gemini', async () => {
    mockGet.mockResolvedValue(null)
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toMatch(/No messages/i)
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('also returns no-messages response for empty array', async () => {
    mockGet.mockResolvedValue([])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })
})

describe('GET /api/session/[id]/summary — transcript builder', () => {
  it('maps guest role to "User:"', async () => {
    mockGet.mockResolvedValue([{ role: 'guest', text: 'hello', timestamp: '2024-01-01' }])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const transcriptArg = mockGenerateContent.mock.calls[0][0] as string
    expect(transcriptArg).toContain('User: hello')
  })

  it('maps ai role to "AI:"', async () => {
    mockGet.mockResolvedValue([{ role: 'ai', text: 'Welcome!', timestamp: '2024-01-01' }])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const transcriptArg = mockGenerateContent.mock.calls[0][0] as string
    expect(transcriptArg).toContain('AI: Welcome!')
  })

  it('maps admin role to "Support:"', async () => {
    mockGet.mockResolvedValue([{ role: 'admin', text: 'How can I help?', timestamp: '2024-01-01' }])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const transcriptArg = mockGenerateContent.mock.calls[0][0] as string
    expect(transcriptArg).toContain('Support: How can I help?')
  })

  it('joins multiple messages with newlines', async () => {
    mockGet.mockResolvedValue([
      { role: 'guest', text: 'Hello', timestamp: '2024-01-01' },
      { role: 'ai',    text: 'Hi there', timestamp: '2024-01-01' },
    ])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const transcriptArg = mockGenerateContent.mock.calls[0][0] as string
    expect(transcriptArg).toBe('User: Hello\nAI: Hi there')
  })
})

describe('GET /api/session/[id]/summary — Gemini error handling', () => {
  it('returns 500 when generateContent throws', async () => {
    mockGet.mockResolvedValue([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }])
    mockGenerateContent.mockRejectedValue(new Error('Gemini unavailable'))
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 500 when GEMINI_API_KEY is not set', async () => {
    const origKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    vi.resetModules()
    try {
      const { GET: freshGET } = await import('@/app/api/session/[id]/summary/route')
      mockGet.mockResolvedValue([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }])
      const res = await freshGET(makeReq(VALID_ID), { params: { id: VALID_ID } })
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/GEMINI_API_KEY/i)
    } finally {
      process.env.GEMINI_API_KEY = origKey
      vi.resetModules()
    }
  })
})
