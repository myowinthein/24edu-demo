import { describe, it, expect } from 'vitest'
import { validate, type FormFields } from '@/app/chat/components/lead-form-data'

function validFields(): FormFields {
  return {
    name: 'Ahmad Firdaus',
    email: 'ahmad@example.com',
    phoneCountry: '+60',
    phoneNumber: '12 345 6789',
    country: 'Malaysia',
    educationLevel: "Bachelor's Degree",
    programOfInterest: 'Computer Science',
    intakeMonth: 'January',
    intakeYear: String(new Date().getFullYear()),
  }
}

describe('validate()', () => {
  it('returns no errors for valid input', () => {
    expect(validate(validFields())).toEqual({})
  })

  it('errors on blank name', () => {
    const errs = validate({ ...validFields(), name: '' })
    expect(errs.name).toBeDefined()
  })

  it('errors on name shorter than 2 chars', () => {
    const errs = validate({ ...validFields(), name: 'A' })
    expect(errs.name).toBeDefined()
  })

  it('errors on invalid email', () => {
    const errs = validate({ ...validFields(), email: 'not-an-email' })
    expect(errs.email).toBeDefined()
  })

  it('accepts valid email', () => {
    const errs = validate({ ...validFields(), email: 'user@domain.co.uk' })
    expect(errs.email).toBeUndefined()
  })

  it('errors on empty phone country', () => {
    const errs = validate({ ...validFields(), phoneCountry: '' })
    expect(errs.phoneCountry).toBeDefined()
  })

  it('errors on phone number too short', () => {
    const errs = validate({ ...validFields(), phoneNumber: '123' })
    expect(errs.phoneNumber).toBeDefined()
  })

  it('accepts phone number at the 6-char minimum', () => {
    const errs = validate({ ...validFields(), phoneNumber: '123456' })
    expect(errs.phoneNumber).toBeUndefined()
  })

  it('accepts phone number at the 15-char maximum', () => {
    const errs = validate({ ...validFields(), phoneNumber: '123456789012345' })
    expect(errs.phoneNumber).toBeUndefined()
  })

  it('errors on phone number over the 15-char maximum', () => {
    const errs = validate({ ...validFields(), phoneNumber: '1234567890123456' })
    expect(errs.phoneNumber).toBeDefined()
  })

  it('errors on blank country', () => {
    const errs = validate({ ...validFields(), country: '' })
    expect(errs.country).toBeDefined()
  })

  it('errors on blank education level', () => {
    const errs = validate({ ...validFields(), educationLevel: '' })
    expect(errs.educationLevel).toBeDefined()
  })

  it('errors on program of interest shorter than 2 chars', () => {
    const errs = validate({ ...validFields(), programOfInterest: 'X' })
    expect(errs.programOfInterest).toBeDefined()
  })

  it('errors on blank intake month', () => {
    const errs = validate({ ...validFields(), intakeMonth: '' })
    expect(errs.intakeMonth).toBeDefined()
  })

  it('errors on blank intake year', () => {
    const errs = validate({ ...validFields(), intakeYear: '' })
    expect(errs.intakeYear).toBeDefined()
  })

  it('errors on past year', () => {
    const errs = validate({ ...validFields(), intakeYear: '2020' })
    expect(errs.intakeYear).toBeDefined()
  })

  it('errors on year too far in future', () => {
    const tooFar = String(new Date().getFullYear() + 7)
    const errs = validate({ ...validFields(), intakeYear: tooFar })
    expect(errs.intakeYear).toBeDefined()
  })

  it('accepts current year as valid intake year', () => {
    const errs = validate({ ...validFields(), intakeYear: String(new Date().getFullYear()) })
    expect(errs.intakeYear).toBeUndefined()
  })

  it('accepts current year + 6 as valid intake year', () => {
    const maxYear = String(new Date().getFullYear() + 6)
    const errs = validate({ ...validFields(), intakeYear: maxYear })
    expect(errs.intakeYear).toBeUndefined()
  })

  it('errors on a 3-digit intake year even if numerically in range', () => {
    const errs = validate({ ...validFields(), intakeYear: '202' })
    expect(errs.intakeYear).toBeDefined()
  })

  it('errors on a 5-digit intake year even when parseInt would put it in range', () => {
    const paddedCurrentYear = `0${new Date().getFullYear()}`
    const errs = validate({ ...validFields(), intakeYear: paddedCurrentYear })
    expect(errs.intakeYear).toBeDefined()
  })
})
