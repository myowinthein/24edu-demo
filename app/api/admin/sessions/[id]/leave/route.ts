import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { setSessionMode } from '@/lib/session-actions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await setSessionMode(params.id, 'ai');
  return NextResponse.json({ ok: true });
}
