export interface SourceEntry {
  id: string;
  filename: string;
  csv: string;
  rowCount: number;
  uploadedAt: string;
}

export interface HistoryEntry {
  role: 'user' | 'assistant';
  text: string;
}
