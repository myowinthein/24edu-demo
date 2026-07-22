export interface SourceEntry {
  id: string;
  filename: string;
  rowCount: number;
  uploadedAt: string;
  chunkCount: number;
}


export type SessionMode = 'ai' | 'requested' | 'human' | 'ended';

export interface SessionMeta {
  title: string;
  createdAt: string;
  guestId: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  timezone?: string;
}

export interface SessionMessage {
  role: 'guest' | 'ai' | 'admin';
  text: string;
  timestamp: string;
}

export interface SessionRow {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface LeadData {
  guestId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
  submittedAt: string;
}
