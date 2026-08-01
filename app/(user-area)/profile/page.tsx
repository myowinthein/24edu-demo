'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { LeadData } from '@/lib/types';
import { useUserArea } from '../UserAreaContext';
import { SpinnerIcon } from '@/app/chat/components/SpinnerIcon';
import {
  COUNTRY_CODES, COUNTRIES, EDUCATION_LEVELS, MONTHS, CURRENT_YEAR,
  inputStyle, labelStyle, errStyle, border,
} from '@/app/chat/components/lead-form-data';
import { useLeadForm } from '@/app/chat/components/use-lead-form';
import { parsePhone, parseIntake } from './parsers';

const req = <span style={{ color: '#dc2626' }}>*</span>;

export default function ProfilePage() {
  const { guestId } = useUserArea();
  const [status, setStatus] = useState<'loading' | 'no-data' | 'ready' | 'saved'>('loading');
  const { fields, setFields, errors, submitting, serverError, set, setPhoneNumber, handleSubmit } =
    useLeadForm(guestId, () => setStatus('saved'));

  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/guest/${guestId}/lead`)
      .then((r) => (r.ok ? r.json() as Promise<LeadData> : null))
      .then((lead) => {
        if (!lead) { setStatus('no-data'); return; }
        const { phoneCountry, phoneNumber } = parsePhone(lead.phone);
        const { intakeMonth, intakeYear } = parseIntake(lead.intendedIntake);
        setFields({
          name: lead.name, email: lead.email,
          phoneCountry, phoneNumber,
          country: lead.country,
          educationLevel: lead.educationLevel,
          programOfInterest: lead.programOfInterest,
          intakeMonth, intakeYear,
        });
        setStatus('ready');
      })
      .catch(() => setStatus('no-data'));
  }, [guestId]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 780 }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>👤 Profile</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)' }}>Update your details below.</p>
        </div>

        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 14, padding: '24px 0' }}>
            <SpinnerIcon />
            Loading profile…
          </div>
        )}

        {status === 'no-data' && (
          <div style={{ padding: '24px 0' }}>
            <p style={{ fontSize: 15, color: 'var(--text-3)', margin: '0 0 16px' }}>No info found. Please start by chatting first.</p>
            <Link href="/chat" style={{ display: 'inline-block', padding: '9px 20px', fontSize: 14, fontWeight: 500, background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
              Go to Chat
            </Link>
          </div>
        )}

        {status === 'saved' && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Info updated!</p>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 20px' }}>Your details have been saved successfully.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStatus('ready')} style={{ padding: '8px 16px', fontSize: 14, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                Edit again
              </button>
              <Link href="/chat" style={{ display: 'inline-block', padding: '8px 16px', fontSize: 14, fontWeight: 500, background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
                Back to Chat
              </Link>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Row 1: Name + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Full name {req}</label>
                <input style={{ ...inputStyle, borderColor: border(!!errors.name) }} type="text" value={fields.name} onChange={set('name')} placeholder="e.g. Ahmad Firdaus" />
                {errors.name && <p style={errStyle}>{errors.name}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email {req}</label>
                <input style={{ ...inputStyle, borderColor: border(!!errors.email) }} type="email" value={fields.email} onChange={set('email')} placeholder="you@example.com" />
                {errors.email && <p style={errStyle}>{errors.email}</p>}
              </div>
            </div>

            {/* Row 2: Phone (full width) */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Phone / WhatsApp {req}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={fields.phoneCountry} onChange={set('phoneCountry')} style={{ ...inputStyle, width: 'auto', flexShrink: 0, paddingRight: 8, borderColor: border(!!errors.phoneCountry), cursor: 'pointer' }}>
                  {COUNTRY_CODES.map((c) => (
                    <option key={`${c.name}-${c.dial}`} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>
                  ))}
                </select>
                <input style={{ ...inputStyle, flex: 1, borderColor: border(!!errors.phoneNumber) }} type="tel" value={fields.phoneNumber} onChange={setPhoneNumber} placeholder="12 345 6789" />
              </div>
              {(errors.phoneCountry || errors.phoneNumber) && <p style={errStyle}>{errors.phoneCountry ?? errors.phoneNumber}</p>}
            </div>

            {/* Row 3: Country + Education */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nationality / Country {req}</label>
                <select value={fields.country} onChange={set('country')} style={{ ...inputStyle, borderColor: border(!!errors.country), cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
                {errors.country && <p style={errStyle}>{errors.country}</p>}
              </div>
              <div>
                <label style={labelStyle}>Highest education level {req}</label>
                <select value={fields.educationLevel} onChange={set('educationLevel')} style={{ ...inputStyle, borderColor: border(!!errors.educationLevel), cursor: 'pointer' }}>
                  <option value="">Select…</option>
                  {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {errors.educationLevel && <p style={errStyle}>{errors.educationLevel}</p>}
              </div>
            </div>

            {/* Row 4: Program + Intake */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Program of interest {req}</label>
                <input style={{ ...inputStyle, borderColor: border(!!errors.programOfInterest) }} type="text" value={fields.programOfInterest} onChange={set('programOfInterest')} placeholder="e.g. Computer Science, Business…" />
                {errors.programOfInterest && <p style={errStyle}>{errors.programOfInterest}</p>}
              </div>
              <div>
                <label style={labelStyle}>Intended intake {req}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={fields.intakeMonth} onChange={set('intakeMonth')} style={{ ...inputStyle, flex: 1, borderColor: border(!!errors.intakeMonth), cursor: 'pointer' }}>
                    <option value="">Month…</option>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input style={{ ...inputStyle, width: 88, flexShrink: 0, borderColor: border(!!errors.intakeYear) }} type="number" value={fields.intakeYear} onChange={set('intakeYear')} placeholder={String(CURRENT_YEAR)} min={CURRENT_YEAR} max={CURRENT_YEAR + 6} />
                </div>
                {(errors.intakeMonth || errors.intakeYear) && <p style={errStyle}>{errors.intakeMonth ?? errors.intakeYear}</p>}
              </div>
            </div>

            {serverError && <p style={{ ...errStyle, marginBottom: 12 }}>{serverError}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '11px 28px', fontSize: 15, fontWeight: 600,
                background: submitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff', border: 'none', borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
