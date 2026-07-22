import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSet = vi.hoisted(() => vi.fn().mockResolvedValue('OK'))

vi.mock('@/lib/redis', () => ({
  redis: { set: mockSet },
  adminSessionKey: (token: string) => `admin:session:${token}`,
}))

import { POST } from '@/app/api/admin/login/route'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => mockSet.mockReset())

describe('POST /api/admin/login', () => {
  it('returns 500 when ADMIN_USERNAME env var is missing', async () => {
    const saved = process.env.ADMIN_USERNAME
    delete process.env.ADMIN_USERNAME
    const res = await POST(makeReq({ username: 'admin', password: 'password' }))
    expect(res.status).toBe(500)
    process.env.ADMIN_USERNAME = saved
  })

  it('returns 401 for wrong username', async () => {
    const res = await POST(makeReq({ username: 'wrong', password: 'password' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('returns 401 for wrong password', async () => {
    const res = await POST(makeReq({ username: 'admin', password: 'wrongpassword' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('returns 200 and sets cookie for correct credentials', async () => {
    mockSet.mockResolvedValue('OK')
    const res = await POST(makeReq({ username: 'admin', password: 'password' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('admin_token=')
    expect(setCookie).toContain('HttpOnly')
  })

  it('stores the token in Redis with 24h expiry on success', async () => {
    await POST(makeReq({ username: 'admin', password: 'password' }))
    expect(mockSet).toHaveBeenCalledOnce()
    const [, , opts] = mockSet.mock.calls[0]
    expect(opts).toMatchObject({ ex: 86400 })
  })
})
