/**
 * Guard project route params so sidebar / deep links never treat
 * undefined, null, unknown, or empty strings as real project IDs.
 */

const FORBIDDEN = new Set(['undefined', 'null', 'unknown', 'nan', '']);

export function isValidProjectId(raw: string | undefined | null): boolean {
  if (raw == null) return false;
  const id = String(raw).trim();
  if (!id) return false;
  if (FORBIDDEN.has(id.toLowerCase())) return false;
  // Reject demo catalog leftovers that are not PM-store UUIDs
  if (id.startsWith('prj-')) return false;
  return true;
}

export function projectDetailPath(id: string | undefined | null): string | null {
  if (!isValidProjectId(id)) return null;
  return `/projects/${encodeURIComponent(String(id).trim())}`;
}
