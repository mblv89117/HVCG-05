const GUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isGuid(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && GUID_RE.test(raw.trim());
}

/** Graph site id: hostname,site-guid,web-guid */
export function isSharePointSiteId(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const parts = raw.trim().split(',');
  if (parts.length !== 3) return false;
  const host = parts[0].trim();
  if (!host || host.includes('/') || host.includes(' ')) return false;
  return isGuid(parts[1]) && isGuid(parts[2]);
}

/** SharePoint list item IDs are positive integers. */
export function isSharePointItemId(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return /^[1-9][0-9]{0,9}$/.test(raw.trim());
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return v || null;
}
