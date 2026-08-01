import { describe, it, expect } from 'vitest'
import { leadsToCSV } from '@/lib/leads-csv'
import type { LeadData } from '@/lib/types'

function makeLead(overrides: Partial<LeadData> = {}): LeadData {
  return {
    guestId: 'g1', name: 'Alice Smith', email: 'alice@example.com', phone: '+60 12345678',
    country: 'Malaysia', educationLevel: "Bachelor's Degree", programOfInterest: 'Computer Science',
    intendedIntake: 'January 2026', submittedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('leadsToCSV', () => {
  it('includes a header row with column labels', () => {
    const csv = leadsToCSV([])
    expect(csv).toBe('Name,Email,Phone,Country,Education,Program,Intake,Submitted')
  })

  it('renders a plain field unquoted content but still wrapped in quotes', () => {
    const csv = leadsToCSV([makeLead()])
    expect(csv).toContain('"Alice Smith"')
    expect(csv).toContain('"alice@example.com"')
  })

  it('doubles embedded double quotes', () => {
    const csv = leadsToCSV([makeLead({ programOfInterest: 'The "Best" Program' })])
    expect(csv).toContain('"The ""Best"" Program"')
  })

  it('quotes a value containing a comma as a single field', () => {
    const csv = leadsToCSV([makeLead({ name: 'Smith, John' })])
    const dataLine = csv.split('\n')[1]
    expect(dataLine).toContain('"Smith, John"')
    expect(dataLine.startsWith('"Smith, John",')).toBe(true)
  })

  it('formats submittedAt via formatDate instead of the raw ISO string', () => {
    const csv = leadsToCSV([makeLead({ submittedAt: '2024-06-01T00:00:00Z' })])
    const dataLine = csv.split('\n')[1]
    expect(dataLine).not.toContain('2024-06-01T00:00:00Z')
  })
})
