import { NextRequest, NextResponse } from 'next/server';
import { redis, leadKey, LEADS_ALL_KEY } from '@/lib/redis';
import type { LeadData } from '@/lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-(). ]{6,19}$/;

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<LeadData>;
  const { guestId, name, email, phone, country, educationLevel, programOfInterest, intendedIntake } = body;

  if (!guestId || !UUID_RE.test(guestId))
    return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
  if (!name || name.trim().length < 2)
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  if (!email || !EMAIL_RE.test(email.trim()))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  if (!phone || !PHONE_RE.test(phone.trim()))
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  if (!country || country.trim().length < 2)
    return NextResponse.json({ error: 'Country is required' }, { status: 400 });
  if (!educationLevel)
    return NextResponse.json({ error: 'Education level is required' }, { status: 400 });
  if (!programOfInterest || programOfInterest.trim().length < 2)
    return NextResponse.json({ error: 'Program of interest is required' }, { status: 400 });
  if (!intendedIntake)
    return NextResponse.json({ error: 'Intended intake is required' }, { status: 400 });

  const lead: LeadData = {
    guestId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    country: country.trim(),
    educationLevel,
    programOfInterest: programOfInterest.trim(),
    intendedIntake,
    submittedAt: new Date().toISOString(),
  };

  await Promise.all([
    redis.set(leadKey(guestId), lead),
    redis.zadd(LEADS_ALL_KEY, { score: Date.now(), member: guestId }),
  ]);

  return NextResponse.json({ ok: true });
}
