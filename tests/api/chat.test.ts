import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetGenerativeModel = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    startChat: vi.fn().mockReturnValue({
      sendMessage: vi.fn().mockResolvedValue({ response: { text: () => 'AI response' } }),
    }),
  })
)

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return { getGenerativeModel: mockGetGenerativeModel }
  }),
}))

const mockQueryRelevantChunks = vi.hoisted(() => vi.fn().mockResolvedValue([]))
vi.mock('@/lib/vector', () => ({ queryRelevantChunks: mockQueryRelevantChunks }))

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
  sessionModeKey:    (id: string) => `session:${id}:mode`,
  sessionMetaKey:    (id: string) => `session:${id}:meta`,
  guestSessionsKey:  (id: string) => `guest:${id}:sessions`,
  SESSIONS_ACTIVE_KEY: 'sessions:active',
}))

vi.mock('@/lib/pubsub', () => ({
  publishSession: vi.fn().mockResolvedValue(undefined),
  publishSessions: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/chat/route'

const VALID_SESSION = '550e8400-e29b-41d4-a716-446655440000'
const VALID_GUEST   = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  redisMocks.get.mockResolvedValue(null)
  redisMocks.set.mockResolvedValue('OK')
  redisMocks.zadd.mockResolvedValue(0)
  mockQueryRelevantChunks.mockResolvedValue([])
  mockGetGenerativeModel.mockReturnValue({
    startChat: vi.fn().mockReturnValue({
      sendMessage: vi.fn().mockResolvedValue({ response: { text: () => 'AI response' } }),
    }),
  })
})

describe('POST /api/chat — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const res = await POST(makeReq({ sessionId: VALID_SESSION }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when message exceeds 4000 characters', async () => {
    const res = await POST(makeReq({ message: 'a'.repeat(4001), sessionId: VALID_SESSION }))
    expect(res.status).toBe(400)
  })

  it('accepts a message exactly 4000 characters long', async () => {
    const res = await POST(makeReq({ message: 'a'.repeat(4000), sessionId: VALID_SESSION }))
    expect(res.status).not.toBe(400)
  })

  it('returns 400 for invalid sessionId format', async () => {
    const res = await POST(makeReq({ message: 'hello', sessionId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid guestId format', async () => {
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION, guestId: 'bad' }))
    expect(res.status).toBe(400)
  })

  it('accepts valid UUID guestId', async () => {
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION, guestId: VALID_GUEST }))
    expect(res.status).not.toBe(400)
  })
})

describe('POST /api/chat — session mode', () => {
  it('returns { waiting: true } when mode is "human"', async () => {
    redisMocks.get.mockImplementation((key: string) => {
      if (key.includes(':messages')) return Promise.resolve([])
      if (key.includes(':mode')) return Promise.resolve('human')
      return Promise.resolve(null)
    })
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.waiting).toBe(true)
  })

  it('returns { waiting: true } when mode is "requested"', async () => {
    redisMocks.get.mockImplementation((key: string) => {
      if (key.includes(':messages')) return Promise.resolve([])
      if (key.includes(':mode')) return Promise.resolve('requested')
      return Promise.resolve(null)
    })
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION }))
    const body = await res.json()
    expect(body.waiting).toBe(true)
  })
})

describe('POST /api/chat — session title truncation', () => {
  it('truncates the title to 40 chars + ellipsis when first message is long', async () => {
    const longMessage = 'This is a very long first message that goes beyond forty characters for sure'
    await POST(makeReq({ message: longMessage, sessionId: VALID_SESSION, guestId: VALID_GUEST }))

    const metaSetCall = redisMocks.set.mock.calls.find(
      (args) => (args[0] as string).includes(':meta')
    )
    expect(metaSetCall).toBeDefined()
    const meta = metaSetCall![1] as { title: string }
    expect(meta.title).toBe(longMessage.slice(0, 40) + '…')
  })

  it('uses the full message as title when it is 40 chars or fewer', async () => {
    const shortMessage = 'Short message'
    await POST(makeReq({ message: shortMessage, sessionId: VALID_SESSION, guestId: VALID_GUEST }))

    const metaSetCall = redisMocks.set.mock.calls.find(
      (args) => (args[0] as string).includes(':meta')
    )
    expect(metaSetCall).toBeDefined()
    const meta = metaSetCall![1] as { title: string }
    expect(meta.title).toBe(shortMessage)
  })
})

