import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAdminReq } from '@/tests/helpers/make-admin-req'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/redis', async () => {
  const actual = await vi.importActual<typeof import('@/lib/redis')>('@/lib/redis')
  return {
    redis: { get: mockGet },
    adminSessionKey: actual.adminSessionKey,
  }
})

import { verifyAdminToken } from '@/lib/admin-auth'

const makeReq = (cookie?: string) => makeAdminReq('/api/admin/test', cookie)

beforeEach(() => mockGet.mockReset())

describe('verifyAdminToken', () => {
  it('returns false when no admin_token cookie is present', async () => {
    const req = makeReq()
    expect(await verifyAdminToken(req)).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('returns true when token maps to a username in Redis', async () => {
    mockGet.mockResolvedValue('admin')
    const req = makeReq('valid-token-abc')
    expect(await verifyAdminToken(req)).toBe(true)
    expect(mockGet).toHaveBeenCalledWith('admin:session:valid-token-abc')
  })

  it('returns false when token is not in Redis (null)', async () => {
    mockGet.mockResolvedValue(null)
    const req = makeReq('expired-token')
    expect(await verifyAdminToken(req)).toBe(false)
  })
})
