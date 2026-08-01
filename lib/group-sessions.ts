import type { SessionMode } from './types';

export interface AdminSession {
  id: string;
  mode: SessionMode;
  guestId: string;
  createdAt: string;
  lastActiveAt: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
}

export interface GuestGroup {
  guestId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
  sessions: AdminSession[];
}

// De-dupes sessions by guestId, backfilling guest info fields onto the group
// once a session with a non-empty name is found (earlier sessions for a
// guest may predate lead capture and carry no guest info yet).
export function groupSessionsByGuest(sessions: AdminSession[]): GuestGroup[] {
  const map = new Map<string, GuestGroup>();
  for (const s of sessions) {
    const gid = s.guestId || '__unknown__';
    if (!map.has(gid)) {
      map.set(gid, {
        guestId: gid, name: s.name, email: s.email, phone: s.phone, country: s.country,
        educationLevel: s.educationLevel, programOfInterest: s.programOfInterest,
        intendedIntake: s.intendedIntake, sessions: [],
      });
    }
    const group = map.get(gid)!;
    if (!group.name && s.name) {
      group.name = s.name;
      group.email = s.email;
      group.phone = s.phone;
      group.country = s.country;
      group.educationLevel = s.educationLevel;
      group.programOfInterest = s.programOfInterest;
      group.intendedIntake = s.intendedIntake;
    }
    group.sessions.push(s);
  }
  return Array.from(map.values());
}
