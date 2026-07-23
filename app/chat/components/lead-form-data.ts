import type { CSSProperties } from 'react';

export const COUNTRY_CODES = [
  // Southeast Asia
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
  // South Asia
  { flag: '🇮🇳', name: 'India',          dial: '+91'  },
  { flag: '🇧🇩', name: 'Bangladesh',     dial: '+880' },
  { flag: '🇵🇰', name: 'Pakistan',       dial: '+92'  },
  { flag: '🇱🇰', name: 'Sri Lanka',      dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',          dial: '+977' },
  { flag: '🇲🇻', name: 'Maldives',       dial: '+960' },
  // Middle East
  { flag: '🇸🇦', name: 'Saudi Arabia',   dial: '+966' },
  { flag: '🇦🇪', name: 'UAE',            dial: '+971' },
  { flag: '🇶🇦', name: 'Qatar',          dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',         dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',        dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',           dial: '+968' },
  { flag: '🇯🇴', name: 'Jordan',         dial: '+962' },
  { flag: '🇾🇪', name: 'Yemen',          dial: '+967' },
  // East Asia
  { flag: '🇨🇳', name: 'China',          dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',          dial: '+81'  },
  { flag: '🇰🇷', name: 'South Korea',    dial: '+82'  },
  { flag: '🇹🇼', name: 'Taiwan',         dial: '+886' },
  { flag: '🇭🇰', name: 'Hong Kong',      dial: '+852' },
  // Oceania
  { flag: '🇦🇺', name: 'Australia',      dial: '+61'  },
  { flag: '🇳🇿', name: 'New Zealand',    dial: '+64'  },
  // Europe
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44'  },
  { flag: '🇩🇪', name: 'Germany',        dial: '+49'  },
  { flag: '🇫🇷', name: 'France',         dial: '+33'  },
  { flag: '🇮🇹', name: 'Italy',          dial: '+39'  },
  { flag: '🇳🇱', name: 'Netherlands',    dial: '+31'  },
  { flag: '🇷🇺', name: 'Russia',         dial: '+7'   },
  // Americas
  { flag: '🇺🇸', name: 'United States',  dial: '+1'   },
  { flag: '🇨🇦', name: 'Canada',         dial: '+1'   },
  { flag: '🇧🇷', name: 'Brazil',         dial: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',         dial: '+52'  },
  // Africa
  { flag: '🇿🇦', name: 'South Africa',   dial: '+27'  },
  { flag: '🇳🇬', name: 'Nigeria',        dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',          dial: '+254' },
  { flag: '🇬🇭', name: 'Ghana',          dial: '+233' },
  { flag: '🇪🇬', name: 'Egypt',          dial: '+20'  },
  { flag: '🇪🇹', name: 'Ethiopia',       dial: '+251' },
  { flag: '🇹🇿', name: 'Tanzania',       dial: '+255' },
];

export const COUNTRIES = [
  // Southeast Asia
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
  // South Asia
  { flag: '🇮🇳', name: 'India'          },
  { flag: '🇧🇩', name: 'Bangladesh'     },
  { flag: '🇵🇰', name: 'Pakistan'       },
  { flag: '🇱🇰', name: 'Sri Lanka'      },
  { flag: '🇳🇵', name: 'Nepal'          },
  { flag: '🇲🇻', name: 'Maldives'       },
  // Middle East
  { flag: '🇸🇦', name: 'Saudi Arabia'   },
  { flag: '🇦🇪', name: 'UAE'            },
  { flag: '🇶🇦', name: 'Qatar'          },
  { flag: '🇰🇼', name: 'Kuwait'         },
  { flag: '🇧🇭', name: 'Bahrain'        },
  { flag: '🇴🇲', name: 'Oman'           },
  { flag: '🇯🇴', name: 'Jordan'         },
  { flag: '🇾🇪', name: 'Yemen'          },
  // East Asia
  { flag: '🇨🇳', name: 'China'          },
  { flag: '🇯🇵', name: 'Japan'          },
  { flag: '🇰🇷', name: 'South Korea'    },
  { flag: '🇹🇼', name: 'Taiwan'         },
  { flag: '🇭🇰', name: 'Hong Kong'      },
  { flag: '🇲🇴', name: 'Macau'          },
  // Oceania
  { flag: '🇦🇺', name: 'Australia'      },
  { flag: '🇳🇿', name: 'New Zealand'    },
  // Europe
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany'        },
  { flag: '🇫🇷', name: 'France'         },
  { flag: '🇮🇹', name: 'Italy'          },
  { flag: '🇪🇸', name: 'Spain'          },
  { flag: '🇳🇱', name: 'Netherlands'    },
  { flag: '🇨🇭', name: 'Switzerland'    },
  { flag: '🇸🇪', name: 'Sweden'         },
  { flag: '🇷🇺', name: 'Russia'         },
  // Americas
  { flag: '🇺🇸', name: 'United States'  },
  { flag: '🇨🇦', name: 'Canada'         },
  { flag: '🇧🇷', name: 'Brazil'         },
  { flag: '🇲🇽', name: 'Mexico'         },
  // Africa
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

export const EDUCATION_LEVELS = [
  'SPM / O-Level',
  'STPM / A-Level',
  'IGCSE / IB',
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Other',
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CURRENT_YEAR = new Date().getFullYear();

export interface FormFields {
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

export type FieldKey = keyof FormFields;
export type FormErrors = Partial<Record<FieldKey, string>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_NUM_RE = /^[\d\s\-(). ]{6,15}$/;

export function validate(f: FormFields): FormErrors {
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
  if (!f.intakeYear.trim()) {
    e.intakeYear = 'Enter a year';
  } else {
    const yr = parseInt(f.intakeYear);
    if (!/^\d{4}$/.test(f.intakeYear) || yr < CURRENT_YEAR || yr > CURRENT_YEAR + 6)
      e.intakeYear = `Enter a year between ${CURRENT_YEAR} and ${CURRENT_YEAR + 6}`;
  }
  return e;
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid var(--border-md)',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--text)',
  background: 'var(--bg)',
  boxSizing: 'border-box',
};

export const labelStyle: CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6,
};

export const errStyle: CSSProperties = { fontSize: 12, color: '#dc2626', marginTop: 4 };

export function border(hasError: boolean): string {
  return hasError ? '#dc2626' : 'var(--border-md)';
}
