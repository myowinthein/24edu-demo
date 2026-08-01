import type { LeadData } from './types';
import { formatDate } from './format';

export const LEAD_COLUMNS: { key: keyof LeadData; label: string }[] = [
  { key: 'name',              label: 'Name' },
  { key: 'email',             label: 'Email' },
  { key: 'phone',             label: 'Phone' },
  { key: 'country',           label: 'Country' },
  { key: 'educationLevel',    label: 'Education' },
  { key: 'programOfInterest', label: 'Program' },
  { key: 'intendedIntake',    label: 'Intake' },
  { key: 'submittedAt',       label: 'Submitted' },
];

export function leadsToCSV(leads: LeadData[]): string {
  const header = LEAD_COLUMNS.map((c) => c.label).join(',');
  const rows = leads.map((l) =>
    LEAD_COLUMNS.map((c) => {
      const v = c.key === 'submittedAt' ? formatDate(l[c.key], { day: '2-digit', month: 'short', year: 'numeric' }) : l[c.key];
      return `"${String(v ?? '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}
