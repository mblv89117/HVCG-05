/**
 * W2C Ask Atlas — client-scoped operating-brief honesty.
 * Does not implement full W2D concierge. Does not invent finance/growth/contacts.
 * Client-bound questions never fall back to portfolio.
 */

import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
} from './clientOnboardingAutomation.ts';
import {
  CLIENT_TRUTH_MISSION_KEY,
  composeClientTruth,
  type ClientTruthModel,
  type WorkspaceTruthSnapshot,
} from '../commercialContext/clientTruth.ts';
import type { OperatorCommercialContext } from '../commercialContext/types.ts';
import type { OperatorOperatingPicture } from './types.ts';
import { isReservedOperatingStateToken } from './types.ts';

export const CLIENT_OPERATING_BRIEF_MISSION_KEY = CLIENT_TRUTH_MISSION_KEY;
export const CLIENT_OPERATING_BRIEF_KIND = 'client_operating_brief_honesty_v1' as const;

export type ClientOperatingBriefTopic =
  | 'operating_brief'
  | 'working_on'
  | 'changed'
  | 'waiting'
  | 'missing_documents'
  | 'capital'
  | 'owner_decisions'
  | 'financials_known'
  | 'financials_unknown'
  | 'growth'
  | 'blocked'
  | 'provenance';

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|KAVA01|CPL01|LIEN01)(?:[^A-Z0-9]|$)/g;

function normalize(question: string): string {
  return question.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '');
}

function detectTopic(question: string): ClientOperatingBriefTopic | null {
  const q = normalize(question).toLowerCase();
  if (!q) return null;
  if (/provenance|where did atlas get|based on what|show the (source|evidence)/.test(q)) {
    return 'provenance';
  }
  if (/does atlas not know|what does atlas not know|absent|unverified/.test(q) && /financial/.test(q)) {
    return 'financials_unknown';
  }
  if (/financial|gcc|atlas finance/.test(q)) return 'financials_known';
  if (/growth context|atlas growth|360/.test(q) && !/financial/.test(q)) return 'growth';
  if (/missing document|documents? (are )?missing|what documents are missing/.test(q)) {
    return 'missing_documents';
  }
  if (/capital/.test(q)) return 'capital';
  if (/manny|owner approval|decisions? (does|do) (manny|i|owner)/.test(q) || /what decisions/.test(q)) {
    return 'owner_decisions';
  }
  if (/blocked/.test(q)) return 'blocked';
  if (/waiting|owe us|owed/.test(q)) return 'waiting';
  if (/changed/.test(q)) return 'changed';
  if (/working on|actively working/.test(q)) return 'working_on';
  if (/operating brief/.test(q) || /current (?:\w+ )?brief/.test(q)) return 'operating_brief';
  return null;
}

export function mapsToClientOperatingBriefIntent(
  question: string,
  explicitClientCode?: string,
): boolean {
  const topic = detectTopic(question);
  if (!topic) return false;
  const entitled = [...ENTITLED_CANONICAL_CLIENT_CODES];
  const match = resolveEntitledClientCodeFromQuestion(question, entitled);
  const hasClient =
    Boolean((explicitClientCode || '').trim()) || match.kind === 'exact' || match.kind === 'unique_prefix';
  // Unscoped "current operating brief" fail-closes later. Other unscoped
  // questions must not steal pre-existing portfolio/global Ask Atlas intents.
  if (topic === 'operating_brief') return true;
  return hasClient;
}

function rosterEntitled(entitledCodes: readonly string[]): string[] {
  return entitledCodes.filter((code) =>
    (ENTITLED_CANONICAL_CLIENT_CODES as readonly string[]).includes(code),
  );
}

function resolveScope(opts: {
  question: string;
  entitledCodes: readonly string[];
  explicitClientCode?: string;
}): { kind: 'client'; clientCode: string } | { kind: 'unresolved' } | { kind: 'ambiguous'; candidates: string[] } {
  const entitled = rosterEntitled(opts.entitledCodes);
  const explicit = (opts.explicitClientCode || '').trim().toUpperCase();
  if (explicit) {
    if (!entitled.includes(explicit)) return { kind: 'unresolved' };
    return { kind: 'client', clientCode: explicit };
  }
  const match = resolveEntitledClientCodeFromQuestion(opts.question, entitled);
  if (match.kind === 'exact' || match.kind === 'unique_prefix') {
    return { kind: 'client', clientCode: match.clientCode! };
  }
  if (match.kind === 'ambiguous') return { kind: 'ambiguous', candidates: match.candidates };
  const token = opts.question.trim().match(/\bfor\s+(.+?)$/i)?.[1]?.trim();
  if (token && isReservedOperatingStateToken(token)) return { kind: 'unresolved' };
  return { kind: 'unresolved' };
}

function foreignCodesIn(blob: string, scoped: string): string[] {
  const found = new Set<string>();
  FOREIGN_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FOREIGN_CODE.exec(blob))) {
    const code = match[1];
    if (code && code !== scoped) found.add(code);
  }
  return [...found];
}

