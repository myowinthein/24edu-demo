'use client';
import { useState } from 'react';
import { validate, type FormFields, type FieldKey, type FormErrors } from './lead-form-data';

const EMPTY_FIELDS: FormFields = {
  name: '', email: '', phoneCountry: '+60', phoneNumber: '',
  country: '', educationLevel: '', programOfInterest: '',
  intakeMonth: '', intakeYear: '',
};

export function useLeadForm(guestId: string | null, onSuccess: () => void) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (key: FieldKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };

  const setPhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '') }));
    if (errors.phoneNumber) setErrors((er) => ({ ...er, phoneNumber: undefined }));
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
      onSuccess();
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return { fields, setFields, errors, submitting, serverError, set, setPhoneNumber, handleSubmit };
}
