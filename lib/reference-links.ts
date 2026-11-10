// Compare complete origins, never hostname substrings or organization names.
export function isExternalReference(href: string | undefined, origin: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, origin || 'https://local.invalid');
    return ['http:', 'https:'].includes(url.protocol)
      && (origin ? url.origin !== origin : /^(https?:)?\/\//i.test(href));
  } catch {
    return false;
  }
}
