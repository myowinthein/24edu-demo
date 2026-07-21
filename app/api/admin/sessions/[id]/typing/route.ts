import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { publishTyping } from '@/lib/pubsub';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await publishTyping(params.id);
  return NextResponse.json({ ok: true });
}
