import { describe, it, expect } from 'vitest'
import { groupSessionsByGuest, type AdminSession } from '@/lib/group-sessions'

function makeSession(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    id: 's1', mode: 'ai', guestId: 'g1', createdAt: '2024-01-01T00:00:00Z', lastActiveAt: '2024-01-01T00:00:00Z',
    name: '', email: '', phone: '', country: '', educationLevel: '', programOfInterest: '', intendedIntake: '',
    ...overrides,
  }
}

describe('groupSessionsByGuest', () => {
  it('groups multiple sessions under the same guestId', () => {
    const sessions = [
      makeSession({ id: 's1', guestId: 'g1' }),
      makeSession({ id: 's2', guestId: 'g1' }),
      makeSession({ id: 's3', guestId: 'g2' }),
    ]
    const groups = groupSessionsByGuest(sessions)
    expect(groups).toHaveLength(2)
    const g1 = groups.find((g) => g.guestId === 'g1')!
    expect(g1.sessions.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('groups sessions with no guestId under "__unknown__"', () => {
    const sessions = [makeSession({ id: 's1', guestId: '' }), makeSession({ id: 's2', guestId: '' })]
    const groups = groupSessionsByGuest(sessions)
    expect(groups).toHaveLength(1)
    expect(groups[0].guestId).toBe('__unknown__')
    expect(groups[0].sessions).toHaveLength(2)
  })

  it('backfills guest info onto the group once a session with a name is found', () => {
    const sessions = [
      makeSession({ id: 's1', guestId: 'g1', name: '' }), // earlier session, no lead info yet
      makeSession({ id: 's2', guestId: 'g1', name: 'Alice', email: 'alice@example.com' }),
    ]
    const groups = groupSessionsByGuest(sessions)
    expect(groups[0].name).toBe('Alice')
    expect(groups[0].email).toBe('alice@example.com')
  })

  it('keeps the first non-empty name once found, even if a later session has no name', () => {
    const sessions = [
      makeSession({ id: 's1', guestId: 'g1', name: 'Alice' }),
      makeSession({ id: 's2', guestId: 'g1', name: '' }),
    ]
    const groups = groupSessionsByGuest(sessions)
    expect(groups[0].name).toBe('Alice')
  })

  it('returns an empty array for no sessions', () => {
    expect(groupSessionsByGuest([])).toEqual([])
  })
})
