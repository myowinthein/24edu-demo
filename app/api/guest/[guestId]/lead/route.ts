import { NextRequest, NextResponse } from 'next/server';
import { redis, leadKey } from '@/lib/redis';
import type { LeadData } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: { guestId: string } }) {
  if (!UUID_RE.test(params.guestId)) {
    return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
  }
  const lead = await redis.get<LeadData>(leadKey(params.guestId));
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}
