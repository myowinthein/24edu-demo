import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { formatRelativeTime, formatDate } from '@/lib/format'

const BASE = new Date('2024-06-15T12:00:00.000Z')

describe('formatRelativeTime', () => {
  beforeAll(() => vi.useFakeTimers())
  afterAll(() => vi.useRealTimers())

  it('returns empty string for empty input', () => {
    expect(formatRelativeTime('')).toBe('')
  })

  it('just now — less than 1 minute ago', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() - 30_000).toISOString())).toBe('Just now')
  })

  it('minutes ago — 1 to 59 minutes', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() - 5 * 60_000).toISOString())).toBe('5m ago')
    expect(formatRelativeTime(new Date(BASE.getTime() - 59 * 60_000).toISOString())).toBe('59m ago')
  })

  it('hours ago — 1 to 23 hours', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() - 3 * 3_600_000).toISOString())).toBe('3h ago')
    expect(formatRelativeTime(new Date(BASE.getTime() - 23 * 3_600_000).toISOString())).toBe('23h ago')
  })

  it('yesterday — exactly 24 hours ago', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() - 24 * 3_600_000).toISOString())).toBe('Yesterday')
  })

  it('days ago — 2 to 6 days', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() - 2 * 86_400_000).toISOString())).toBe('2d ago')
    expect(formatRelativeTime(new Date(BASE.getTime() - 6 * 86_400_000).toISOString())).toBe('6d ago')
  })

  it('coerces a future timestamp to "Just now" (negative diff)', () => {
    vi.setSystemTime(BASE)
    expect(formatRelativeTime(new Date(BASE.getTime() + 5 * 60_000).toISOString())).toBe('Just now')
  })

  it('locale date — 7 or more days ago', () => {
    vi.setSystemTime(BASE)
    const result = formatRelativeTime(new Date(BASE.getTime() - 10 * 86_400_000).toISOString())
    // Should be a date string (e.g. "Jun 5"), not a relative one
    expect(result).not.toMatch(/ago|now|Yesterday/)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns a non-empty string for valid ISO date', () => {
    const result = formatDate('2024-03-15T10:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('accepts custom Intl format options', () => {
    const result = formatDate('2024-03-15T10:00:00Z', { year: 'numeric', month: 'long' })
    expect(result).toMatch(/2024/)
  })

  it('returns empty string for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatRelativeTime — invalid input', () => {
  it('returns empty string for an invalid date string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('')
  })
})
