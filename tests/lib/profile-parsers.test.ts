import { describe, it, expect } from 'vitest'
import { parsePhone, parseIntake } from '@/app/(user-area)/profile/parsers'

describe('parsePhone', () => {
  it('splits a "code number" string on the first space', () => {
    expect(parsePhone('+60 12 345 6789')).toEqual({ phoneCountry: '+60', phoneNumber: '12 345 6789' })
  })

  it('falls back to +60 when there is no space (no country code present)', () => {
    expect(parsePhone('123456789')).toEqual({ phoneCountry: '+60', phoneNumber: '123456789' })
  })

  it('handles an empty string via the no-space fallback', () => {
    expect(parsePhone('')).toEqual({ phoneCountry: '+60', phoneNumber: '' })
  })
})

describe('parseIntake', () => {
  it('splits a "Month Year" string into separate fields', () => {
    expect(parseIntake('January 2026')).toEqual({ intakeMonth: 'January', intakeYear: '2026' })
  })

  it('falls back to an empty month when there is no space (single token)', () => {
    expect(parseIntake('2026')).toEqual({ intakeMonth: '', intakeYear: '2026' })
  })

  it('handles an empty string via the no-space fallback', () => {
    expect(parseIntake('')).toEqual({ intakeMonth: '', intakeYear: '' })
  })
})
