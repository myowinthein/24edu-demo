import { NextRequest, NextResponse } from 'next/server';
import { redis, SESSIONS_ACTIVE_KEY, sessionModeKey, sessionMetaKey, leadKey } from '@/lib/redis';
import { verifyAdminToken } from '@/lib/admin-auth';
import type { SessionMode, SessionMeta, LeadData } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // withScores avoids a redundant per-session zscore call below — the score
  // is already known from this same zrange call.
  const flatWithScores = (await redis.zrange(SESSIONS_ACTIVE_KEY, 0, -1, {
    rev: true, withScores: true,
  })) as (string | number)[];

  if (flatWithScores.length === 0) return NextResponse.json([]);

  const sessionIds: string[] = [];
  const scoreById = new Map<string, number>();
  for (let i = 0; i < flatWithScores.length; i += 2) {
    const id = flatWithScores[i] as string;
    sessionIds.push(id);
    scoreById.set(id, Number(flatWithScores[i + 1]));
  }

  const p = redis.pipeline();
  for (const id of sessionIds) {
    p.get<SessionMeta>(sessionMetaKey(id));
    p.get<SessionMode>(sessionModeKey(id));
  }
  const results = await p.exec();

  const sessions = sessionIds.map((id, i) => {
    const score = scoreById.get(id) ?? null;
    const meta = results[i * 2] as SessionMeta | null;
    const mode = results[i * 2 + 1] as SessionMode | null;
    return {
      id,
      mode: mode ?? 'ai',
      guestId: meta?.guestId ?? '',
      createdAt: meta?.createdAt ?? '',
      lastActiveAt: score ? new Date(score).toISOString() : '',
    };
  });

  // Fetch lead info for each unique guestId
  type LeadFields = Omit<LeadData, 'guestId' | 'submittedAt'>;
  const EMPTY_LEAD_FIELDS: LeadFields = { name: '', email: '', phone: '', country: '', educationLevel: '', programOfInterest: '', intendedIntake: '' };
  const pickLeadFields = (lead: LeadData): LeadFields =>
    Object.fromEntries(Object.keys(EMPTY_LEAD_FIELDS).map((k) => [k, lead[k as keyof LeadFields]])) as LeadFields;

  const uniqueGuestIds = [...new Set(sessions.map((s) => s.guestId).filter(Boolean))];
  const leadPipeline = redis.pipeline();
  for (const gid of uniqueGuestIds) leadPipeline.get<LeadData>(leadKey(gid));
  const leadResults = await leadPipeline.exec();
  const leadMap = new Map<string, LeadFields>();
  uniqueGuestIds.forEach((gid, i) => {
    const lead = leadResults[i] as LeadData | null;
    if (lead) leadMap.set(gid, pickLeadFields(lead));
  });

  const enriched = sessions.map((s) => ({
    ...s,
    ...(leadMap.get(s.guestId) ?? EMPTY_LEAD_FIELDS),
  }));

  return NextResponse.json(enriched);
}
