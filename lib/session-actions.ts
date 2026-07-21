import { redis, sessionModeKey, sessionMessagesKey } from './redis';
import { publishSession, publishSessions } from './pubsub';
import type { SessionMessage, SessionMode } from './types';

export async function setSessionMode(id: string, mode: SessionMode) {
  const [, messages] = await Promise.all([
    redis.set(sessionModeKey(id), mode),
    redis.get<SessionMessage[]>(sessionMessagesKey(id)),
  ]);
  await Promise.all([
    publishSession(id, { messages: messages ?? [], mode }),
    publishSessions(),
  ]);
}
