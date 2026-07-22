export { type SessionRow } from '@/lib/types';

export const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

export type ModelId = (typeof MODELS)[number];
export const DEFAULT_MODEL: ModelId = 'gemini-3.5-flash-lite';
