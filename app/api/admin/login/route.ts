import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { redis, adminSessionKey } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as {
    username: string;
    password: string;
  };

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const hash = createHash('sha256').update(password).digest('hex');
  if (username !== expectedUsername || hash !== expectedHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = randomBytes(32).toString('hex');
  await redis.set(adminSessionKey(token), username, { ex: 86400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  });
  return res;
}
