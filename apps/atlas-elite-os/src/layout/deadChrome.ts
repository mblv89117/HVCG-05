/**
 * D12 — dead-chrome paths stay routable as honest deferred pages but must not
 * appear in the default primary nav, Command-K catalog, or shortcut chrome.
 */

export const DEAD_CHROME_PATHS = [
  '/inbox',
  '/team',
  '/executive',
  '/revenue',
  '/financials',
  '/procurement',
  '/risk',
  '/growth',
  '/automations',
  '/ai',
  '/reports',
  '/banking',
  '/accounting',
  '/clients/intake',
] as const;

/** Daily desk + role-gated ops — only these belong in DEFAULT primary nav. */
export const PRIMARY_NAV_ALLOWED_PATHS = [
  '/',
  '/my-work',
  '/tasks',
  '/projects',
  '/leads',
  '/opportunities',
  '/clients',
  '/capital',
  '/knowledge',
  '/documents/operating',
  '/connections',
  '/settings',
  '/admin',
] as const;

export function pathOnly(to: string | undefined | null): string {
  return String(to || '')
    .split(/[?#]/)[0]
    .replace(/\/+$/, '') || '/';
}

export function isDeadChromePath(to: string | undefined | null): boolean {
  const path = pathOnly(to);
  if ((DEAD_CHROME_PATHS as readonly string[]).includes(path)) return true;
  // Exact intake only; /clients and /clients/:code stay live.
  if (path === '/clients/intake') return true;
  return false;
}

export function isPrimaryNavAllowedPath(to: string | undefined | null): boolean {
  const path = pathOnly(to);
  return (PRIMARY_NAV_ALLOWED_PATHS as readonly string[]).includes(path);
}
