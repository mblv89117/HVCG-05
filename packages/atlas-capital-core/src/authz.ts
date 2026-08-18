/**
 * Client isolation for Capital Operations.
 * Matches Hub PM: canonical ClientCode only. No role-based wildcard.
 * Administrator and HVCG Owner do not bypass client scope.
 * '*' is never a production entitlement.
 */

const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

export function isCapitalClientCode(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && CLIENT_CODE_RE.test(raw);
}

/** SYN* ClientCodes are labeled QA/demo — never treat as live HVCG clients. */
export function isSyntheticClientCode(raw: string | null | undefined): boolean {
  return isCapitalClientCode(raw) && raw!.startsWith('SYN');
}

export function isSyntheticCapitalRecord(input: { clientCode?: string; title?: string }): boolean {
  if (isSyntheticClientCode(input.clientCode)) return true;
  return typeof input.title === 'string' && /\bSYNTHETIC\b/i.test(input.title);
}

export function entitledCapitalClientCodes(allowedClientIds: readonly string[]): string[] {
  const out: string[] = [];
  for (const code of allowedClientIds) {
    if (code === '*') continue;
    if (isCapitalClientCode(code)) out.push(code);
  }
  return out;
}

export function canAccessCapitalClient(allowedClientIds: readonly string[], clientCode: string): boolean {
  if (!isCapitalClientCode(clientCode) || clientCode === '*') return false;
  return entitledCapitalClientCodes(allowedClientIds).includes(clientCode);
}

/** Strategy / shortlist approval is an HVCG Owner decision — not a data-scope bypass. */
export function isMannyApprover(roles: readonly string[]): boolean {
  return roles.includes('HVCG Owner');
}
