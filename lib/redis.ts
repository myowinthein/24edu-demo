import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

export const SOURCES_KEY = 'sources:list';
export const SESSIONS_ACTIVE_KEY = 'sessions:active';

export const sessionMessagesKey = (id: string) => `session:${id}:messages`;
export const sessionModeKey = (id: string) => `session:${id}:mode`;
export const sessionMetaKey = (id: string) => `session:${id}:meta`;
export const guestSessionsKey = (guestId: string) => `guest:${guestId}:sessions`;
export const adminSessionKey = (token: string) => `admin:session:${token}`;
