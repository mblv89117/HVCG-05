/**
 * Hub-only Ask Atlas honesty for historical reconstruction / recovered projects.
 * Surfaces already-known entitled hvsRecoveredProjects / hvsRecoveredDocuments
 * and existing overlay keys. Never invents ClientCodes, project ids, amounts,
 * or milestones. Never uses mailbox search. Client A never receives Client B.
 */

import { hvsRecoveredDocuments } from '../sharepoint/hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from '../sharepoint/hvsRecoveredProjects.ts';
import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import { COMMUNICATIONS_AUTO_RESPOND } from './types.ts';

export const HISTORICAL_RECONSTRUCTION_KIND = 'historical_reconstruction_v1' as const;
export const HISTORICAL_RECONSTRUCTION_MISSION_KEY = 'ATLAS-HISTORICAL-RECONSTRUCTION-HONESTY-001' as const;

export type HistoricalReconstructionProject = {
  client: string;
  clientCode: string;
  title: string;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
  operationalized: false;
  evidence: string;
  nextAction: string;
};

export type HistoricalReconstructionDocument = {
  client: string;
  clientCode: string;
  name: string;
  kind: 'file' | 'folder';
  documentClass: string;
  provenance: 'CONFIRMED';
  amountsExtracted: false;
  binariesInAtlas: false;
};

export type HistoricalReconstructionOverlayKey = {
  clientCode?: string;
  projectId?: string;
  projectName?: string;
};

export type QuotedMailboxHit = {
  clientCode?: string;
  subject?: string;
  preview?: string;
};

export type HistoricalReconstructionHonesty = {
  kind: typeof HISTORICAL_RECONSTRUCTION_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  projects: HistoricalReconstructionProject[];
  documents: HistoricalReconstructionDocument[];
  overlayKeys: HistoricalReconstructionOverlayKey[];
  projectCount: number;
  documentCount: number;
  mailboxSearchUsed: false;
  mailboxLeakRejected: boolean;
  honestyNotes: string[];
  items: string[];
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  nextOwnerAction: string;
  send: false;
  outbound: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  invented: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'STALE_OR_UNCERTAIN';
};

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;

function rosterEntitled(entitledCodes: readonly string[]): string[] {
  return entitledCodes.filter((code) =>
    (ENTITLED_CANONICAL_CLIENT_CODES as readonly string[]).includes(code),
  );
}

function entitledCodeOf(code: string | undefined, entitled: readonly string[]): string | undefined {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return undefined;
  return entitled.includes(normalized) ? normalized : undefined;
}

function blobOf(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toUpperCase();
}

function foreignCodesIn(blob: string, scoped?: string): string[] {
  const found = new Set<string>();
  FOREIGN_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FOREIGN_CODE.exec(blob))) {
    const code = match[1];
    if (code && code !== scoped) found.add(code);
  }
  if (scoped === 'LIEN01' && ACCG_TOKEN.test(blob) && !found.has('ACCG01')) {
    found.add('ACCG01');
  }
  return [...found];
}

export function mapsToHistoricalReconstructionHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('historical reconstruction') || q.includes('historical-reconstruction')) return true;
  if (q.includes('recovered project')) return true;
  if (/\bwhat did we reconstruct\b/.test(q)) return true;
  if (/\bwhat (was|were) reconstructed\b/.test(q)) return true;
  if (/\breconstructed projects?\b/.test(q)) return true;
  return false;
}

export function composeHistoricalReconstructionHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  recoveredProjects?: Array<{
    client: string;
    clientCode?: string;
    title: string;
    provenance?: string;
    operationalized?: boolean;
    evidence?: string;
    nextAction?: string;
  }>;
  recoveredDocuments?: Array<{
    client: string;
    clientCode?: string;
    name: string;
    kind?: 'file' | 'folder';
    documentClass?: string;
    provenance?: string;
    amountsExtracted?: boolean;
    binariesInAtlas?: boolean;
  }>;
  overlayKeys?: HistoricalReconstructionOverlayKey[];
  mailboxHits?: QuotedMailboxHit[];
}): HistoricalReconstructionHonesty {
  const entitled = rosterEntitled(opts.entitledCodes ?? ENTITLED_CANONICAL_CLIENT_CODES);
  const match = opts.match
    ?? (opts.question
      ? resolveEntitledClientCodeFromQuestion(opts.question, entitled)
      : { kind: 'none' as const, candidates: [] });
  const scoped = match.kind === 'exact' || match.kind === 'unique_prefix' ? match.clientCode : undefined;
  const knownProjects = opts.recoveredProjects ?? hvsRecoveredProjects();
  const knownDocuments = opts.recoveredDocuments ?? hvsRecoveredDocuments();

  let mailboxLeakRejected = false;
  for (const hit of opts.mailboxHits ?? []) {
    const leak = foreignCodesIn(blobOf([hit.clientCode, hit.subject, hit.preview]), scoped);
    if (leak.length || (scoped && hit.clientCode && hit.clientCode !== scoped)) {
      mailboxLeakRejected = true;
    }
  }

  const projects: HistoricalReconstructionProject[] = [];
  for (const row of knownProjects) {
    const code = entitledCodeOf(row.clientCode, entitled);
    if (!code) continue;
    if (scoped && code !== scoped) continue;
    if (foreignCodesIn(blobOf([row.client, row.clientCode, row.title, row.evidence]), scoped).length) {
      mailboxLeakRejected = true;
      continue;
    }
    const provenance =
      row.provenance === 'CONFIRMED' || row.provenance === 'LIKELY' || row.provenance === 'PROPOSED'
        || row.provenance === 'STALE_OR_UNCERTAIN'
        ? row.provenance
        : 'STALE_OR_UNCERTAIN';
    projects.push({
      client: row.client,
      clientCode: code,
      title: row.title,
      provenance,
      operationalized: false,
      evidence: row.evidence || 'Already-known recovered filename evidence. Amounts are not extracted.',
      nextAction: row.nextAction || 'Review recovered filenames. Do not invent completion, amounts, or milestones.',
    });
  }

  const documents: HistoricalReconstructionDocument[] = [];
  for (const row of knownDocuments) {
    const code = entitledCodeOf(row.clientCode, entitled);
    if (!code) continue;
    if (scoped && code !== scoped) continue;
    if (foreignCodesIn(blobOf([row.client, row.clientCode, row.name]), scoped).length) {
      mailboxLeakRejected = true;
      continue;
    }
    documents.push({
      client: row.client,
      clientCode: code,
      name: row.name,
      kind: row.kind === 'folder' ? 'folder' : 'file',
      documentClass: row.documentClass || 'unclassified',
      provenance: 'CONFIRMED',
      amountsExtracted: false,
      binariesInAtlas: false,
    });
  }

  const overlayKeys: HistoricalReconstructionOverlayKey[] = [];
  for (const key of opts.overlayKeys ?? []) {
    const code = entitledCodeOf(key.clientCode, entitled);
    if (!code) continue;
    if (scoped && code !== scoped) continue;
    overlayKeys.push({
      clientCode: code,
      ...(key.projectId ? { projectId: key.projectId } : {}),
      ...(key.projectName ? { projectName: key.projectName } : {}),
    });
  }

  const honestyNotes = [
    'already-known recovered filenames only',
    'amounts not extracted',
    'historical HVS stay read-only',
    'mailbox search not used',
  ];
  if (mailboxLeakRejected) honestyNotes.push('quoted mailbox leak rejected');

  const items: string[] = [];
  if (match.kind === 'ambiguous') {
    items.push(`Multiple entitled ClientCodes match (${match.candidates.join(', ')}). Atlas does not guess.`);
  }
  if (match.kind === 'none' && opts.question && /lien|accg|pdg|ccb|hfd|client/i.test(opts.question)
    && !scoped) {
    const askedOutside = /\b(CPL01|SYN01|NORTH01)\b/i.test(opts.question);
    if (askedOutside) items.push('Asked ClientCode is outside the entitled roster. Atlas does not invent a sixth client.');
  }
  if (!projects.length && !documents.length) {
    items.push(scoped
      ? `No entitled recovered project/document rows are visible for ${scoped}`
      : 'No entitled recovered project/document rows are visible');
  }
  if (mailboxLeakRejected) {
    items.push('Quoted mailbox search that returned a foreign ClientCode subject was rejected');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : mailboxLeakRejected
        ? 'Do not treat quoted mailbox subjects as reconstruction evidence'
        : scoped
          ? `Review already-known recovered filenames for ${scoped}. Do not invent ClientCodes, amounts, or milestones.`
          : 'Review already-known entitled recovered filenames. Do not invent ClientCodes, amounts, or milestones.';

  const flags = {
    kind: HISTORICAL_RECONSTRUCTION_KIND,
    entitledCodes: entitled,
    projects,
    documents,
    overlayKeys,
    projectCount: projects.length,
    documentCount: documents.length,
    mailboxSearchUsed: false as const,
    mailboxLeakRejected,
    honestyNotes,
    items,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    nextOwnerAction,
    send: false as const,
    outbound: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    invented: false as const,
  };

  if (match.kind === 'ambiguous') {
    return {
      status: 'NOT_READY',
      ready: false,
      ...flags,
      provenance: 'STALE_OR_UNCERTAIN',
    };
  }

  const status = mailboxLeakRejected || items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    ...(scoped ? { clientCode: scoped } : {}),
    ...flags,
    provenance: mailboxLeakRejected ? 'STALE_OR_UNCERTAIN' : 'CONFIRMED',
  };
}

export function formatHistoricalReconstructionHonesty(
  pack: HistoricalReconstructionHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Historical reconstruction for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.projects.length
      ? `Recovered projects (already-known filenames): ${pack.projects.map((row) => `${row.title} (${row.provenance})`).join('; ')}`
      : 'No entitled recovered projects are visible.',
    pack.documents.length
      ? `Recovered documents (already-known filenames): ${pack.documents.map((row) => row.name).join('; ')}`
      : 'No entitled recovered documents are visible.',
    pack.overlayKeys.length
      ? `Existing overlay keys: ${pack.overlayKeys.map((key) => [key.clientCode, key.projectName, key.projectId].filter(Boolean).join('/')).join('; ')}`
      : '',
    'Amounts extracted: false',
    'Mailbox search: not used',
    pack.mailboxLeakRejected ? 'Quoted mailbox leak: rejected' : '',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open reconstruction items.',
    `Communication policy: ${pack.communicationPolicy}`,
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent ClientCodes, project ids, amounts, or milestones.',
    'Atlas did not send mail, launch GTM, or submit capital.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerHistoricalReconstructionHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    recoveredProjects?: HistoricalReconstructionHonesty['projects'];
    recoveredDocuments?: HistoricalReconstructionHonesty['documents'];
    overlayKeys?: HistoricalReconstructionOverlayKey[];
    mailboxHits?: QuotedMailboxHit[];
  },
): string {
  const pack = composeHistoricalReconstructionHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    recoveredProjects: extras?.recoveredProjects,
    recoveredDocuments: extras?.recoveredDocuments,
    overlayKeys: extras?.overlayKeys,
    mailboxHits: extras?.mailboxHits,
  });
  return formatHistoricalReconstructionHonesty(pack, pack.clientCode ?? 'Hub');
}
