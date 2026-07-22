import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSet = vi.hoisted(() => vi.fn().mockResolvedValue('OK'))
const mockZadd = vi.hoisted(() => vi.fn().mockResolvedValue(1))

vi.mock('@/lib/redis', () => ({
  redis: { set: mockSet, zadd: mockZadd },
  leadKey: (id: string) => `lead:${id}`,
  LEADS_ALL_KEY: 'leads:all',
}))

import { POST } from '@/app/api/lead/route'

const VALID_GUEST = '550e8400-e29b-41d4-a716-446655440000'

const validBody = {
  guestId: VALID_GUEST,
  name: 'Alice Smith',
  email: 'alice@example.com',
  phone: '+1 234 567 8901',
  country: 'USA',
  educationLevel: 'Undergraduate',
  programOfInterest: 'Computer Science',
  intendedIntake: 'Fall 2025',
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSet.mockClear()
  mockZadd.mockClear()
})

describe('POST /api/lead — guestId validation', () => {
  it('returns 400 for missing guestId', async () => {
    const { guestId: _, ...body } = validBody
    const res = await POST(makeReq(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-UUID guestId', async () => {
    const res = await POST(makeReq({ ...validBody, guestId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid guestId')
  })
})

describe('POST /api/lead — name validation', () => {
  it('returns 400 when name is missing', async () => {
    const res = await POST(makeReq({ ...validBody, name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is less than 2 characters', async () => {
    const res = await POST(makeReq({ ...validBody, name: 'A' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Name/)
  })
})

describe('POST /api/lead — email validation', () => {
  it('returns 400 for invalid email', async () => {
    const res = await POST(makeReq({ ...validBody, email: 'not-an-email' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  it('accepts a valid email', async () => {
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/lead — phone validation', () => {
  it('returns 400 for invalid phone number', async () => {
    const res = await POST(makeReq({ ...validBody, phone: 'abc' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/phone/i)
  })

  it('accepts +E.164 format', async () => {
    const res = await POST(makeReq({ ...validBody, phone: '+60123456789' }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/lead — other required field validation', () => {
  it('returns 400 for missing country', async () => {
    const res = await POST(makeReq({ ...validBody, country: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing educationLevel', async () => {
    const res = await POST(makeReq({ ...validBody, educationLevel: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for short programOfInterest', async () => {
    const res = await POST(makeReq({ ...validBody, programOfInterest: 'X' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing intendedIntake', async () => {
    const res = await POST(makeReq({ ...validBody, intendedIntake: '' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/lead — data normalisation', () => {
  it('trims whitespace from name', async () => {
    await POST(makeReq({ ...validBody, name: '  Alice Smith  ' }))
    const stored = mockSet.mock.calls[0][1] as { name: string }
    expect(stored.name).toBe('Alice Smith')
  })

  it('lowercases and trims the email', async () => {
    await POST(makeReq({ ...validBody, email: '  ALICE@EXAMPLE.COM  ' }))
    const stored = mockSet.mock.calls[0][1] as { email: string }
    expect(stored.email).toBe('alice@example.com')
  })

  it('stores a valid lead and returns { ok: true }', async () => {
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockSet).toHaveBeenCalledOnce()
    expect(mockZadd).toHaveBeenCalledOnce()
  })
})
