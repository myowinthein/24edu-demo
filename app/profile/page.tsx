'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '../chat/components/ChatSidebar';
import type { SessionRow } from '../chat/constants';
import type { LeadData } from '@/lib/types';

// ── shared constants (mirrored from LeadForm) ────────────────────────────────

const COUNTRY_CODES = [
  { flag: '🇲🇾', name: 'Malaysia',       dial: '+60'  },
  { flag: '🇸🇬', name: 'Singapore',      dial: '+65'  },
  { flag: '🇮🇩', name: 'Indonesia',      dial: '+62'  },
  { flag: '🇹🇭', name: 'Thailand',       dial: '+66'  },
  { flag: '🇵🇭', name: 'Philippines',    dial: '+63'  },
  { flag: '🇻🇳', name: 'Vietnam',        dial: '+84'  },
  { flag: '🇧🇳', name: 'Brunei',         dial: '+673' },
  { flag: '🇲🇲', name: 'Myanmar',        dial: '+95'  },
  { flag: '🇰🇭', name: 'Cambodia',       dial: '+855' },
  { flag: '🇱🇦', name: 'Laos',           dial: '+856' },
  { flag: '🇹🇱', name: 'Timor-Leste',    dial: '+670' },
  { flag: '🇮🇳', name: 'India',          dial: '+91'  },
  { flag: '🇧🇩', name: 'Bangladesh',     dial: '+880' },
  { flag: '🇵🇰', name: 'Pakistan',       dial: '+92'  },
  { flag: '🇱🇰', name: 'Sri Lanka',      dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',          dial: '+977' },
  { flag: '🇲🇻', name: 'Maldives',       dial: '+960' },
  { flag: '🇸🇦', name: 'Saudi Arabia',   dial: '+966' },
  { flag: '🇦🇪', name: 'UAE',            dial: '+971' },
  { flag: '🇶🇦', name: 'Qatar',          dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',         dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',        dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',           dial: '+968' },
  { flag: '🇯🇴', name: 'Jordan',         dial: '+962' },
  { flag: '🇾🇪', name: 'Yemen',          dial: '+967' },
  { flag: '🇨🇳', name: 'China',          dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',          dial: '+81'  },
  { flag: '🇰🇷', name: 'South Korea',    dial: '+82'  },
  { flag: '🇹🇼', name: 'Taiwan',         dial: '+886' },
  { flag: '🇭🇰', name: 'Hong Kong',      dial: '+852' },
  { flag: '🇦🇺', name: 'Australia',      dial: '+61'  },
  { flag: '🇳🇿', name: 'New Zealand',    dial: '+64'  },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44'  },
  { flag: '🇩🇪', name: 'Germany',        dial: '+49'  },
  { flag: '🇫🇷', name: 'France',         dial: '+33'  },
  { flag: '🇮🇹', name: 'Italy',          dial: '+39'  },
  { flag: '🇳🇱', name: 'Netherlands',    dial: '+31'  },
  { flag: '🇷🇺', name: 'Russia',         dial: '+7'   },
  { flag: '🇺🇸', name: 'United States',  dial: '+1'   },
  { flag: '🇨🇦', name: 'Canada',         dial: '+1'   },
  { flag: '🇧🇷', name: 'Brazil',         dial: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',         dial: '+52'  },
  { flag: '🇿🇦', name: 'South Africa',   dial: '+27'  },
  { flag: '🇳🇬', name: 'Nigeria',        dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',          dial: '+254' },
  { flag: '🇬🇭', name: 'Ghana',          dial: '+233' },
  { flag: '🇪🇬', name: 'Egypt',          dial: '+20'  },
  { flag: '🇪🇹', name: 'Ethiopia',       dial: '+251' },
  { flag: '🇹🇿', name: 'Tanzania',       dial: '+255' },
];

const COUNTRIES = [
  { flag: '🇲🇾', name: 'Malaysia'       },
  { flag: '🇸🇬', name: 'Singapore'      },
  { flag: '🇮🇩', name: 'Indonesia'      },
  { flag: '🇹🇭', name: 'Thailand'       },
  { flag: '🇵🇭', name: 'Philippines'    },
  { flag: '🇻🇳', name: 'Vietnam'        },
  { flag: '🇧🇳', name: 'Brunei'         },
  { flag: '🇲🇲', name: 'Myanmar'        },
  { flag: '🇰🇭', name: 'Cambodia'       },
  { flag: '🇱🇦', name: 'Laos'           },
  { flag: '🇹🇱', name: 'Timor-Leste'    },
  { flag: '🇮🇳', name: 'India'          },
  { flag: '🇧🇩', name: 'Bangladesh'     },
  { flag: '🇵🇰', name: 'Pakistan'       },
  { flag: '🇱🇰', name: 'Sri Lanka'      },
  { flag: '🇳🇵', name: 'Nepal'          },
  { flag: '🇲🇻', name: 'Maldives'       },
  { flag: '🇸🇦', name: 'Saudi Arabia'   },
  { flag: '🇦🇪', name: 'UAE'            },
  { flag: '🇶🇦', name: 'Qatar'          },
  { flag: '🇰🇼', name: 'Kuwait'         },
  { flag: '🇧🇭', name: 'Bahrain'        },
  { flag: '🇴🇲', name: 'Oman'           },
  { flag: '🇯🇴', name: 'Jordan'         },
  { flag: '🇾🇪', name: 'Yemen'          },
  { flag: '🇨🇳', name: 'China'          },
  { flag: '🇯🇵', name: 'Japan'          },
  { flag: '🇰🇷', name: 'South Korea'    },
  { flag: '🇹🇼', name: 'Taiwan'         },
  { flag: '🇭🇰', name: 'Hong Kong'      },
  { flag: '🇲🇴', name: 'Macau'          },
  { flag: '🇦🇺', name: 'Australia'      },
  { flag: '🇳🇿', name: 'New Zealand'    },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany'        },
  { flag: '🇫🇷', name: 'France'         },
  { flag: '🇮🇹', name: 'Italy'          },
  { flag: '🇪🇸', name: 'Spain'          },
  { flag: '🇳🇱', name: 'Netherlands'    },
  { flag: '🇨🇭', name: 'Switzerland'    },
  { flag: '🇸🇪', name: 'Sweden'         },
  { flag: '🇷🇺', name: 'Russia'         },
  { flag: '🇺🇸', name: 'United States'  },
  { flag: '🇨🇦', name: 'Canada'         },
  { flag: '🇧🇷', name: 'Brazil'         },
  { flag: '🇲🇽', name: 'Mexico'         },
  { flag: '🇿🇦', name: 'South Africa'   },
  { flag: '🇳🇬', name: 'Nigeria'        },
  { flag: '🇰🇪', name: 'Kenya'          },
  { flag: '🇬🇭', name: 'Ghana'          },
  { flag: '🇪🇬', name: 'Egypt'          },
  { flag: '🇪🇹', name: 'Ethiopia'       },
  { flag: '🇹🇿', name: 'Tanzania'       },
  { flag: '🇺🇬', name: 'Uganda'         },
  { flag: '🇿🇲', name: 'Zambia'         },
];

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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();

// ── helpers ──────────────────────────────────────────────────────────────────

const LS_GUEST_ID = 'chat:guestId';

function getGuestId(): string | null {
  try { return localStorage.getItem(LS_GUEST_ID); } catch { return null; }
}

function parsePhone(phone: string): { phoneCountry: string; phoneNumber: string } {
  const spaceIdx = phone.indexOf(' ');
  if (spaceIdx === -1) return { phoneCountry: '+60', phoneNumber: phone };
  return { phoneCountry: phone.slice(0, spaceIdx), phoneNumber: phone.slice(spaceIdx + 1) };
}

function parseIntake(intake: string): { intakeMonth: string; intakeYear: string } {
  const parts = intake.split(' ');
  if (parts.length < 2) return { intakeMonth: '', intakeYear: intake };
  return { intakeMonth: parts[0], intakeYear: parts[parts.length - 1] };
}

// ── styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: '1px solid #d1d5db', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#14151a', background: '#ffffff', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const errStyle: React.CSSProperties = { fontSize: 12, color: '#dc2626', marginTop: 4 };
const req = <span style={{ color: '#dc2626' }}>*</span>;

interface FormFields {
  name: string; email: string; phoneCountry: string; phoneNumber: string;
  country: string; educationLevel: string; programOfInterest: string;
  intakeMonth: string; intakeYear: string;
}
type FieldKey = keyof FormFields;
type FormErrors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_NUM_RE = /^[\d\s\-(). ]{6,15}$/;

function validate(f: FormFields): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim() || f.name.trim().length < 2) e.name = 'Full name is required (min 2 characters)';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!f.phoneCountry) e.phoneCountry = 'Select a country code';
  if (!f.phoneNumber.trim() || !PHONE_NUM_RE.test(f.phoneNumber.trim())) e.phoneNumber = 'Enter a valid phone number (6–15 digits)';
  if (!f.country) e.country = 'Select your nationality / country';
  if (!f.educationLevel) e.educationLevel = 'Select your highest education level';
  if (!f.programOfInterest.trim() || f.programOfInterest.trim().length < 2) e.programOfInterest = 'Let us know what you want to study';
  if (!f.intakeMonth) e.intakeMonth = 'Select a month';
  if (!f.intakeYear.trim()) e.intakeYear = 'Enter a year';
  else {
    const yr = parseInt(f.intakeYear);
    if (!/^\d{4}$/.test(f.intakeYear) || yr < CURRENT_YEAR || yr > CURRENT_YEAR + 6)
      e.intakeYear = `Enter a year between ${CURRENT_YEAR} and ${CURRENT_YEAR + 6}`;
  }
  return e;
}

function border(hasErr: boolean) { return hasErr ? '#dc2626' : '#d1d5db'; }

const navActive: React.CSSProperties = { padding: '7px 13px', borderRadius: 6, fontSize: 14, color: '#ffffff', background: '#14151a', textDecoration: 'none' };
const navInactive: React.CSSProperties = { padding: '7px 13px', borderRadius: 6, fontSize: 14, color: '#14151a', background: '#f1f1f3', textDecoration: 'none' };

// ── page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'no-data' | 'ready' | 'saved'>('loading');
  const [fields, setFields] = useState<FormFields>({
    name: '', email: '', phoneCountry: '+60', phoneNumber: '',
    country: '', educationLevel: '', programOfInterest: '',
    intakeMonth: '', intakeYear: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    const gid = getGuestId();
    if (!gid) { setStatus('no-data'); return; }
    setGuestId(gid);

    Promise.all([
      fetch(`/api/guest/${gid}/lead`).then((r) => (r.ok ? r.json() as Promise<LeadData> : null)),
      fetch(`/api/guest/${gid}/sessions`).then((r) => (r.ok ? r.json() as Promise<SessionRow[]> : [])),
    ]).then(([lead, sessionList]) => {
      if (Array.isArray(sessionList)) setSessions(sessionList);
      if (!lead) { setStatus('no-data'); return; }
      const { phoneCountry, phoneNumber } = parsePhone(lead.phone);
      const { intakeMonth, intakeYear } = parseIntake(lead.intendedIntake);
      setFields({
        name: lead.name,
        email: lead.email,
        phoneCountry,
        phoneNumber,
        country: lead.country,
        educationLevel: lead.educationLevel,
        programOfInterest: lead.programOfInterest,
        intakeMonth,
        intakeYear,
      });
      setStatus('ready');
    }).catch(() => setStatus('no-data'));
  }, []);

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
      setStatus('saved');
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        sessions={sessions}
        sessionId={null}
        onNewChat={() => router.push('/chat')}
        onSwitchSession={() => router.push('/chat')}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* top nav */}
        <div style={{ flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', borderBottom: '1px solid #e3e3e6' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <Link href="/chat" style={navInactive}>💬 Chat</Link>
            <Link href="/profile" style={navActive}>👤 Profile</Link>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', background: '#f9fafb' }}>
          <div style={{ width: '100%', maxWidth: 500, background: '#ffffff', borderRadius: 14, border: '1px solid #e3e3e6', padding: '32px 32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

            {status === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 14, justifyContent: 'center', padding: '24px 0' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Loading your info…
              </div>
            )}

            {status === 'no-data' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 16px' }}>No info found. Please start by chatting first.</p>
                <Link href="/chat" style={{ display: 'inline-block', padding: '9px 20px', fontSize: 14, fontWeight: 500, background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
                  Go to Chat
                </Link>
              </div>
            )}

            {status === 'saved' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Info updated!</p>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>Your details have been saved successfully.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setStatus('ready')} style={{ padding: '8px 16px', fontSize: 14, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>
                    Edit again
                  </button>
                  <Link href="/chat" style={{ display: 'inline-block', padding: '8px 16px', fontSize: 14, fontWeight: 500, background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>
                    Back to Chat
                  </Link>
                </div>
              </div>
            )}

            {status === 'ready' && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#111827' }}>👤 Profile</h2>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Update your details below.</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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

                    <div>
                      <label style={labelStyle}>Phone / WhatsApp {req}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={fields.phoneCountry} onChange={set('phoneCountry')} style={{ ...inputStyle, width: 'auto', flexShrink: 0, paddingRight: 8, borderColor: border(!!errors.phoneCountry), cursor: 'pointer' }}>
                          {COUNTRY_CODES.map((c) => (
                            <option key={`${c.name}-${c.dial}`} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>
                          ))}
                        </select>
                        <input style={{ ...inputStyle, flex: 1, borderColor: border(!!errors.phoneNumber) }} type="tel" value={fields.phoneNumber} onChange={set('phoneNumber')} placeholder="12 345 6789" />
                      </div>
                      {(errors.phoneCountry || errors.phoneNumber) && <p style={errStyle}>{errors.phoneCountry ?? errors.phoneNumber}</p>}
                    </div>

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
                        <input style={{ ...inputStyle, width: 90, flexShrink: 0, borderColor: border(!!errors.intakeYear) }} type="number" value={fields.intakeYear} onChange={set('intakeYear')} placeholder={String(CURRENT_YEAR)} min={CURRENT_YEAR} max={CURRENT_YEAR + 6} />
                      </div>
                      {(errors.intakeMonth || errors.intakeYear) && <p style={errStyle}>{errors.intakeMonth ?? errors.intakeYear}</p>}
                    </div>

                  </div>

                  {serverError && <p style={{ ...errStyle, marginTop: 12, textAlign: 'center' }}>{serverError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ marginTop: 24, width: '100%', padding: '12px', fontSize: 15, fontWeight: 600, background: submitting ? '#93c5fd' : '#2563eb', color: '#ffffff', border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    {submitting ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
