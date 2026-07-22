import { NextRequest, NextResponse } from 'next/server';
import { redis, leadKey, LEADS_ALL_KEY } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { LeadData } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!await verifyAdminToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const VALID_SORT_KEYS: (keyof LeadData)[] = ['name', 'email', 'country', 'programOfInterest', 'intendedIntake', 'submittedAt'];
  const rawSort = searchParams.get('sort') ?? 'submittedAt';
  const sort: keyof LeadData = VALID_SORT_KEYS.includes(rawSort as keyof LeadData)
    ? (rawSort as keyof LeadData)
    : 'submittedAt';
  const order = searchParams.get('order') ?? 'desc';
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();

  // Fetch all guestIds from sorted set (newest first)
  const guestIds = await redis.zrange<string[]>(LEADS_ALL_KEY, 0, -1, { rev: true });
  if (!guestIds || guestIds.length === 0) {
    return NextResponse.json({ leads: [], total: 0, page, totalPages: 0 });
  }

  // Batch fetch all lead records
  const pipeline = redis.pipeline();
  for (const gid of guestIds) pipeline.get(leadKey(gid));
  const results = await pipeline.exec();
  let leads = (results as (LeadData | null)[]).filter((l): l is LeadData => l !== null);

  // Search filter
  if (search) {
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(search) ||
        l.email.toLowerCase().includes(search) ||
        l.country.toLowerCase().includes(search) ||
        l.programOfInterest.toLowerCase().includes(search)
    );
  }

  // Sort
  leads.sort((a, b) => {
    const av = String(a[sort] ?? '');
    const bv = String(b[sort] ?? '');
    return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const total = leads.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = leads.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ leads: paginated, total, page, totalPages });
}
