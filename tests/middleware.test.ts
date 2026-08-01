import { describe, it, expect } from 'vitest'
import { middleware } from '@/middleware'
import { makeAdminReq as makeReq } from '@/tests/helpers/make-admin-req'

describe('middleware', () => {
  it('redirects /sources to /admin/sources', () => {
    const res = middleware(makeReq('/sources'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/sources')
  })

  it('passes /admin/login through without checking token', () => {
    const res = middleware(makeReq('/admin/login'))
    // NextResponse.next() has no Location header
    expect(res.headers.get('location')).toBeNull()
  })

  it('passes /api/admin/login through without checking token', () => {
    const res = middleware(makeReq('/api/admin/login'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('returns 401 JSON for /api/admin/* without a token', () => {
    const res = middleware(makeReq('/api/admin/sessions'))
    expect(res.status).toBe(401)
  })

  it('redirects /admin/dashboard to /admin/login without a token', () => {
    const res = middleware(makeReq('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/login')
  })

  it('passes /admin/dashboard through when token cookie is present', () => {
    const res = middleware(makeReq('/admin/dashboard', 'some-token'))
    // NextResponse.next() — no redirect
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).not.toBe(401)
  })

  it('passes /api/admin/sessions through when token cookie is present', () => {
    const res = middleware(makeReq('/api/admin/sessions', 'some-token'))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('location')).toBeNull()
  })

  it('returns 401 for /api/admin/logout without a token', () => {
    const res = middleware(makeReq('/api/admin/logout'))
    expect(res.status).toBe(401)
  })

  it('passes /api/admin/logout through when token cookie is present', () => {
    const res = middleware(makeReq('/api/admin/logout', 'some-token'))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('location')).toBeNull()
  })
})
