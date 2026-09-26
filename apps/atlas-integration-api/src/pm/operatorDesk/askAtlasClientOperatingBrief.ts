/**
 * W2C/W2D Ask Atlas — client-scoped operating-brief honesty.
 * Closed concierge router over answers composeClientTruth already returns.
 * Does not invent finance/growth/contacts, GCC orgs, or 360 orgs.
 * Does not submit capital, apply approvals, or raise authority.
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
  deliverablesListAskAtlasSentence,
  engagementsListAskAtlasSentence,
  type ClientTruthModel,
  type WorkspaceTruthSnapshot,
} from '../commercialContext/clientTruth.ts';
import type { OperatorCommercialContext } from '../commercialContext/types.ts';
import { gccObservationHonestyLine } from '../../modules/ingest/gccValueSignal.ts';
import type { OperatorOperatingPicture } from './types.ts';
import { isReservedOperatingStateToken } from './types.ts';

export const CLIENT_OPERATING_BRIEF_MISSION_KEY = CLIENT_TRUTH_MISSION_KEY;
export const CLIENT_OPERATING_BRIEF_KIND = 'client_operating_brief_honesty_v1' as const;
export const WORKSPACE_TRUTH_SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE' as const;

/**
 * Finished document answer when the file-index read 403s, times out, or never returns.
 * Does not invent filenames.
 */
/**
 * Finished meetings answer when the entitled workspace cannot be loaded.
 * Does not invent a page_cap measurement or a meeting list.
 */
/**
 * Finished contacts answer when the entitled workspace cannot be loaded.
 * Does not invent a page_cap measurement or a contact list.
 */
/**
 * Finished tasks answer when the entitled workspace cannot be loaded.
 * Does not invent a page_cap measurement or a task list.
 */
export function tasksIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} task list (HVCG_Tasks).`,
    'tasks=SOURCE_UNAVAILABLE.',
    'Atlas will not invent tasks, assignees, due dates, notes, or next actions.',
    'Partial rows are not the task list.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

/**
 * Finished engagements answer when the entitled workspace cannot be loaded.
 * Does not invent a page_cap measurement, an OWNER_DECISION_REQUIRED clause, or an engagement list.
 */
export function engagementsIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} engagement list (HVCG_Engagements).`,
    'engagements=SOURCE_UNAVAILABLE.',
    'Atlas will not invent engagements, scopes, fees, dates, or obligations.',
    'Partial rows are not the engagement list.',
    'EngagementTypePrimary is not this list.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

/**
 * Finished deliverables answer when the entitled workspace cannot be loaded.
 * Does not invent a page_cap measurement, an OWNER_DECISION_REQUIRED clause, or a deliverable list.
 */
export function deliverablesIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} deliverable list (HVCG_Deliverables).`,
    'deliverables=SOURCE_UNAVAILABLE.',
    'Atlas will not invent deliverables, due dates, statuses, or acceptance.',
    'Partial rows are not the deliverable list.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export function contactsIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} contact list (HVCG_Contacts).`,
    'contacts=SOURCE_UNAVAILABLE.',
    'Atlas will not invent contacts, emails, phones, roles, or meeting attendees.',
    'Partial rows are not the contact list.',
    'Proposed contactCandidates are not the contact list.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export function meetingsIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} meeting list (HVCG_Meetings).`,
    'meetings=SOURCE_UNAVAILABLE.',
    'Atlas will not invent meetings, attendees, notes, decisions, or next actions.',
    'Partial rows are not the meeting list.',
    'The workspace timeline is not the meeting inventory.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export function documentIndexUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot read the current ${code} document index (HVCG_Communications/file-index).`,
    `Document availability is ${WORKSPACE_TRUTH_SOURCE_UNAVAILABLE}.`,
    'Atlas will not invent files, filenames, or a closing checklist.',
    'documents=SOURCE_UNAVAILABLE.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

/**
 * Finished approvals answer when the workspace/file-index read does not complete.
 * Surfaces only lines already taken from approval/decision records. Does not apply an action.
 */
