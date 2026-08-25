/**
 * Ask Atlas scope resolution — global portfolio vs explicit client-bound queries.
 * A resolved client reference must never silently widen to portfolio-wide attention.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import { resolveEntitledClientCodeFromQuestion } from './clientOnboardingAutomation.ts';
import {
  ASK_ATLAS_QUESTION,
  isReservedOperatingStateToken,
  type AskAtlasAttentionState,
} from './types.ts';

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').toUpperCase();
}

/** Portfolio-wide attention questions without an explicit "for <client>" suffix. */
function mapsToGlobalAttentionQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  if (normalized === ASK_ATLAS_QUESTION) return true;
  if (normalized === 'WHAT NEEDS MY ATTENTION') return true;
  if (normalized === 'WHAT DO I NEED TO ADDRESS') return true;
  if (normalized === 'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS') return true;
  if (normalized === 'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW') return true;
  if (normalized === 'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW, WHY, AND WHAT IS EACH BASED ON') return true;
  if (/^WHAT (?:IS|ARE) /.test(normalized) && !/\bFOR\s+[A-Z0-9]/i.test(question)) {
    if (
      normalized.includes('OVERDUE') ||
      normalized.includes('WAITING') ||
      normalized.includes('BLOCKED') ||
      normalized.includes('DECISION') ||
      normalized.includes('CAPITAL') ||
      normalized.includes('AT RISK') ||
      normalized.includes('WORK ON NEXT') ||
      normalized.includes('CHANGED')
    ) {
      return true;
    }
  }
  if (/^SUMMARIZE\s+(CAPITAL|OVERDUE|WAITING|BLOCKED|ATTENTION|DECISION)/i.test(normalized)) return true;
  return false;
}

export type ClientScopedAttentionQuery = {
  clientToken: string;
  filterState?: AskAtlasAttentionState;
};

const CLIENT_SCOPED_PATTERNS: Array<{
  re: RegExp;
  filterState?: AskAtlasAttentionState;
}> = [
  { re: /^what needs my attention for\s+(.+)$/i },
  { re: /^what needs attention for\s+(.+)$/i },
  { re: /^what needs approval for\s+(.+)$/i },
  { re: /^what approvals? (?:are )?pending for\s+(.+)$/i },
  { re: /^what are we waiting on for\s+(.+)$/i, filterState: 'Waiting' },
  { re: /^what are we waiting for\s+(.+)$/i, filterState: 'Waiting' },
  { re: /^what(?:'s| is) waiting for\s+(.+)$/i, filterState: 'Waiting' },
  { re: /^what(?:'s| is) overdue for\s+(.+)$/i, filterState: 'Overdue' },
  { re: /^what is blocked for\s+(.+)$/i, filterState: 'Blocked' },
  { re: /^what is at risk for\s+(.+)$/i, filterState: 'At Risk' },
  { re: /^summarize attention for\s+(.+)$/i },
  { re: /^what decisions? (?:do i need to make )?for\s+(.+)$/i, filterState: 'Decision Required' },
  { re: /^what capital (?:matters )?need attention for\s+(.+)$/i, filterState: 'Capital' },
  { re: /^what needs my approval for\s+(.+)$/i },
];

export function extractClientScopedAttentionQuery(question: string): ClientScopedAttentionQuery | null {
  const raw = question.trim().replace(/[?!.]+$/g, '').trim();
  for (const row of CLIENT_SCOPED_PATTERNS) {
    const match = raw.match(row.re);
    const token = match?.[1]?.trim();
    if (token && !isReservedOperatingStateToken(token)) {
      return { clientToken: token, ...(row.filterState ? { filterState: row.filterState } : {}) };
    }
  }
  return null;
}

export function mapsToGetClientScopedAttention(question: string): boolean {
  return extractClientScopedAttentionQuery(question) !== null;
}

export type AskAtlasScopeResolution =
  | { kind: 'global'; filterState?: AskAtlasAttentionState | 'ALL' }
  | { kind: 'client'; clientCode: string; filterState?: AskAtlasAttentionState }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'unresolved'; clientToken: string };

export function resolveAskAtlasScope(
  principal: AtlasPrincipal,
  question: string,
  opts?: { explicitClientCode?: string },
): AskAtlasScopeResolution {
  const entitled = entitledClientCodes(principal);
  const scopedQuery = extractClientScopedAttentionQuery(question);
  const explicit = (opts?.explicitClientCode || '').trim().toUpperCase();

  if (explicit && entitled.includes(explicit)) {
    if (scopedQuery || mapsToGlobalAttentionQuestion(question)) {
      return {
        kind: 'client',
        clientCode: explicit,
        filterState: scopedQuery?.filterState,
      };
    }
  }

  if (scopedQuery) {
    const match = resolveEntitledClientCodeFromQuestion(scopedQuery.clientToken, entitled);
    if (match.kind === 'exact' || match.kind === 'unique_prefix') {
      return {
        kind: 'client',
        clientCode: match.clientCode!,
        filterState: scopedQuery.filterState,
      };
    }
    if (match.kind === 'ambiguous') {
      return { kind: 'ambiguous', candidates: match.candidates };
    }
    return { kind: 'unresolved', clientToken: scopedQuery.clientToken };
  }

  return { kind: 'global' };
}

export function filterAttentionItemsForClient(
  items: Array<{ clientCode?: string; client?: string; state: AskAtlasAttentionState }>,
  clientCode: string,
  clientName?: string,
  filterState?: AskAtlasAttentionState,
): typeof items {
  const code = clientCode.trim().toUpperCase();
  const name = (clientName || '').trim().toLowerCase();
  let filtered = items.filter((item) => {
    if (item.clientCode && item.clientCode.toUpperCase() === code) return true;
    if (name && item.client && item.client.trim().toLowerCase() === name) return true;
    return false;
  });
  if (filterState) {
    filtered = filtered.filter((item) => item.state === filterState);
  }
  return filtered;
}
