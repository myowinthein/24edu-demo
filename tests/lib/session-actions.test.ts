import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSet = vi.hoisted(() => vi.fn().mockResolvedValue('OK'))
const mockGet = vi.hoisted(() => vi.fn().mockResolvedValue(null))
const mockPublishSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockPublishSessions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/lib/redis', () => ({
  redis: { set: mockSet, get: mockGet },
  sessionModeKey: (id: string) => `session:${id}:mode`,
  sessionMessagesKey: (id: string) => `session:${id}:messages`,
}))

vi.mock('@/lib/pubsub', () => ({
  publishSession: mockPublishSession,
  publishSessions: mockPublishSessions,
}))

import { setSessionMode } from '@/lib/session-actions'

beforeEach(() => {
  mockSet.mockClear()
  mockGet.mockClear()
  mockGet.mockResolvedValue(null)
  mockPublishSession.mockClear()
  mockPublishSessions.mockClear()
})

describe('setSessionMode', () => {
  it('writes the new mode to Redis', async () => {
    await setSessionMode('sess-1', 'human')
    expect(mockSet).toHaveBeenCalledWith('session:sess-1:mode', 'human')
  })

  it('reads existing messages to include in the publish payload', async () => {
    const messages = [{ role: 'guest', text: 'hi', timestamp: '2024-01-01T00:00:00Z' }]
    mockGet.mockResolvedValue(messages)
    await setSessionMode('sess-2', 'ai')
    expect(mockGet).toHaveBeenCalledWith('session:sess-2:messages')
    expect(mockPublishSession).toHaveBeenCalledWith('sess-2', { messages, mode: 'ai' })
  })

  it('falls back to empty messages array when none are stored', async () => {
    mockGet.mockResolvedValue(null)
    await setSessionMode('sess-3', 'requested')
    expect(mockPublishSession).toHaveBeenCalledWith('sess-3', { messages: [], mode: 'requested' })
  })

  it('also publishes to the global sessions channel', async () => {
    await setSessionMode('sess-4', 'ended')
    expect(mockPublishSessions).toHaveBeenCalledOnce()
  })

  it('publishes to both session and sessions channels in a single call', async () => {
    const messages = [{ role: 'guest' as const, text: 'hi', timestamp: '2024-01-01T00:00:00Z' }]
    mockGet.mockResolvedValue(messages)
    await setSessionMode('sess-5', 'human')
    expect(mockPublishSession).toHaveBeenCalledOnce()
    expect(mockPublishSessions).toHaveBeenCalledOnce()
    expect(mockPublishSession).toHaveBeenCalledWith('sess-5', { messages, mode: 'human' })
  })
})
