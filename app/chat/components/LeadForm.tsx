'use client';

import { useState } from 'react';
import {
  COUNTRY_CODES, COUNTRIES, EDUCATION_LEVELS, MONTHS, CURRENT_YEAR,
  validate, inputStyle, labelStyle, errStyle, border,
  type FormFields, type FieldKey, type FormErrors,
} from './lead-form-data';

interface LeadFormProps {
  guestId: string;
  onComplete: () => void;
}

const req = <span style={{ color: '#dc2626' }}>*</span>;

export function LeadForm({ guestId, onComplete }: LeadFormProps) {
  const [fields, setFields] = useState<FormFields>({
    name: '',
    email: '',
    phoneCountry: '+60',
    phoneNumber: '',
    country: '',
    educationLevel: '',
    programOfInterest: '',
    intakeMonth: '',
    intakeYear: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key: FieldKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          name: fields.name.trim(),
          email: fields.email.trim(),
          phone: `${fields.phoneCountry} ${fields.phoneNumber.trim()}`,
          country: fields.country,
          educationLevel: fields.educationLevel,
          programOfInterest: fields.programOfInterest.trim(),
          intendedIntake: `${fields.intakeMonth} ${fields.intakeYear.trim()}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setServerError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      onComplete();
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        background: 'var(--bg-surface)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--bg)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          padding: '32px 32px 28px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            Before we chat
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)' }}>
            Help us personalise your experience by sharing a little about yourself.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>Full name {req}</label>
              <input
                style={{ ...inputStyle, borderColor: border(!!errors.name) }}
                type="text" value={fields.name} onChange={set('name')}
                placeholder="e.g. Ahmad Firdaus"
              />
              {errors.name && <p style={errStyle}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email {req}</label>
              <input
                style={{ ...inputStyle, borderColor: border(!!errors.email) }}
                type="email" value={fields.email} onChange={set('email')}
                placeholder="you@example.com"
              />
              {errors.email && <p style={errStyle}>{errors.email}</p>}
            </div>

            {/* Phone — country code + number */}
            <div>
              <label style={labelStyle}>Phone / WhatsApp {req}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={fields.phoneCountry}
                  onChange={set('phoneCountry')}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    flexShrink: 0,
                    paddingRight: 8,
                    borderColor: border(!!errors.phoneCountry),
                    cursor: 'pointer',
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={`${c.name}-${c.dial}`} value={c.dial}>
                      {c.flag} {c.name} ({c.dial})
                    </option>
                  ))}
                </select>
                <input
                  style={{ ...inputStyle, flex: 1, borderColor: border(!!errors.phoneNumber) }}
                  type="tel" value={fields.phoneNumber}
                  onChange={e => {
                    setFields(f => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '') }));
                    if (errors.phoneNumber) setErrors(er => ({ ...er, phoneNumber: undefined }));
                  }}
                  placeholder="12 345 6789"
                />
              </div>
              {(errors.phoneCountry || errors.phoneNumber) && (
                <p style={errStyle}>{errors.phoneCountry ?? errors.phoneNumber}</p>
              )}
            </div>

            {/* Nationality / Country */}
            <div>
              <label style={labelStyle}>Nationality / Country {req}</label>
              <select
                value={fields.country}
                onChange={set('country')}
                style={{ ...inputStyle, borderColor: border(!!errors.country), cursor: 'pointer' }}
              >
                <option value="">Select…</option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
              {errors.country && <p style={errStyle}>{errors.country}</p>}
            </div>

            {/* Education level */}
            <div>
              <label style={labelStyle}>Highest education level {req}</label>
              <select
                value={fields.educationLevel}
                onChange={set('educationLevel')}
                style={{ ...inputStyle, borderColor: border(!!errors.educationLevel), cursor: 'pointer' }}
              >
                <option value="">Select…</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.educationLevel && <p style={errStyle}>{errors.educationLevel}</p>}
            </div>

            {/* Program of interest */}
            <div>
              <label style={labelStyle}>Program of interest {req}</label>
              <input
                style={{ ...inputStyle, borderColor: border(!!errors.programOfInterest) }}
                type="text" value={fields.programOfInterest} onChange={set('programOfInterest')}
                placeholder="e.g. Computer Science, Business, Engineering…"
              />
              {errors.programOfInterest && <p style={errStyle}>{errors.programOfInterest}</p>}
            </div>

            {/* Intended intake — month + year */}
            <div>
              <label style={labelStyle}>Intended intake {req}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={fields.intakeMonth}
                  onChange={set('intakeMonth')}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    borderColor: border(!!errors.intakeMonth),
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Month…</option>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  style={{ ...inputStyle, width: 90, flexShrink: 0, borderColor: border(!!errors.intakeYear) }}
                  type="number" value={fields.intakeYear} onChange={set('intakeYear')}
                  placeholder={String(CURRENT_YEAR)}
                  min={CURRENT_YEAR} max={CURRENT_YEAR + 6}
                />
              </div>
              {(errors.intakeMonth || errors.intakeYear) && (
                <p style={errStyle}>{errors.intakeMonth ?? errors.intakeYear}</p>
              )}
            </div>

          </div>

          {serverError && (
            <p style={{ ...errStyle, marginTop: 12, textAlign: 'center' }}>{serverError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              background: submitting ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {submitting ? 'Saving…' : 'Start chatting →'}
          </button>
        </form>
      </div>
    </div>
  );
}