describe('POST /api/chat — happy path response shape', () => {
  it('returns 200 with a text field on success', async () => {
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION, guestId: VALID_GUEST }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('text')
    expect(typeof body.text).toBe('string')
  })
})

describe('POST /api/chat — Google Search grounding', () => {
  it('uses googleSearchRetrieval tool for education-related queries with no local chunks', async () => {
    mockQueryRelevantChunks.mockResolvedValue([])
    await POST(makeReq({ message: 'What universities offer MBA programs?', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.tools).toBeDefined()
    expect(JSON.stringify(callArgs.tools)).toContain('googleSearchRetrieval')
  })

  it('does NOT use grounding for non-education queries even with no local chunks', async () => {
    mockQueryRelevantChunks.mockResolvedValue([])
    await POST(makeReq({ message: 'What is the weather like today?', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.tools).toBeUndefined()
  })

  it('does NOT use grounding when local chunks are available', async () => {
    mockQueryRelevantChunks.mockResolvedValue(['Some university data chunk'])
    await POST(makeReq({ message: 'Tell me about MBA programs', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.tools).toBeUndefined()
  })
})

describe('POST /api/chat — grounding: uni shorthand and recentContext', () => {
  it('triggers grounding when message contains "uni" as a standalone word', async () => {
    mockQueryRelevantChunks.mockResolvedValue([])
    await POST(makeReq({ message: 'What uni should I apply to?', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(JSON.stringify(callArgs?.tools)).toContain('googleSearchRetrieval')
  })

  it('does NOT trigger grounding for "unique" (not a word-boundary match)', async () => {
    mockQueryRelevantChunks.mockResolvedValue([])
    await POST(makeReq({ message: 'What is unique about this place?', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.tools).toBeUndefined()
  })

  it('triggers grounding on a follow-up with no edu keywords when prior session messages contain edu context', async () => {
    mockQueryRelevantChunks.mockResolvedValue([])
    redisMocks.get.mockImplementation((key: string) => {
      if (key.includes(':messages'))
        return Promise.resolve([{ role: 'guest', text: 'Tell me about MBA programs', timestamp: '2024-01-01' }])
      return Promise.resolve(null)
    })
    await POST(makeReq({ message: 'can you search online?', sessionId: VALID_SESSION }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(JSON.stringify(callArgs?.tools)).toContain('googleSearchRetrieval')
  })
})

describe('POST /api/chat — Gemini error handling', () => {
  it('returns 503 when sendMessage throws', async () => {
    mockGetGenerativeModel.mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockRejectedValue(new Error('Gemini overloaded')),
      }),
    })
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/temporarily unavailable/i)
  })

  it('returns a quota-specific message when the error mentions 429', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetGenerativeModel.mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockRejectedValue(new Error('[429 Too Many Requests] quota exceeded')),
      }),
    })
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/request limit reached/i)
  })

  it('returns a quota-specific message when the error mentions quota without a 429 code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetGenerativeModel.mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockRejectedValue(new Error('quota exceeded for this project')),
      }),
    })
    const res = await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/request limit reached/i)
  })
})

describe('POST /api/chat — model validation', () => {
  it('falls back to DEFAULT_MODEL when an unknown model name is provided', async () => {
    await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION, model: 'gpt-4-turbo' }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.model).toBe('gemini-3.5-flash-lite')
  })

  it('uses the provided model when it is a valid known model', async () => {
    await POST(makeReq({ message: 'hello', sessionId: VALID_SESSION, model: 'gemini-3.6-flash' }))
    const callArgs = mockGetGenerativeModel.mock.calls[0]?.[0]
    expect(callArgs?.model).toBe('gemini-3.6-flash')
  })
})

describe('POST /api/chat — missing GEMINI_API_KEY', () => {
  it('returns 500 when GEMINI_API_KEY is not configured', async () => {
    const origKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    vi.resetModules()
    try {
      const { POST: freshPOST } = await import('@/app/api/chat/route')
      const req = makeReq({ message: 'hello', sessionId: VALID_SESSION })
      const res = await freshPOST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/GEMINI_API_KEY/i)
    } finally {
      process.env.GEMINI_API_KEY = origKey
      vi.resetModules()
    }
  })
})
