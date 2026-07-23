import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPublish = vi.hoisted(() => vi.fn().mockResolvedValue(0))

vi.mock('@/lib/redis', () => ({
  redis: { publish: mockPublish },
}))

vi.mock('ioredis', () => ({
  default: class {
    constructor() {}
  },
}))

import {
  sessionChannel,
  SESSIONS_CHANNEL,
  publishSession,
  publishTyping,
  publishSessions,
  createSubscriber,
} from '@/lib/pubsub'

beforeEach(() => {
  mockPublish.mockClear()
})

describe('sessionChannel', () => {
  it('builds the correct pub/sub channel name', () => {
    expect(sessionChannel('sess-1')).toBe('session:sess-1:events')
  })

  it('is stable — same input always produces same channel name', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(sessionChannel(id)).toBe(sessionChannel(id))
  })
})

describe('SESSIONS_CHANNEL', () => {
  it('is the expected admin-wide channel', () => {
    expect(SESSIONS_CHANNEL).toBe('admin:sessions:events')
  })
})

describe('publishSession', () => {
  it('publishes to the session channel with JSON payload', async () => {
    const messages = [{ role: 'guest' as const, text: 'hello', timestamp: '2024-01-01T00:00:00Z' }]
    await publishSession('sess-1', { messages, mode: 'ai' })
    expect(mockPublish).toHaveBeenCalledOnce()
    expect(mockPublish).toHaveBeenCalledWith(
      'session:sess-1:events',
      JSON.stringify({ messages, mode: 'ai' })
    )
  })

  it('includes the correct mode in the payload', async () => {
    await publishSession('sess-2', { messages: [], mode: 'human' })
    const [, payload] = mockPublish.mock.calls[0]
    expect(JSON.parse(payload)).toMatchObject({ mode: 'human' })
  })
})

describe('publishTyping', () => {
  it('publishes a typing indicator to the session channel', async () => {
    await publishTyping('sess-3')
    expect(mockPublish).toHaveBeenCalledWith(
      'session:sess-3:events',
      JSON.stringify({ typing: true })
    )
  })
})

describe('publishSessions', () => {
  it('publishes to the global admin sessions channel', async () => {
    await publishSessions()
    expect(mockPublish).toHaveBeenCalledWith(SESSIONS_CHANNEL, 'update')
  })
})

describe('createSubscriber', () => {
  it('throws when REDIS_URL is not set', () => {
    const orig = process.env.REDIS_URL
    delete process.env.REDIS_URL
    try {
      expect(() => createSubscriber()).toThrow('Missing REDIS_URL')
    } finally {
      process.env.REDIS_URL = orig
    }
  })

  it('returns an ioredis instance when REDIS_URL is set', () => {
    const sub = createSubscriber()
    expect(sub).toBeDefined()
  })
})
