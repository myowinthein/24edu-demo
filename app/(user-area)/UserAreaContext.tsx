'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { SessionRow } from '@/app/chat/constants';

const LS_GUEST_ID = 'chat:guestId';

export function getOrCreateGuestId(): string {
  try {
    const stored = localStorage.getItem(LS_GUEST_ID);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(LS_GUEST_ID, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

interface ContextValue {
  guestId: string | null;
  sessions: SessionRow[];
  setSessions: Dispatch<SetStateAction<SessionRow[]>>;
  sessionsLoaded: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  activeSessionId: string | null;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  leadSubmitted: boolean | null;
  setLeadSubmitted: Dispatch<SetStateAction<boolean | null>>;
  leadName: string | null;
  // Signal for layout → chat page navigation. 'new' = new chat, string = session id.
  pendingSession: string | 'new' | null;
  setPendingSession: Dispatch<SetStateAction<string | 'new' | null>>;
}

const Ctx = createContext<ContextValue | null>(null);

export function UserAreaProvider({ children }: { children: React.ReactNode }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState<boolean | null>(null);
  const [leadName, setLeadName] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<string | 'new' | null>(null);

  useEffect(() => {
    const gid = getOrCreateGuestId();
    setGuestId(gid);

    fetch(`/api/guest/${gid}/lead`)
      .then(async (r) => {
        if (!r.ok) { setLeadSubmitted(false); return; }
        setLeadSubmitted(true);
        const lead = await r.json() as { name?: string };
        if (lead?.name) setLeadName(lead.name);
      })
      .catch(() => setLeadSubmitted(false));

    fetch(`/api/guest/${gid}/sessions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: SessionRow[]) => {
        setSessions(Array.isArray(list) ? list : []);
        setSessionsLoaded(true);
      })
      .catch(() => setSessionsLoaded(true));
  }, []);

  return (
    <Ctx.Provider value={{
      guestId, sessions, setSessions, sessionsLoaded,
      sidebarOpen, setSidebarOpen,
      activeSessionId, setActiveSessionId,
      leadSubmitted, setLeadSubmitted, leadName,
      pendingSession, setPendingSession,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUserArea() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUserArea must be used within UserAreaProvider');
  return ctx;
}
