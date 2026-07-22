import { NextRequest, NextResponse } from 'next/server';
import { redis, SESSIONS_ACTIVE_KEY, sessionModeKey, sessionMetaKey, leadKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SessionMode, SessionMeta, LeadData } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionIds = (await redis.zrange(SESSIONS_ACTIVE_KEY, 0, -1, {
    rev: true,
  })) as string[];

  if (sessionIds.length === 0) return NextResponse.json([]);

  const p = redis.pipeline();
  for (const id of sessionIds) {
    p.zscore(SESSIONS_ACTIVE_KEY, id);
    p.get<SessionMeta>(sessionMetaKey(id));
    p.get<SessionMode>(sessionModeKey(id));
  }
  const results = await p.exec();

  const sessions = sessionIds.map((id, i) => {
    const score = results[i * 3] as number | null;
    const meta = results[i * 3 + 1] as SessionMeta | null;
    const mode = results[i * 3 + 2] as SessionMode | null;
    return {
      id,
      mode: mode ?? 'ai',
      guestId: meta?.guestId ?? '',
      createdAt: meta?.createdAt ?? '',
      lastActiveAt: score ? new Date(score).toISOString() : '',
    };
  });

  // Fetch lead info for each unique guestId
  const uniqueGuestIds = [...new Set(sessions.map((s) => s.guestId).filter(Boolean))];
  const leadPipeline = redis.pipeline();
  for (const gid of uniqueGuestIds) leadPipeline.get<LeadData>(leadKey(gid));
  const leadResults = await leadPipeline.exec();
  const leadMap = new Map<string, Omit<LeadData, 'guestId' | 'submittedAt'>>();
  uniqueGuestIds.forEach((gid, i) => {
    const lead = leadResults[i] as LeadData | null;
    if (lead) leadMap.set(gid, { name: lead.name, email: lead.email, phone: lead.phone, country: lead.country, educationLevel: lead.educationLevel, programOfInterest: lead.programOfInterest, intendedIntake: lead.intendedIntake });
  });

  const enriched = sessions.map((s) => ({
    ...s,
    ...(leadMap.get(s.guestId) ?? { name: '', email: '', phone: '', country: '', educationLevel: '', programOfInterest: '', intendedIntake: '' }),
  }));

  return NextResponse.json(enriched);
}
