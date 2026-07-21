'use client';

import { useState } from 'react';

const EDUCATION_LEVELS = [
  'SPM / O-Level',
  'STPM / A-Level',
  'IGCSE / IB',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Other',
];

const INTAKES = [
  'Jan 2026',
  'May 2026',
  'Sep 2026',
  'Jan 2027',
  'May 2027',
  'Not sure yet',
];

interface LeadFormProps {
  guestId: string;
  onComplete: () => void;
}

interface FormFields {
  name: string;
  email: string;
  phone: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intendedIntake: string;
}

type FormErrors = Partial<Record<keyof FormFields, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-(). ]{6,19}$/;

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!fields.name.trim() || fields.name.trim().length < 2)
    errors.name = 'Full name is required (min 2 characters)';
  if (!EMAIL_RE.test(fields.email.trim()))
    errors.email = 'Enter a valid email address';
  if (!PHONE_RE.test(fields.phone.trim()))
    errors.phone = 'Enter a valid phone number';
  if (!fields.country.trim() || fields.country.trim().length < 2)
    errors.country = 'Country / nationality is required';
  if (!fields.educationLevel)
    errors.educationLevel = 'Select your highest education level';
  if (!fields.programOfInterest.trim() || fields.programOfInterest.trim().length < 2)
    errors.programOfInterest = 'Let us know what you want to study';
  if (!fields.intendedIntake)
    errors.intendedIntake = 'Select your intended intake';
  return errors;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  color: '#14151a',
  background: '#ffffff',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#dc2626',
  marginTop: 4,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6,
};

export function LeadForm({ guestId, onComplete }: LeadFormProps) {
  const [fields, setFields] = useState<FormFields>({
    name: '',
    email: '',
    phone: '',
    country: '',
    educationLevel: '',
    programOfInterest: '',
    intendedIntake: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        body: JSON.stringify({ guestId, ...fields }),
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
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e3e3e6',
          padding: '32px 32px 28px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#111827' }}>
            Before we chat
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Help us personalise your experience by sharing a little about yourself.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={labelStyle}>Full name <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: errors.name ? '#dc2626' : '#d1d5db' }}
                type="text" value={fields.name} onChange={set('name')} placeholder="e.g. Ahmad Firdaus" />
              {errors.name && <p style={errorStyle}>{errors.name}</p>}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: errors.email ? '#dc2626' : '#d1d5db' }}
                  type="email" value={fields.email} onChange={set('email')} placeholder="you@example.com" />
                {errors.email && <p style={errorStyle}>{errors.email}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone / WhatsApp <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={{ ...inputStyle, borderColor: errors.phone ? '#dc2626' : '#d1d5db' }}
                  type="tel" value={fields.phone} onChange={set('phone')} placeholder="+60 12 345 6789" />
                {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Nationality / Country <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: errors.country ? '#dc2626' : '#d1d5db' }}
                type="text" value={fields.country} onChange={set('country')} placeholder="e.g. Malaysia" />
              {errors.country && <p style={errorStyle}>{errors.country}</p>}
            </div>

            <div>
              <label style={labelStyle}>Highest education level <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                style={{ ...inputStyle, borderColor: errors.educationLevel ? '#dc2626' : '#d1d5db', cursor: 'pointer' }}
                value={fields.educationLevel}
                onChange={set('educationLevel')}
              >
                <option value="">Select…</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.educationLevel && <p style={errorStyle}>{errors.educationLevel}</p>}
            </div>

            <div>
              <label style={labelStyle}>Program of interest <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={{ ...inputStyle, borderColor: errors.programOfInterest ? '#dc2626' : '#d1d5db' }}
                type="text" value={fields.programOfInterest} onChange={set('programOfInterest')}
                placeholder="e.g. Computer Science, Business, Engineering…" />
              {errors.programOfInterest && <p style={errorStyle}>{errors.programOfInterest}</p>}
            </div>

            <div>
              <label style={labelStyle}>Intended intake <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                style={{ ...inputStyle, borderColor: errors.intendedIntake ? '#dc2626' : '#d1d5db', cursor: 'pointer' }}
                value={fields.intendedIntake}
                onChange={set('intendedIntake')}
              >
                <option value="">Select…</option>
                {INTAKES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              {errors.intendedIntake && <p style={errorStyle}>{errors.intendedIntake}</p>}
            </div>

          </div>

          {serverError && (
            <p style={{ ...errorStyle, marginTop: 12, textAlign: 'center' }}>{serverError}</p>
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
