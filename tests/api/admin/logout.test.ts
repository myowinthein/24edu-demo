import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { mockAdminAuthModule } from '@/tests/helpers/mock-admin-auth'

vi.mock('@/lib/admin-auth', () => mockAdminAuthModule())
import { verifyAdminToken } from '@/lib/admin-auth'
const mockVerify = vi.mocked(verifyAdminToken)

const mockDel = vi.hoisted(() => vi.fn().mockResolvedValue(1))

vi.mock('@/lib/redis', () => ({
  redis: { del: mockDel },
  adminSessionKey: (token: string) => `admin:session:${token}`,
}))

import { POST } from '@/app/api/admin/logout/route'

function makeReq(cookie?: string) {
  return new NextRequest('http://localhost/api/admin/logout', {
    method: 'POST',
    headers: cookie ? { Cookie: `admin_token=${cookie}` } : {},
  })
}

beforeEach(() => {
  mockDel.mockClear()
  mockVerify.mockResolvedValue(true)
})

describe('POST /api/admin/logout', () => {
  it('returns 401 when not authenticated', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await POST(makeReq('bad-token'))
    expect(res.status).toBe(401)
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('deletes the session token from Redis when cookie is present', async () => {
    const res = await POST(makeReq('my-token'))
    expect(res.status).toBe(200)
    expect(mockDel).toHaveBeenCalledWith('admin:session:my-token')
  })

  it('does not call redis.del when no cookie is present', async () => {
    await POST(makeReq())
    expect(mockDel).not.toHaveBeenCalled()
  })

  it('returns { ok: true }', async () => {
    const res = await POST(makeReq('my-token'))
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('clears the admin_token cookie in the response', async () => {
    const res = await POST(makeReq('my-token'))
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('admin_token=')
    // Next.js sets Expires to epoch to signal deletion
    expect(setCookie).toMatch(/expires=thu, 01 jan 1970|max-age=0/i)
  })
})