export function approvalsFinishedWithoutWorkspace(clientCode: string, pending: readonly string[]): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  const lines = pending.map((line) => line.trim()).filter(Boolean).slice(0, 8);
  return [
    `Approval snapshot for ${code} did not load a current workspace.`,
    lines.length
      ? `Pending decisions from existing approval surfaces: ${lines.join('; ')}.`
      : 'No entitled pending approval items were visible on Approval Center.',
    'Ask Atlas did not apply an approval action.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

/** Current-operating-truth answer when the entitled live workspace cannot be loaded. */
export function currentWorkspaceUnavailableAnswer(clientCode: string): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  return [
    `Atlas cannot load the current ${code} workspace right now.`,
    `Current workspace truth is ${WORKSPACE_TRUTH_SOURCE_UNAVAILABLE}.`,
    'Atlas will not substitute recovered or portfolio data for a current operating answer.',
    'financialContext remains NOT_CERTIFIED; growthContext remains NOT_CERTIFIED.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export type ClientOperatingBriefTopic =
  | 'operating_brief'
  | 'my_business'
  | 'working_on'
  | 'projects'
  | 'changed'
  | 'waiting'
  | 'missing_documents'
  | 'documents'
  | 'meetings'
  | 'contacts'
  | 'tasks'
  | 'engagements'
  | 'deliverables'
  | 'capital'
  | 'owner_decisions'
  | 'approvals'
  | 'financials_known'
  | 'financials_unknown'
  | 'finance'
  | 'growth'
  | 'blocked'
  | 'provenance';

const FINANCE_SCOPED_TOPICS = new Set<ClientOperatingBriefTopic>([
  'finance',
  'financials_known',
  'financials_unknown',
]);

/** Finance picture / known / unknown. Capital submit stays on its own honesty path. */
export function isFinanceScopedOperatingTopic(topic: ClientOperatingBriefTopic | null): boolean {
  return topic !== null && FINANCE_SCOPED_TOPICS.has(topic);
}

/**
 * Finance answer when the entitled workspace cannot be loaded.
 * A hydrated GCC value-signal is quoted as observation-only text.
 * Workspace and document truth stay SOURCE_UNAVAILABLE.
 * No recovered, portfolio, or workspace substitute is invented.
 * No signal: today's NOT_CERTIFIED / SOURCE_UNAVAILABLE honesty.
 */
export function financeAnswerWhenWorkspaceUnavailable(
  clientCode: string,
  commercial?: OperatorCommercialContext,
): string {
  const code = (clientCode || '').trim().toUpperCase() || 'UNKNOWN';
  const scopedCommercial =
    commercial?.clientCode && commercial.clientCode.trim().toUpperCase() !== code ? undefined : commercial;
  const signals = (scopedCommercial?.gcc.signals || []).filter(
    (signal) => signal.clientCode === code && signal.copiesLedger === false,
  );
  if (!signals.length) return currentWorkspaceUnavailableAnswer(code);

  const text = [
    `Atlas cannot load the current ${code} workspace right now.`,
    `Current workspace truth is ${WORKSPACE_TRUTH_SOURCE_UNAVAILABLE}.`,
    `Document availability is ${WORKSPACE_TRUTH_SOURCE_UNAVAILABLE}.`,
    'Atlas will not substitute recovered or portfolio data for a current operating answer.',
    ...signals.slice(0, 4).map((signal) =>
      gccObservationHonestyLine({ signalType: signal.signalType, summary: signal.summary }),
    ),
    'financialContext=NOT_CERTIFIED.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
  if (foreignCodesIn(text, code).length) return currentWorkspaceUnavailableAnswer(code);
  if (/\$[\d,]{4,}|targetamount|funding commitment|committed funded/i.test(text)) {
    return currentWorkspaceUnavailableAnswer(code);
  }
  return text;
}

/**
 * Closed phrase map. New concierge phrases register in
 * mapsToClientOperatingBriefIntent only when a client is in scope.
 * Capital submit/prepare stays on capitalSubmissionHonesty.
 * Generic approval-center phrases stay on approval honesty.
 */
const CONCIERGE_PHRASE_MAP: Array<{ topic: ClientOperatingBriefTopic; pattern: RegExp }> = [
  { topic: 'my_business', pattern: /\bmy business\b|\bbusiness picture\b|\bbusiness brief\b/ },
  { topic: 'finance', pattern: /\bfinance picture\b|\bfinance brief\b/ },
  { topic: 'growth', pattern: /\bgrowth picture\b|\bgrowth brief\b/ },
  { topic: 'capital', pattern: /\bcapital context\b|\bcapital brief\b/ },
  {
    topic: 'projects',
    pattern:
      /\bwhat projects\b|\bprojects are active\b|\bprojects brief\b|\bprojects domain\b|\bactive projects\b|\bwhat are the (?:active )?projects\b|^projects$/,
  },
  {
    topic: 'documents',
    pattern:
      /\bwhat documents exist\b|\bdocuments exist\b|\bdocument inventory\b|\bdocuments on the operating brief\b|\bwhat documents do we have\b|\bwhat documents (?:does|do)\b|\bwhat documents\b.+\bhave\b|\bdocuments domain\b|\bdocument picture\b|\bdocument index\b|\blist (?:the )?documents\b|\blist\b.+\bdocuments\b|^documents$/,
  },
  {
    topic: 'meetings',
    // Closed list — include live W2K-R1 phrasings ("What meetings does ACCG01 have?",
    // "List ACCG01 meetings") so attention-items empty cannot win when a meetings domain exists.
    pattern:
      /\bwhat meetings exist\b|\bmeetings exist\b|\bmeeting inventory\b|\bmeetings on the operating brief\b|\bwhat meetings do we have\b|\bwhat meetings (?:does|do)\b|\bwhat meetings\b.+\bhave\b|\bmeetings domain\b|\bmeeting picture\b|\bmeetings list\b|\bmeeting list\b|\blist (?:the )?meetings\b|\blist\b.+\bmeetings\b|^meetings$/,
  },
  {
    topic: 'contacts',
    // Closed list — include live phrasings ("What contacts exist for ACCG01?",
    // "What contacts exist for client ACCG01?") so attention-items empty cannot win.
    pattern:
      /\bwhat contacts exist\b|\bcontacts exist\b|\bcontact inventory\b|\bcontacts on the operating brief\b|\bwhat contacts do we have\b|\bwhat contacts (?:does|do)\b|\bwhat contacts\b.+\bhave\b|\bcontacts domain\b|\bcontact picture\b|\bcontacts list\b|\bcontact list\b|\blist (?:the )?contacts\b|\blist\b.+\bcontacts\b|^contacts$/,
  },
  {
    topic: 'tasks',
    // Closed list — include live phrasings ("What tasks does ACCG01 have?",
    // "List ACCG01 tasks") so attention-items empty cannot win.
    pattern:
      /\bwhat tasks exist\b|\btasks exist\b|\btask inventory\b|\btasks on the operating brief\b|\bwhat tasks do we have\b|\bwhat tasks (?:does|do)\b|\bwhat tasks\b.+\bhave\b|\btasks domain\b|\btask picture\b|\btasks list\b|\btask list\b|\blist (?:the )?tasks\b|\blist\b.+\btasks\b|^tasks$/,
  },
  {
    topic: 'engagements',
    // Closed plural list only. Singular "engagement" stays off this topic so
    // answers.engagement and the my-business composite remain the prior clause.
    pattern:
      /\bwhat engagements exist\b|\bengagements exist\b|\bengagements inventory\b|\bengagements on the operating brief\b|\bwhat engagements do we have\b|\bwhat engagements (?:does|do)\b|\bwhat engagements\b.+\bhave\b|\bengagements domain\b|\bengagements picture\b|\bengagements list\b|\blist (?:the )?engagements\b|\blist\b.+\bengagements\b|^engagements$/,
  },
  {
    topic: 'deliverables',
    // Closed plural list only. Unscoped "What deliverables exist?" / "List deliverables"
    // stay off the topic (no ClientCode). Document questions stay on documents.
    pattern:
      /\bwhat deliverables exist\b|\bdeliverables exist\b|\bdeliverables inventory\b|\bdeliverables on the operating brief\b|\bwhat deliverables do we have\b|\bwhat deliverables (?:does|do)\b|\bwhat deliverables\b.+\bhave\b|\bdeliverables domain\b|\bdeliverables picture\b|\bdeliverables list\b|\blist (?:the )?deliverables\b|\blist\b.+\bdeliverables\b|^deliverables$/,
  },
  {
    topic: 'approvals',
    pattern: /\bapprovals brief\b|\bapproval brief\b|\bapprovals domain\b|^approvals$|^approval center$/,
  },
];

function isCapitalSubmitOrPrepare(question: string): boolean {
  const q = normalize(question).toLowerCase();
  return /capital submission|submission package|prepare capital|submit to lender|lender package/.test(q);
}

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|KAVA01|CPL01|LIEN01)(?:[^A-Z0-9]|$)/g;

function normalize(question: string): string {
  return question.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '');
}

export function clientOperatingBriefTopic(question: string): ClientOperatingBriefTopic | null {
  return detectTopic(question);
}

function detectTopic(question: string): ClientOperatingBriefTopic | null {
  const q = normalize(question).toLowerCase();
  if (!q) return null;
  // Submit/prepare stays on capitalSubmissionHonesty. Never answer it here.
  if (isCapitalSubmitOrPrepare(q)) return null;
  if (/provenance|where did atlas get|based on what|show the (source|evidence)/.test(q)) {
    return 'provenance';
  }
  for (const row of CONCIERGE_PHRASE_MAP) {
    if (row.pattern.test(q)) return row.topic;
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
  if (isCapitalSubmitOrPrepare(question)) return false;
  const topic = detectTopic(question);
  if (!topic) return false;
  const entitled = [...ENTITLED_CANONICAL_CLIENT_CODES];
  const match = resolveEntitledClientCodeFromQuestion(question, entitled);
  const hasClient =
    Boolean((explicitClientCode || '').trim()) ||
    match.kind === 'exact' ||
    match.kind === 'unique_prefix' ||
    match.kind === 'ambiguous';
  // Unscoped "current operating brief" fail-closes later. Other unscoped
  // questions must not steal pre-existing portfolio/global Ask Atlas intents.
  // An ambiguous ClientCode match is in scope only so the answer can fail closed.
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

function exactClientCode(value: string | undefined, scoped: string): boolean {
  const code = (value || '').trim().toUpperCase();
  return code.length > 0 && code === scoped;
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
  const knowsBase = `WHAT ATLAS KNOWS: identity=${truth.identity.completeness}; documents=${truth.documents.completeness}; communications=${truth.communications.completeness}; projects=${truth.projects.completeness}; capital=${truth.capitalContext.completeness}`;
  const knowsIndexed = [
    ...(truth.contacts.completeness === 'INDEXED' ? [truth.contacts.summary] : []),
    ...(truth.tasks.completeness === 'INDEXED' ? [truth.tasks.summary] : []),
  ];
  const knows = knowsIndexed.length ? `${knowsBase}; ${knowsIndexed.join('; ')}` : `${knowsBase}.`;
  const unknownBase = `WHAT ATLAS DOES NOT KNOW: financialContext=${truth.financialContext.completeness}; growthContext=${truth.growthContext.completeness}`;
  const unknownContacts =
    truth.contacts.completeness === 'INDEXED'
      ? ''
      : /contacts=|was not queried/i.test(truth.contacts.summary)
        ? `; ${truth.contacts.summary}`
        : `; contacts=${truth.contacts.completeness}. ${truth.contacts.summary}`;
  const unknownTasks =
    truth.tasks.completeness === 'INDEXED'
      ? ''
      : /tasks=|was not queried/i.test(truth.tasks.summary)
        ? `; ${truth.tasks.summary}`
        : `; tasks=${truth.tasks.completeness}. ${truth.tasks.summary}`;
  const unknownTail = `${unknownContacts}${unknownTasks}`;
  const unknown = unknownTail ? `${unknownBase}${unknownTail}` : `${unknownBase}.`;
  return [
    `Client ${truth.displayName} (${truth.clientCode}) · posture ${truth.operatingPosture} · writePolicy ${truth.writePolicy}.`,
    `WHAT IS HAPPENING: ${truth.answers.workingOn.text}`,
    `WHY IT MATTERS: ${truth.identity.summary}`,
    `WHAT CHANGED: ${truth.answers.changed.text}`,
    knows,
    unknown,
    `WHAT SHOULD HAPPEN NEXT: ${truth.answers.hvcgNext.text}`,
    `PROVENANCE: ${truth.answers.provenance.text}`,
    `APPROVAL REQUIRED: ${truth.answers.ownerApproval.text}`,
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=${truth.capitalSubmit}; canExecute=${truth.canExecute}.`,
  ].join('\n');
}

function authorityFooter(truth: ClientTruthModel): string {
  return `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=${truth.capitalSubmit}; canExecute=${truth.canExecute}.`;
}

export function collectPendingDecisionLines(opts: {
  clientCode: string;
  approvalItems?: ReadonlyArray<{
    title?: string;
    clientCode?: string;
    status?: string;
    requestedAction?: string;
  }>;
  workspace?: WorkspaceTruthSnapshot;
}): string[] {
  const scoped = opts.clientCode.trim().toUpperCase();
  const lines: string[] = [];
  const push = (line: string) => {
    const text = line.replace(/\s+/g, ' ').trim();
    if (!text || lines.includes(text)) return;
    if (foreignCodesIn(text, scoped).length) return;
    lines.push(text);
  };
  for (const item of opts.approvalItems || []) {
    const status = (item.status || 'PENDING').toUpperCase();
    if (status !== 'PENDING' && status !== 'DEFERRED') continue;
    // Blank or missing ClientCode is not an entitled match. Exclude it.
    if (!exactClientCode(item.clientCode, scoped)) continue;
    const title = (item.title || '').trim();
    if (!title) continue;
    const action = (item.requestedAction || '').trim();
    push(action && action !== title ? `${title} — ${action}` : title);
  }
  for (const row of opts.workspace?.decisionsRisks?.items || []) {
    const rowCode = typeof row.clientCode === 'string' ? row.clientCode : undefined;
    if (!exactClientCode(rowCode, scoped)) continue;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const status = typeof row.status === 'string' ? row.status : '';
    if (/complete|closed|rejected/i.test(status)) continue;
    if (title) push(title);
  }
  for (const task of opts.workspace?.tasks || []) {
    const taskCode = task.clientCode;
    if (!exactClientCode(taskCode, scoped)) continue;
    const needs =
      task.requiresApproval === true ||
      /approval|needs_review|needs_owner_approval|decision/i.test(task.status || '');
    if (needs && task.title) push(task.title);
  }
  return lines.slice(0, 8);
}

function renderTopic(
  truth: ClientTruthModel,
  topic: ClientOperatingBriefTopic,
  pendingDecisions?: readonly string[],
): string {
  switch (topic) {
    case 'operating_brief':
      return renderBrief(truth);
    case 'my_business':
      return [
        truth.answers.who.text,
        truth.answers.workingOn.text,
        truth.answers.engagement.text,
        `writePolicy=${truth.writePolicy}.`,
        authorityFooter(truth),
      ].join(' ');
    case 'working_on':
      return truth.answers.workingOn.text;
    case 'projects':
      return [
        truth.answers.workingOn.text,
        `projects=${truth.projects.completeness}.`,
        'Current/active projects are hygiene-kept HVCG_Projects (REAL_CURRENT_OPERATING) only.',
        truth.projects.summary,
        'Atlas does not invent projects that are absent from the entitled workspace.',
        authorityFooter(truth),
      ].join(' ');
    case 'changed':
      return truth.answers.changed.text;
    case 'waiting':
      return `${truth.answers.waiting.text} Client-owed: ${truth.answers.clientNext.text}`;
    case 'missing_documents':
      return truth.answers.documentsMissing.text;
    case 'documents':
      return [
        truth.answers.documentsExist.text,
        `documents=${truth.documents.completeness}/${truth.documents.classification}.`,
        'Current document index is entitled HVCG_Communications/file-index rows for this ClientCode only.',
        'Recovered HVS filenames are not the current document index and are not a current missing inventory.',
        'A SharePoint library URL pointer is not a complete file inventory.',
        'Filenames are not invented beyond the entitled index.',
        authorityFooter(truth),
      ].join(' ');
    case 'meetings':
      return [
        truth.answers.meetingsExist.text,
        `meetings=${truth.meetings.completeness}/${truth.meetings.classification}.`,
        'Current meeting list is the entitled HVCG_Meetings slice for this ClientCode only.',
        'The workspace timeline is not the meeting inventory.',
        'Atlas does not invent meetings, attendees, notes, decisions, or next actions.',
        authorityFooter(truth),
      ].join(' ');
    case 'contacts':
      return [
        truth.answers.contactsExist.text,
        `contacts=${truth.contacts.completeness}/${truth.contacts.classification}.`,
        'Current contact list is the entitled HVCG_Contacts slice for this ClientCode only.',
        'Proposed contactCandidates are not the contact list.',
        'Atlas does not invent contacts, emails, phones, roles, or meeting attendees.',
        authorityFooter(truth),
      ].join(' ');
    case 'tasks':
      return [
        truth.answers.tasksExist.text,
        `tasks=${truth.tasks.completeness}/${truth.tasks.classification}.`,
        'Current task list is the entitled open HVCG_Tasks slice for this ClientCode only.',
        'Completed, cancelled, and hygiene-quarantined tasks are not this list.',
        'Atlas does not invent tasks, assignees, due dates, notes, or next actions.',
        authorityFooter(truth),
      ].join(' ');
    case 'engagements':
      return engagementsListAskAtlasSentence(
        truth.answers.engagementsExist.text,
        truth.engagementsList.completeness,
        truth.engagementsList.classification,
      );
    case 'deliverables':
      return deliverablesListAskAtlasSentence(
        truth.answers.deliverablesExist.text,
        truth.deliverablesList.completeness,
        truth.deliverablesList.classification,
      );
    case 'capital':
      return [
        `${truth.clientCode} capitalContext=${truth.capitalContext.completeness}/${truth.capitalContext.classification}.`,
        'Current capital context uses entitled capital opportunities already on this composition only.',
        'Recovered HVS filenames and keyword matches on HVCG_Projects titles are not active capital.',
        truth.answers.capital.text,
        'Amounts, lender, and funding status remain unstated.',
        authorityFooter(truth),
      ].join(' ');
    case 'owner_decisions':
      return [
        truth.answers.ownerApproval.text,
        'Ask Atlas did not apply an approval action.',
        authorityFooter(truth),
      ].join(' ');
    case 'approvals':
      return [
        truth.answers.ownerApproval.text,
        pendingDecisions?.length
          ? `Pending decisions: ${pendingDecisions.slice(0, 8).join('; ')}.`
          : 'No additional entitled pending approval items were visible on Approval Center or workspace decisions.',
        'Ask Atlas did not apply an approval action.',
        authorityFooter(truth),
      ].join(' ');
    case 'financials_known':
      return truth.answers.financialKnown.text;
    case 'financials_unknown':
      return truth.answers.financialUnknown.text;
    case 'finance':
      return [
        truth.answers.financialKnown.text,
        truth.answers.financialUnknown.text,
        `financialContext=${truth.financialContext.completeness}.`,
        authorityFooter(truth),
      ].join(' ');
    case 'growth':
      return [
        truth.answers.growthKnown.text,
        truth.answers.growthUnknown.text,
        `growthContext=${truth.growthContext.completeness}.`,
        authorityFooter(truth),
      ].join(' ');
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
    pendingDecisions?: readonly string[];
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

  const text = renderTopic(composed, topic, opts.pendingDecisions);
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
