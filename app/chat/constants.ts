export { type SessionRow } from '@/lib/types';

export const MODELS = [
  'gemini-3.7-flash',
] as const;

export type ModelId = (typeof MODELS)[number];
export const DEFAULT_MODEL: ModelId = 'gemini-3.7-flash';
