import { NextRequest } from 'next/server'

export function makeAdminReq(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookie ? { Cookie: `admin_token=${cookie}` } : {},
  })
}
