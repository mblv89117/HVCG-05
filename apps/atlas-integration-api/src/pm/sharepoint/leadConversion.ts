/**
 * Atlas Lead → Opportunity conversion helpers.
 *
 * Existing contracts (do not invent a second CRM):
 * - Company = HVCG_Clients (there is no HVCG_Companies list)
 * - Contact = HVCG_Contacts (requires ClientId)
 * - Opportunity = HVCG_Opportunities Stage=Discovery (Power Automate field map)
 * - Idempotency = HVCG_Opportunities.HVCG_IdempotencyKey `opp-from-lead|{LeadId}`
 * - LeadStatus Converted is not a PATCH; it is this workflow
 *
 * Owner decision (implemented pending owner confirm):
 * Convert is allowed from New, Contacted, or Qualified. Inbound website leads
 * start as New; requiring Qualified first would block Manny's Convert action.
 * Qualified PATCH still does not silently create an Opportunity.
 */

import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';

export const CONVERTIBLE_LEAD_STATUSES = new Set(['New', 'Contacted', 'Qualified']);

export const SERVICE_INTEREST_TO_OPPORTUNITY_TYPE: Record<string, string> = {
  Assessment: 'Assessment',
  'Capital Advisory': 'Capital Raise',
  'Fractional CFO': 'Advisory Engagement',
  'Operational Consulting': 'Advisory Engagement',
  Growth: 'Advisory Engagement',
  Retainer: 'Retainer',
  'Success Fee': 'Success Fee',
  Hybrid: 'Hybrid',
  Other: 'Other',
};

export function opportunityTypeFromServiceInterest(interest?: string): string {
  if (!interest) return 'Other';
  return SERVICE_INTEREST_TO_OPPORTUNITY_TYPE[interest] || 'Other';
}

export function opportunityIdempotencyKey(leadId: string): string {
  return `opp-from-lead|${leadId}`;
}

export function clientFromLeadIdempotencyKey(leadId: string): string {
  return `client-from-lead|${leadId}`;
}

export function opportunityHref(opportunityId: string): string {
  return `/opportunities/${encodeURIComponent(opportunityId)}`;
}

export function normalizeCompanyTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Canonical ClientCode from a company title; never returns '*'. */
export function proposeClientCode(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const letters = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let base = letters.replace(/^[^A-Z]+/, '') || 'LEAD';
  if (base.length < 3) base = `${base}XXX`.slice(0, 3);
  base = base.slice(0, 5);
  for (let n = 1; n <= 99; n += 1) {
    const code = `${base}${String(n).padStart(2, '0')}`;
    if (code.length > 16 || used.has(code) || !isCanonicalClientCode(code) || code === '*') continue;
    return code;
  }
  throw new Error('Unable to allocate a canonical ClientCode.');
}