function renderBrief(truth: ClientTruthModel): string {
  return [
    `Client ${truth.displayName} (${truth.clientCode}) · posture ${truth.operatingPosture} · writePolicy ${truth.writePolicy}.`,
    `WHAT IS HAPPENING: ${truth.answers.workingOn.text}`,
    `WHY IT MATTERS: ${truth.identity.summary}`,
    `WHAT CHANGED: ${truth.answers.changed.text}`,
    `WHAT ATLAS KNOWS: identity=${truth.identity.completeness}; documents=${truth.documents.completeness}; communications=${truth.communications.completeness}; projects=${truth.projects.completeness}; capital=${truth.capitalContext.completeness}.`,
    `WHAT ATLAS DOES NOT KNOW: financialContext=${truth.financialContext.completeness}; growthContext=${truth.growthContext.completeness}; contacts=${truth.contacts.completeness}.`,
    `WHAT SHOULD HAPPEN NEXT: ${truth.answers.hvcgNext.text}`,
    `PROVENANCE: ${truth.answers.provenance.text}`,
    `APPROVAL REQUIRED: ${truth.answers.ownerApproval.text}`,
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=${truth.capitalSubmit}; canExecute=${truth.canExecute}.`,
  ].join('\n');
}

function renderTopic(truth: ClientTruthModel, topic: ClientOperatingBriefTopic): string {
  switch (topic) {
    case 'operating_brief':
      return renderBrief(truth);
    case 'working_on':
      return truth.answers.workingOn.text;
    case 'changed':
      return truth.answers.changed.text;
    case 'waiting':
      return `${truth.answers.waiting.text} Client-owed: ${truth.answers.clientNext.text}`;
    case 'missing_documents':
      return truth.answers.documentsMissing.text;
    case 'capital':
      return `${truth.clientCode}: ${truth.answers.capital.text} Outstanding requests: ${truth.answers.outstandingRequests.text}`;
    case 'owner_decisions':
      return truth.answers.ownerApproval.text;
    case 'financials_known':
      return truth.answers.financialKnown.text;
    case 'financials_unknown':
      return truth.answers.financialUnknown.text;
    case 'growth':
      return `${truth.answers.growthKnown.text} ${truth.answers.growthUnknown.text}`;
    case 'blocked':
      return truth.answers.blocked.text;
    case 'provenance':
      return [
        truth.answers.provenance.text,
        ...Object.values(truth.answers)
          .slice(0, 8)
          .map((a) => `${a.question} → ${a.classification} (${a.provenance[0]?.source || 'n/a'})`),
      ].join('\n');
    default:
      return renderBrief(truth);
  }
}

export function answerClientOperatingBrief(
  question: string,
  opts: {
    entitledCodes: readonly string[];
    explicitClientCode?: string;
    commercial?: OperatorCommercialContext;
    picture?: OperatorOperatingPicture;
    workspace?: WorkspaceTruthSnapshot;
  },
): string {
  const topic = detectTopic(question);
  if (!topic) {
    return 'Atlas does not invent an operating brief for an unmatched question.';
  }
  const scope = resolveScope({
    question,
    entitledCodes: opts.entitledCodes,
    explicitClientCode: opts.explicitClientCode,
  });
  if (scope.kind === 'ambiguous') {
    return `Client scope is ambiguous (${scope.candidates.join(', ')}). Atlas will not fall back to portfolio.`;
  }
  if (scope.kind === 'unresolved') {
    return 'Client scope is required for this operating question. Atlas will not fall back to portfolio-wide data.';
  }
  if (opts.commercial?.clientCode && opts.commercial.clientCode !== scope.clientCode) {
    return 'Commercial context ClientCode does not match the asked client. Fail closed.';
  }
  if (opts.workspace?.clientCode && opts.workspace.clientCode !== scope.clientCode) {
    return 'Workspace snapshot ClientCode does not match the asked client. Fail closed.';
  }

  const composed = composeClientTruth({
    clientCode: scope.clientCode,
    commercial: opts.commercial,
    picture: opts.picture,
    workspace: opts.workspace,
  });
  if ('failClosed' in composed) {
    return 'Unknown or unentitled ClientCode. Fail closed.';
  }
  if (composed.clientCode !== scope.clientCode) {
    return 'Client truth composition did not stay on the asked ClientCode. Fail closed.';
  }

  const text = renderTopic(composed, topic);
  const leaked = foreignCodesIn(text, scope.clientCode);
  if (leaked.length) {
    return `Ask Atlas refused to emit a cross-client operating answer (foreign=${leaked.join(',')}).`;
  }
  if (/\$[\d,]{4,}|targetamount|funding commitment|committed funded/i.test(text)) {
    return 'Ask Atlas refused a fabricated capital/financial claim. financialContext remains NOT_CERTIFIED unless sourced.';
  }
  return text;
}

export function clientOperatingBriefClientCode(
  question: string,
  opts: { entitledCodes: readonly string[]; explicitClientCode?: string },
): string | undefined {
  const scope = resolveScope({
    question,
    entitledCodes: opts.entitledCodes,
    explicitClientCode: opts.explicitClientCode,
  });
  return scope.kind === 'client' ? scope.clientCode : undefined;
}
