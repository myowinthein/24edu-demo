'use client';

import { useState } from 'react';

const COUNTRY_CODES = [
  // Southeast Asia
  { flag: '🇲🇾', name: 'Malaysia',     dial: '+60'  },
  { flag: '🇸🇬', name: 'Singapore',    dial: '+65'  },
  { flag: '🇮🇩', name: 'Indonesia',    dial: '+62'  },
  { flag: '🇹🇭', name: 'Thailand',     dial: '+66'  },
  { flag: '🇵🇭', name: 'Philippines',  dial: '+63'  },
  { flag: '🇻🇳', name: 'Vietnam',      dial: '+84'  },
  { flag: '🇧🇳', name: 'Brunei',       dial: '+673' },
  { flag: '🇲🇲', name: 'Myanmar',      dial: '+95'  },
  { flag: '🇰🇭', name: 'Cambodia',     dial: '+855' },
  { flag: '🇱🇦', name: 'Laos',         dial: '+856' },
  { flag: '🇹🇱', name: 'Timor-Leste',  dial: '+670' },
  // South Asia
  { flag: '🇮🇳', name: 'India',        dial: '+91'  },
  { flag: '🇧🇩', name: 'Bangladesh',   dial: '+880' },
  { flag: '🇵🇰', name: 'Pakistan',     dial: '+92'  },
  { flag: '🇱🇰', name: 'Sri Lanka',    dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',        dial: '+977' },
  { flag: '🇲🇻', name: 'Maldives',     dial: '+960' },
  // Middle East
  { flag: '🇸🇦', name: 'Saudi Arabia', dial: '+966' },
  { flag: '🇦🇪', name: 'UAE',          dial: '+971' },
  { flag: '🇶🇦', name: 'Qatar',        dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',       dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',      dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',         dial: '+968' },
  { flag: '🇯🇴', name: 'Jordan',       dial: '+962' },
  { flag: '🇾🇪', name: 'Yemen',        dial: '+967' },
  // East Asia
  { flag: '🇨🇳', name: 'China',        dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',        dial: '+81'  },
  { flag: '🇰🇷', name: 'South Korea',  dial: '+82'  },
  { flag: '🇹🇼', name: 'Taiwan',       dial: '+886' },
  { flag: '🇭🇰', name: 'Hong Kong',    dial: '+852' },
  // Oceania
  { flag: '🇦🇺', name: 'Australia',    dial: '+61'  },
  { flag: '🇳🇿', name: 'New Zealand',  dial: '+64'  },
  // Europe
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { flag: '🇩🇪', name: 'Germany',      dial: '+49'  },
  { flag: '🇫🇷', name: 'France',       dial: '+33'  },
  { flag: '🇮🇹', name: 'Italy',        dial: '+39'  },
  { flag: '🇳🇱', name: 'Netherlands',  dial: '+31'  },
  { flag: '🇷🇺', name: 'Russia',       dial: '+7'   },
  // Americas
  { flag: '🇺🇸', name: 'United States', dial: '+1'  },
  { flag: '🇨🇦', name: 'Canada',       dial: '+1'   },
  { flag: '🇧🇷', name: 'Brazil',       dial: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',       dial: '+52'  },
  // Africa
  { flag: '🇿🇦', name: 'South Africa', dial: '+27'  },
  { flag: '🇳🇬', name: 'Nigeria',      dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',        dial: '+254' },
  { flag: '🇬🇭', name: 'Ghana',        dial: '+233' },
  { flag: '🇪🇬', name: 'Egypt',        dial: '+20'  },
  { flag: '🇪🇹', name: 'Ethiopia',     dial: '+251' },
  { flag: '🇹🇿', name: 'Tanzania',     dial: '+255' },
];

const COUNTRIES = [
  // Southeast Asia
  { flag: '🇲🇾', name: 'Malaysia'      },
  { flag: '🇸🇬', name: 'Singapore'     },
  { flag: '🇮🇩', name: 'Indonesia'     },
  { flag: '🇹🇭', name: 'Thailand'      },
  { flag: '🇵🇭', name: 'Philippines'   },
  { flag: '🇻🇳', name: 'Vietnam'       },
  { flag: '🇧🇳', name: 'Brunei'        },
  { flag: '🇲🇲', name: 'Myanmar'       },
  { flag: '🇰🇭', name: 'Cambodia'      },
  { flag: '🇱🇦', name: 'Laos'          },
  { flag: '🇹🇱', name: 'Timor-Leste'   },
  // South Asia
  { flag: '🇮🇳', name: 'India'         },
  { flag: '🇧🇩', name: 'Bangladesh'    },
  { flag: '🇵🇰', name: 'Pakistan'      },
  { flag: '🇱🇰', name: 'Sri Lanka'     },
  { flag: '🇳🇵', name: 'Nepal'         },
  { flag: '🇲🇻', name: 'Maldives'      },
  // Middle East
  { flag: '🇸🇦', name: 'Saudi Arabia'  },
  { flag: '🇦🇪', name: 'UAE'           },
  { flag: '🇶🇦', name: 'Qatar'         },
  { flag: '🇰🇼', name: 'Kuwait'        },
  { flag: '🇧🇭', name: 'Bahrain'       },
  { flag: '🇴🇲', name: 'Oman'          },
  { flag: '🇯🇴', name: 'Jordan'        },
  { flag: '🇾🇪', name: 'Yemen'         },
  // East Asia
  { flag: '🇨🇳', name: 'China'         },
  { flag: '🇯🇵', name: 'Japan'         },
  { flag: '🇰🇷', name: 'South Korea'   },
  { flag: '🇹🇼', name: 'Taiwan'        },
  { flag: '🇭🇰', name: 'Hong Kong'     },
  { flag: '🇲🇴', name: 'Macau'         },
  // Oceania
  { flag: '🇦🇺', name: 'Australia'     },
  { flag: '🇳🇿', name: 'New Zealand'   },
  // Europe
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany'       },
  { flag: '🇫🇷', name: 'France'        },
  { flag: '🇮🇹', name: 'Italy'         },
  { flag: '🇪🇸', name: 'Spain'         },
  { flag: '🇳🇱', name: 'Netherlands'   },
  { flag: '🇨🇭', name: 'Switzerland'   },
  { flag: '🇸🇪', name: 'Sweden'        },
  { flag: '🇷🇺', name: 'Russia'        },
  // Americas
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇨🇦', name: 'Canada'        },
  { flag: '🇧🇷', name: 'Brazil'        },
  { flag: '🇲🇽', name: 'Mexico'        },
  // Africa
  { flag: '🇿🇦', name: 'South Africa'  },
  { flag: '🇳🇬', name: 'Nigeria'       },
  { flag: '🇰🇪', name: 'Kenya'         },
  { flag: '🇬🇭', name: 'Ghana'         },
  { flag: '🇪🇬', name: 'Egypt'         },
  { flag: '🇪🇹', name: 'Ethiopia'      },
  { flag: '🇹🇿', name: 'Tanzania'      },
  { flag: '🇺🇬', name: 'Uganda'        },
  { flag: '🇿🇲', name: 'Zambia'        },
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

interface LeadFormProps {
  guestId: string;
  onComplete: () => void;
}

interface FormFields {
  name: string;
  email: string;
  phoneCountry: string;
  phoneNumber: string;
  country: string;
  educationLevel: string;
  programOfInterest: string;
  intakeMonth: string;
  intakeYear: string;
}

type FieldKey = keyof FormFields;
type FormErrors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_NUM_RE = /^[\d\s\-(). ]{6,15}$/;

function validate(f: FormFields): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim() || f.name.trim().length < 2)
    e.name = 'Full name is required (min 2 characters)';
  if (!EMAIL_RE.test(f.email.trim()))
    e.email = 'Enter a valid email address';
  if (!f.phoneCountry)
    e.phoneCountry = 'Select a country code';
  if (!f.phoneNumber.trim() || !PHONE_NUM_RE.test(f.phoneNumber.trim()))
    e.phoneNumber = 'Enter a valid phone number (digits only, 6–15 characters)';
  if (!f.country)
    e.country = 'Select your nationality / country';
  if (!f.educationLevel)
    e.educationLevel = 'Select your highest education level';
  if (!f.programOfInterest.trim() || f.programOfInterest.trim().length < 2)
    e.programOfInterest = 'Let us know what you want to study';
  if (!f.intakeMonth)
    e.intakeMonth = 'Select a month';
  if (!f.intakeYear.trim())
    e.intakeYear = 'Enter a year';
  else {
    const yr = parseInt(f.intakeYear);
    if (!/^\d{4}$/.test(f.intakeYear) || yr < CURRENT_YEAR || yr > CURRENT_YEAR + 6)
      e.intakeYear = `Enter a year between ${CURRENT_YEAR} and ${CURRENT_YEAR + 6}`;
  }
  return e;
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

const errStyle: React.CSSProperties = { fontSize: 12, color: '#dc2626', marginTop: 4 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 };
const req = <span style={{ color: '#dc2626' }}>*</span>;

function border(hasError: boolean) {
  return hasError ? '#dc2626' : '#d1d5db';
}

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
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
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
                  type="tel" value={fields.phoneNumber} onChange={set('phoneNumber')}
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
