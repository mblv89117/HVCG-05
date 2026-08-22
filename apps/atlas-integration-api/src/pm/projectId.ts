/**
 * Shared project-id validation for PM HTTP routes.
 */

const FORBIDDEN = new Set(['undefined', 'null', 'unknown', 'nan', '']);

export function isValidProjectId(raw: string | undefined | null): boolean {
  if (raw == null) return false;
  const id = String(raw).trim();
  if (!id) return false;
  if (FORBIDDEN.has(id.toLowerCase())) return false;
  if (id.startsWith('prj-')) return false;
  return true;
}
