export const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
] as const;

export type ModelId = (typeof MODELS)[number];
export const DEFAULT_MODEL: ModelId = 'gemini-3.5-flash-lite';

export interface SessionRow {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}
