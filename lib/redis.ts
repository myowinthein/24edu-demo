import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  throw new Error('Missing Upstash Redis env vars (KV_REST_API_URL/UPSTASH_REDIS_REST_URL and KV_REST_API_TOKEN/UPSTASH_REDIS_REST_TOKEN)');
}

export const redis = new Redis({ url, token });

export const SOURCES_KEY = 'sources:list';
export const SESSIONS_ACTIVE_KEY = 'sessions:active';

export const sessionMessagesKey = (id: string) => `session:${id}:messages`;
export const sessionModeKey = (id: string) => `session:${id}:mode`;
export const sessionMetaKey = (id: string) => `session:${id}:meta`;
export const sessionModelKey = (id: string) => `session:${id}:model`;
export const guestSessionsKey = (guestId: string) => `guest:${guestId}:sessions`;
export const adminSessionKey = (token: string) => `admin:session:${token}`;

export const LEADS_ALL_KEY = 'leads:all';
export const leadKey = (guestId: string) => `lead:${guestId}`;
