import Redis from 'ioredis';
import { redis } from './redis';
import type { SessionMessage, SessionMode } from './types';

export interface SessionPayload {
  messages: SessionMessage[];
  mode: SessionMode;
}

export function sessionChannel(id: string) {
  return `session:${id}:events`;
}

export async function publishSession(id: string, payload: SessionPayload) {
  await redis.publish(sessionChannel(id), JSON.stringify(payload));
}

export async function publishTyping(id: string) {
  await redis.publish(sessionChannel(id), JSON.stringify({ typing: true }));
}

export const SESSIONS_CHANNEL = 'admin:sessions:events';

export async function publishSessions() {
  await redis.publish(SESSIONS_CHANNEL, 'update');
}

export function createSubscriber(): Redis {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('Missing REDIS_URL env var required for ioredis pub/sub');
  }
  return new Redis(redisUrl);
}
