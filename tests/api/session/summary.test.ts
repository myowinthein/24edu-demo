import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGenerateContent = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ response: { text: () => '- Point one\n- Point two' } })
)

const mockGetGenerativeModel = vi.hoisted(() =>
  vi.fn().mockReturnValue({ generateContent: mockGenerateContent })
)

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return { getGenerativeModel: mockGetGenerativeModel }
  }),
}))

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/redis', () => ({
  redis: { get: mockGet },
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
  sessionModelKey: (id: string) => `session:${id}:model`,
}))

import { GET } from '@/app/api/session/[id]/summary/route'
import { MODELS, DEFAULT_MODEL } from '@/app/chat/constants'

const VALID_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/session/${id}/summary`)
}

beforeEach(() => {
  mockGet.mockReset()
  mockGenerateContent.mockClear()
  mockGetGenerativeModel.mockClear()
  mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent })
})

function mockRedisState(messages: unknown, model?: string) {
  mockGet.mockImplementation((key: string) => {
    if (key.includes(':model')) return Promise.resolve(model ?? null)
    return Promise.resolve(messages)
  })
}

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

describe('GET /api/session/[id]/summary — model selection', () => {
  it('uses the model stored in Redis for the session', async () => {
    mockRedisState([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }], 'gemini-3.8-flash')
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.model).toBe('gemini-3.8-flash')
  })

  it('falls back to DEFAULT_MODEL when no model is stored', async () => {
    mockRedisState([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }])
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.model).toBe(DEFAULT_MODEL)
  })

  it('falls back to DEFAULT_MODEL when the stored model is not a known model', async () => {
    mockRedisState([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }], 'gpt-4-turbo')
    await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.model).toBe(DEFAULT_MODEL)
  })

  it('falls through to the next model in MODELS when the first attempt fails', async () => {
    mockRedisState([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }], DEFAULT_MODEL)
    mockGetGenerativeModel.mockImplementation((opts: { model: string }) => ({
      generateContent: opts.model === DEFAULT_MODEL
        ? vi.fn().mockRejectedValue(new Error('Gemini unavailable'))
        : vi.fn().mockResolvedValue({ response: { text: () => 'fallback summary' } }),
    }))
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toBe('fallback summary')
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2)
  })
})

describe('GET /api/session/[id]/summary — Gemini error handling', () => {
  it('returns 500 only after every model in MODELS has failed', async () => {
    mockGet.mockResolvedValue([{ role: 'guest', text: 'Hello', timestamp: '2024-01-01' }])
    mockGenerateContent.mockRejectedValue(new Error('Gemini unavailable'))
    const res = await GET(makeReq(VALID_ID), { params: { id: VALID_ID } })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(MODELS.length)
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
