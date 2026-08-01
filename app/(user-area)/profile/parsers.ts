export function parsePhone(phone: string): { phoneCountry: string; phoneNumber: string } {
  const spaceIdx = phone.indexOf(' ');
  if (spaceIdx === -1) return { phoneCountry: '+60', phoneNumber: phone };
  return { phoneCountry: phone.slice(0, spaceIdx), phoneNumber: phone.slice(spaceIdx + 1) };
}

export function parseIntake(intake: string): { intakeMonth: string; intakeYear: string } {
  const parts = intake.split(' ');
  if (parts.length < 2) return { intakeMonth: '', intakeYear: intake };
  return { intakeMonth: parts[0], intakeYear: parts[parts.length - 1] };
}
