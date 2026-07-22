import { describe, it, expect, vi } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {}
  },
}))

import {
  sessionMessagesKey,
  sessionModeKey,
  sessionMetaKey,
  guestSessionsKey,
  adminSessionKey,
  leadKey,
  SOURCES_KEY,
  SESSIONS_ACTIVE_KEY,
  LEADS_ALL_KEY,
} from '@/lib/redis'

describe('redis key builders', () => {
  it('sessionMessagesKey builds the correct key', () => {
    expect(sessionMessagesKey('abc-123')).toBe('session:abc-123:messages')
  })

  it('sessionModeKey builds the correct key', () => {
    expect(sessionModeKey('abc-123')).toBe('session:abc-123:mode')
  })

  it('sessionMetaKey builds the correct key', () => {
    expect(sessionMetaKey('abc-123')).toBe('session:abc-123:meta')
  })

  it('guestSessionsKey builds the correct key', () => {
    expect(guestSessionsKey('guest-456')).toBe('guest:guest-456:sessions')
  })

  it('adminSessionKey builds the correct key', () => {
    expect(adminSessionKey('sometoken')).toBe('admin:session:sometoken')
  })

  it('leadKey builds the correct key', () => {
    expect(leadKey('guest-789')).toBe('lead:guest-789')
  })

  it('key builders tolerate UUIDs as input', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(sessionMessagesKey(uuid)).toBe(`session:${uuid}:messages`)
    expect(guestSessionsKey(uuid)).toBe(`guest:${uuid}:sessions`)
    expect(leadKey(uuid)).toBe(`lead:${uuid}`)
  })
})

describe('redis key constants', () => {
  it('SOURCES_KEY', () => {
    expect(SOURCES_KEY).toBe('sources:list')
  })

  it('SESSIONS_ACTIVE_KEY', () => {
    expect(SESSIONS_ACTIVE_KEY).toBe('sessions:active')
  })

  it('LEADS_ALL_KEY', () => {
    expect(LEADS_ALL_KEY).toBe('leads:all')
  })
})
