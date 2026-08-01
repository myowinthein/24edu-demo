import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { LeadData } from '@/lib/types'

import { mockAdminAuthModule } from '@/tests/helpers/mock-admin-auth'

vi.mock('@/lib/admin-auth', () => mockAdminAuthModule())

const mocks = vi.hoisted(() => {
  const pipelineExec = vi.fn()
  const pipelineGet = vi.fn()
  const zrange = vi.fn()
  return { pipelineExec, pipelineGet, zrange }
})

vi.mock('@/lib/redis', () => ({
  redis: {
    zrange: mocks.zrange,
    pipeline: vi.fn(() => ({
      get: mocks.pipelineGet.mockReturnThis(),
      exec: mocks.pipelineExec,
    })),
  },
  leadKey: (id: string) => `lead:${id}`,
  LEADS_ALL_KEY: 'leads:all',
}))

import { GET } from '@/app/api/admin/leads/route'

const makeReq = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/admin/leads')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

const leads: LeadData[] = [
  {
    guestId: 'g1', name: 'Alice Smith', email: 'alice@example.com',
    phone: '+1234567890', country: 'USA', educationLevel: 'Undergraduate',
    programOfInterest: 'Computer Science', intendedIntake: 'Fall 2025',
    submittedAt: '2024-06-01T00:00:00Z',
  },
  {
    guestId: 'g2', name: 'Bob Jones', email: 'bob@test.org',
    phone: '+9876543210', country: 'UK', educationLevel: 'Graduate',
    programOfInterest: 'Business Administration', intendedIntake: 'Spring 2025',
    submittedAt: '2024-05-01T00:00:00Z',
  },
  {
    guestId: 'g3', name: 'Carol Lee', email: 'carol@example.com',
    phone: '+1122334455', country: 'Canada', educationLevel: 'Postgraduate',
    programOfInterest: 'Engineering', intendedIntake: 'Fall 2024',
    submittedAt: '2024-04-01T00:00:00Z',
  },
]

beforeEach(() => {
  mocks.zrange.mockResolvedValue(['g1', 'g2', 'g3'])
  mocks.pipelineExec.mockResolvedValue([leads[0], leads[1], leads[2]])
  mocks.pipelineGet.mockReturnThis()
})

describe('GET /api/admin/leads — search filter', () => {
  it('returns all leads when no search term', async () => {
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.leads).toHaveLength(3)
  })

  it('filters by name (case-insensitive)', async () => {
    const res = await GET(makeReq({ search: 'alice' }))
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.leads[0].name).toBe('Alice Smith')
  })

  it('filters by email', async () => {
    const res = await GET(makeReq({ search: 'test.org' }))
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.leads[0].name).toBe('Bob Jones')
  })

  it('filters by country', async () => {
    const res = await GET(makeReq({ search: 'canada' }))
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.leads[0].name).toBe('Carol Lee')
  })

  it('filters by program of interest', async () => {
    const res = await GET(makeReq({ search: 'engineering' }))
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.leads[0].programOfInterest).toBe('Engineering')
  })

  it('returns empty when search matches nothing', async () => {
    const res = await GET(makeReq({ search: 'nomatch' }))
    const body = await res.json()
    expect(body.total).toBe(0)
    expect(body.leads).toHaveLength(0)
  })
})

describe('GET /api/admin/leads — sorting', () => {
  it('sorts by name asc', async () => {
    const res = await GET(makeReq({ sort: 'name', order: 'asc' }))
    const body = await res.json()
    const names = body.leads.map((l: LeadData) => l.name)
    expect(names).toEqual([...names].sort())
  })

  it('sorts by name desc', async () => {
    const res = await GET(makeReq({ sort: 'name', order: 'desc' }))
    const body = await res.json()
    const names = body.leads.map((l: LeadData) => l.name)
    expect(names).toEqual([...names].sort().reverse())
  })
})

describe('GET /api/admin/leads — pagination', () => {
  it('returns correct page slice with limit=1', async () => {
    const res = await GET(makeReq({ limit: '1', page: '1' }))
    const body = await res.json()
    expect(body.leads).toHaveLength(1)
    expect(body.total).toBe(3)
    expect(body.totalPages).toBe(3)
  })

  it('returns second page when page=2', async () => {
    const res1 = await GET(makeReq({ limit: '1', page: '1', sort: 'name', order: 'asc' }))
    const res2 = await GET(makeReq({ limit: '1', page: '2', sort: 'name', order: 'asc' }))
    const body1 = await res1.json()
    const body2 = await res2.json()
    expect(body1.leads[0].name).not.toBe(body2.leads[0].name)
  })

  it('clamps limit to max 100', async () => {
    const res = await GET(makeReq({ limit: '999' }))
    const body = await res.json()
    expect(body.leads).toHaveLength(3)
  })

  it('returns empty leads when guestIds list is empty', async () => {
    mocks.zrange.mockResolvedValue([])
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.leads).toHaveLength(0)
    expect(body.total).toBe(0)
  })
})
