/**
 * Non-destructive operating-record hygiene for owner-facing client truth.
 *
 * Distinguishes CLIENT BUSINESS TRUTH from ENGINEERING / HARDENING ARTIFACTS
 * and HISTORICAL RECOVERED evidence without deleting SharePoint source rows.
 *
 * Mission: ATLAS-W2C-ACCG01-LIVE-DATA-HYGIENE
 *
 * Classification is evidence-backed:
 * - known source identity (list + item id) from functional-test lineage
 * - structured Atlas harden naming convention (known test lineage, not fuzzy title hide)
 * - corroborating description/provenance markers
 * - parent project inheritance for child tasks
 * - IsInternalProject / recovered flags
 *
 * Title substrings alone never quarantine a record.
 */

export const OPERATING_RECORD_CLASSES = [
  'REAL_CURRENT_OPERATING',
  'HISTORICAL_RECOVERED',
  'INTERNAL_SYSTEM',
  'TEST_HARDENING',
  'UNKNOWN_REQUIRES_REVIEW',
] as const;

export type OperatingRecordClass = (typeof OPERATING_RECORD_CLASSES)[number];

export type HygieneConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type HygieneEntityType =
  | 'project'
  | 'task'
  | 'decision'
  | 'risk'
  | 'document_request'
  | 'milestone'
  | 'engagement'
  | 'communication'
  | 'meeting'
  | 'document'
  | 'other';

export type HygieneEvidenceSignals = {
  knownSourceIdentity?: boolean;
  structuredHardenLineage?: boolean;
  descriptionTestMarker?: boolean;
  parentTestHardening?: boolean;
  isInternalProject?: boolean;
  historicalRecovered?: boolean;
  discoveryHintOnly?: boolean;
};

export type OperatingRecordHygieneResult = {
  classification: OperatingRecordClass;
  confidence: HygieneConfidence;
  evidence: string[];
  signals: HygieneEvidenceSignals;
  safeClientOperatingVisibility: boolean;
  sourceMutationRequired: false;
};

export type HygieneClassifiable = {
  entityType: HygieneEntityType;
  sourceList: string;
  sourceItemId: string;
  clientCode?: string;
  title?: string;
  description?: string;
  summary?: string;
  isInternalProject?: boolean;
  historicalRecovered?: boolean;
  operationalized?: boolean;
  projectId?: string;
  parentClassification?: OperatingRecordClass;
};

/** Known functional-test SoR rows from deployment/reports/flow-functional-tests-latest.json (2026-07-22). */
export const KNOWN_TEST_HARDENING_SOURCE_IDS: ReadonlyArray<{
  sourceList: string;
  sourceItemId: string;
  clientCode: string;
  title: string;
  entityType: HygieneEntityType;
  evidence: string;
}> = [
  {
    sourceList: 'HVCG_Decisions',
    sourceItemId: '6',
    clientCode: 'ACCG01',
    title: 'ATLAS Harden Decision M014703',
    entityType: 'decision',
    evidence: 'flow-functional-tests-latest.json HVCG_ExecutiveDecisionEscalation Create_Decision ID=6',
  },
  {
    sourceList: 'HVCG_Projects',
    sourceItemId: '27',
    clientCode: 'ACCG01',
    title: 'ACCG01 - Onboarding',
    entityType: 'project',
    evidence: 'flow-functional-tests-latest.json HVCG_CreateProjectFromTemplate Create_Project ID=27',
  },
  {
    sourceList: 'HVCG_Tasks',
    sourceItemId: '11',
    clientCode: 'ACCG01',
    title: 'Schedule and run kickoff call',
    entityType: 'task',
    evidence: 'flow-functional-tests-latest.json Create_Task_Kickoff ID=11 under project 27',
  },
  {
    sourceList: 'HVCG_Tasks',
    sourceItemId: '12',
    clientCode: 'ACCG01',
    title: 'Collect critical onboarding documents',
    entityType: 'task',
    evidence: 'flow-functional-tests-latest.json Create_Task_CollectDocs ID=12 under project 27',
  },
  {
    sourceList: 'HVCG_Tasks',
    sourceItemId: '13',
    clientCode: 'ACCG01',
    title: 'Complete onboarding review',
    entityType: 'task',
    evidence: 'flow-functional-tests-latest.json Create_Task_OnboardingReview ID=13 under project 27',
  },
  {
    sourceList: 'HVCG_Milestones',
    sourceItemId: '7',
    clientCode: 'ACCG01',
    title: 'Kickoff completed',
    entityType: 'milestone',
    evidence: 'flow-functional-tests-latest.json Create_Milestone_Kickoff ID=7 under project 27',
  },
  {
    sourceList: 'HVCG_Milestones',
    sourceItemId: '8',
    clientCode: 'ACCG01',
    title: 'Critical documents collected',
    entityType: 'milestone',
    evidence: 'flow-functional-tests-latest.json Create_Milestone_CriticalDocs ID=8 under project 27',
  },
  {
    sourceList: 'HVCG_Milestones',
    sourceItemId: '9',
    clientCode: 'ACCG01',
    title: 'Onboarding complete',
    entityType: 'milestone',
    evidence: 'flow-functional-tests-latest.json Create_Milestone_OnboardingComplete ID=9 under project 27',
  },
];

/** Structured Atlas harden project title: `{ClientCode} - harden{optionalLetter}-{digits}` */
const STRUCTURED_HARDEN_PROJECT =
  /^([A-Z]{2,8}\d{2})\s*-\s*harden[A-Za-z]?-\d+$/i;

/** Structured Atlas harden decision title lineage (exact convention, not fuzzy "harden" substring). */
const STRUCTURED_HARDEN_DECISION =
  /^(?:ATLAS\s+)?HARDEN\s+Decision\s+[A-Za-z]?\d+$/i;

/** Corroborating description markers from live ACCG01 harden decisions + flow tests. */
const DESCRIPTION_TEST_MARKERS =
  /\b(?:functional\s+test(?:\s+internal\s+only)?|REST\s+HttpRequest\s+functional\s+test|recovery\s+test|milestone\+doc\s+fix\s+test|internal\s+only)\b/i;

/** Weak discovery hints — never sufficient alone to quarantine. */
const DISCOVERY_HINT =
  /\b(?:harden|HARDEN\s+Decision|ATLAS\s+Harden|functional\s+test|recovery\s+test)\b/i;

const KNOWN_BY_KEY = new Map(
  KNOWN_TEST_HARDENING_SOURCE_IDS.map((row) => [
    `${row.sourceList}|${row.sourceItemId}|${row.clientCode}`,
    row,
  ]),
);

export function isOwnerFacingCurrentOperating(classification: OperatingRecordClass): boolean {
  return classification === 'REAL_CURRENT_OPERATING';
}

/** Canonical SharePoint list names used for hygiene source identity. */
export const HYGIENE_SOURCE_LISTS = [
  'HVCG_Projects',
  'HVCG_Tasks',
  'HVCG_Decisions',
  'HVCG_Risks',
  'HVCG_Milestones',
  'HVCG_DocumentRequests',
  'HVCG_Communications',
  'HVCG_Meetings',
  'HVCG_Engagements',
  'HVCG_Deliverables',
  'HVCG_Contacts',
] as const;

export type HygieneSourceList = (typeof HYGIENE_SOURCE_LISTS)[number];

const SOURCE_LIST_ALIASES: Record<string, HygieneSourceList> = {
  HVCG_Projects: 'HVCG_Projects',
  HVCG_Tasks: 'HVCG_Tasks',
  HVCG_Decisions: 'HVCG_Decisions',
  HVCG_Risks: 'HVCG_Risks',
  HVCG_Milestones: 'HVCG_Milestones',
  HVCG_DocumentRequests: 'HVCG_DocumentRequests',
  HVCG_Communications: 'HVCG_Communications',
  'HVCG_Communications/file-index': 'HVCG_Communications',
  HVCG_Meetings: 'HVCG_Meetings',
  HVCG_Engagements: 'HVCG_Engagements',
  HVCG_Deliverables: 'HVCG_Deliverables',
  HVCG_Contacts: 'HVCG_Contacts',
};

/** Normalize timeline/workspace source labels to a canonical list name when known. */
export function canonicalSourceList(source: string | undefined | null): string | undefined {
  const raw = (source || '').trim();
  if (!raw) return undefined;
  return SOURCE_LIST_ALIASES[raw] || raw;
}

/** List-local SharePoint IDs collide across lists — always qualify by source list. */
export function sourceRecordKey(source: string | undefined | null, id: string | undefined | null): string {
  const list = canonicalSourceList(source) || 'UNKNOWN_SOURCE';
  const itemId = String(id ?? '').trim() || 'UNKNOWN_ID';
  return `${list}|${itemId}`;
}

export function entityTypeForSourceList(sourceList: string): HygieneEntityType {
  switch (canonicalSourceList(sourceList)) {
    case 'HVCG_Projects':
      return 'project';
    case 'HVCG_Tasks':
      return 'task';
    case 'HVCG_Decisions':
      return 'decision';
    case 'HVCG_Risks':
      return 'risk';
    case 'HVCG_Milestones':
      return 'milestone';
    case 'HVCG_DocumentRequests':
      return 'document_request';
    case 'HVCG_Communications':
      return 'communication';
    case 'HVCG_Meetings':
      return 'meeting';
    case 'HVCG_Engagements':
      return 'engagement';
    case 'HVCG_Deliverables':
      return 'document';
    default:
      return 'other';
  }
}

/** Hygiene-targeted timeline/workspace classes where unknown source must fail closed. */
export function isHygieneTargetedSource(source: string | undefined | null): boolean {
  const list = canonicalSourceList(source);
  return (
    list === 'HVCG_Projects' ||
    list === 'HVCG_Tasks' ||
    list === 'HVCG_Decisions' ||
    list === 'HVCG_Risks' ||
    list === 'HVCG_Milestones' ||
    list === 'HVCG_DocumentRequests'
  );
}

export function classifyOperatingRecord(input: HygieneClassifiable): OperatingRecordHygieneResult {
  const evidence: string[] = [];
  const signals: HygieneEvidenceSignals = {};
  const title = (input.title || '').trim();
  const description = `${input.description || ''} ${input.summary || ''}`.trim();
  const clientCode = (input.clientCode || '').trim().toUpperCase();
  const sourceKey = `${input.sourceList}|${input.sourceItemId}|${clientCode}`;

  const known = KNOWN_BY_KEY.get(sourceKey);
  if (known) {
    signals.knownSourceIdentity = true;
    evidence.push(known.evidence);
    evidence.push(`sourceIdentity=${input.sourceList}:${input.sourceItemId}`);
    return {
      classification: 'TEST_HARDENING',
      confidence: 'HIGH',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  if (input.isInternalProject === true) {
    signals.isInternalProject = true;
    evidence.push('IsInternalProject=true (staff-internal classification)');
    return {
      classification: 'INTERNAL_SYSTEM',
      confidence: 'HIGH',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  if (input.historicalRecovered === true || input.operationalized === false) {
    signals.historicalRecovered = true;
    evidence.push(
      input.operationalized === false
        ? 'operationalized=false (historical HVS recovered; not Hub-current)'
        : 'historicalRecovered=true',
    );
    return {
      classification: 'HISTORICAL_RECOVERED',
      confidence: 'HIGH',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  if (
    input.parentClassification === 'TEST_HARDENING' ||
    input.parentClassification === 'INTERNAL_SYSTEM'
  ) {
    signals.parentTestHardening = true;
    evidence.push(`parentClassification=${input.parentClassification}`);
    return {
      classification: input.parentClassification,
      confidence: 'HIGH',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  const structuredProject =
    input.entityType === 'project' &&
    STRUCTURED_HARDEN_PROJECT.test(title) &&
    STRUCTURED_HARDEN_PROJECT.exec(title)?.[1]?.toUpperCase() === clientCode;
  const structuredDecision =
    (input.entityType === 'decision' || input.entityType === 'other') &&
    STRUCTURED_HARDEN_DECISION.test(title);
  const structuredDocReq =
    input.entityType === 'document_request' && /^ATLAS\s+Harden\s+Doc\b/i.test(title);

  if (structuredProject || structuredDecision || structuredDocReq) {
    signals.structuredHardenLineage = true;
    evidence.push(
      structuredProject
        ? `structuredHardenProjectLineage title=${title}`
        : structuredDecision
          ? `structuredHardenDecisionLineage title=${title}`
          : `structuredHardenDocRequestLineage title=${title}`,
    );
    const descHit = DESCRIPTION_TEST_MARKERS.test(description);
    if (descHit) {
      signals.descriptionTestMarker = true;
      evidence.push(`descriptionTestMarker matched on description/summary`);
    }
    // Structured harden lineage is itself known Atlas functional-test naming.
    // Description markers raise confidence but are not required for this exact convention.
    return {
      classification: 'TEST_HARDENING',
      confidence: descHit || structuredProject || structuredDocReq ? 'HIGH' : 'MEDIUM',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  // Description alone with a discovery-hint title (non-structured) → review, do not promote.
  if (DISCOVERY_HINT.test(title) || DISCOVERY_HINT.test(description)) {
    signals.discoveryHintOnly = true;
    evidence.push('discoveryHint matched title/description without structured lineage or source identity');
    if (DESCRIPTION_TEST_MARKERS.test(description)) {
      signals.descriptionTestMarker = true;
      evidence.push('descriptionTestMarker present; classifying UNKNOWN_REQUIRES_REVIEW (not silent current)');
      return {
        classification: 'UNKNOWN_REQUIRES_REVIEW',
        confidence: 'MEDIUM',
        evidence,
        signals,
        safeClientOperatingVisibility: false,
        sourceMutationRequired: false,
      };
    }
    return {
      classification: 'UNKNOWN_REQUIRES_REVIEW',
      confidence: 'LOW',
      evidence,
      signals,
      safeClientOperatingVisibility: false,
      sourceMutationRequired: false,
    };
  }

  return {
    classification: 'REAL_CURRENT_OPERATING',
    confidence: 'MEDIUM',
    evidence: ['no test/internal/historical exclusion signals'],
    signals,
    safeClientOperatingVisibility: true,
    sourceMutationRequired: false,
  };
}

export type HygieneInventoryRow = {
  clientCode: string;
  entityType: HygieneEntityType;
  sourceSystem: 'sharepoint';
  sourceList: string;
  sourceItemId: string;
  sourceRef: string;
  title: string;
  currentClassification: 'UNCLASSIFIED_CLIENT_SCOPED';
  proposedClassification: OperatingRecordClass;
  evidence: string[];
  safeClientOperatingVisibility: boolean;
  sourceMutationRequired: false;
  confidence: HygieneConfidence;
};

export function toHygieneInventoryRow(
  input: HygieneClassifiable,
  result: OperatingRecordHygieneResult,
): HygieneInventoryRow {
  return {
    clientCode: (input.clientCode || '').toUpperCase(),
    entityType: input.entityType,
    sourceSystem: 'sharepoint',
    sourceList: input.sourceList,
    sourceItemId: input.sourceItemId,
    sourceRef: `${input.sourceList}:${input.sourceItemId}`,
    title: input.title || '',
    currentClassification: 'UNCLASSIFIED_CLIENT_SCOPED',
    proposedClassification: result.classification,
    evidence: result.evidence,
    safeClientOperatingVisibility: result.safeClientOperatingVisibility,
    sourceMutationRequired: false,
    confidence: result.confidence,
  };
}

export type WorkspaceHygieneSummary = {
  contractVersion: 'atlas-operating-record-hygiene.v1';
  missionKey: 'ATLAS-W2C-ACCG01-LIVE-DATA-HYGIENE';
  ownerFacingFilter: 'REAL_CURRENT_OPERATING_ONLY';
  quarantined: HygieneInventoryRow[];
  counts: {
    rawProjects: number;
    operatingProjects: number;
    rawTasks: number;
    operatingTasks: number;
    rawDecisionsRisks: number;
    operatingDecisionsRisks: number;
    testHardening: number;
    internalSystem: number;
    historicalRecovered: number;
    unknownRequiresReview: number;
  };
};

export function filterOwnerFacingProjects<T extends { id: string; name: string; clientCode?: string; isInternalProject?: boolean; description?: string }>(
  projects: T[],
  opts?: { sourceList?: string },
): { operating: T[]; quarantined: HygieneInventoryRow[]; byId: Map<string, OperatingRecordHygieneResult> } {
  const sourceList = opts?.sourceList || 'HVCG_Projects';
  const operating: T[] = [];
  const quarantined: HygieneInventoryRow[] = [];
  const byId = new Map<string, OperatingRecordHygieneResult>();
  for (const project of projects) {
    const result = classifyOperatingRecord({
      entityType: 'project',
      sourceList,
      sourceItemId: project.id,
      clientCode: project.clientCode,
      title: project.name,
      description: project.description,
      isInternalProject: project.isInternalProject,
    });
    byId.set(project.id, result);
    if (isOwnerFacingCurrentOperating(result.classification)) {
      operating.push(project);
    } else {
      quarantined.push(
        toHygieneInventoryRow(
          {
            entityType: 'project',
            sourceList,
            sourceItemId: project.id,
            clientCode: project.clientCode,
            title: project.name,
            description: project.description,
            isInternalProject: project.isInternalProject,
          },
          result,
        ),
      );
    }
  }
  return { operating, quarantined, byId };
}

export function filterOwnerFacingTasks<T extends { id: string; title: string; clientCode?: string; projectId?: string }>(
  tasks: T[],
  projectClassById: Map<string, OperatingRecordHygieneResult>,
  opts?: { sourceList?: string },
): { operating: T[]; quarantined: HygieneInventoryRow[] } {
  const sourceList = opts?.sourceList || 'HVCG_Tasks';
  const operating: T[] = [];
  const quarantined: HygieneInventoryRow[] = [];
  for (const task of tasks) {
    const parent = task.projectId ? projectClassById.get(task.projectId) : undefined;
    const result = classifyOperatingRecord({
      entityType: 'task',
      sourceList,
      sourceItemId: task.id,
      clientCode: task.clientCode,
      title: task.title,
      projectId: task.projectId,
      parentClassification: parent?.classification,
    });
    if (isOwnerFacingCurrentOperating(result.classification)) {
      operating.push(task);
    } else {
      quarantined.push(
        toHygieneInventoryRow(
          {
            entityType: 'task',
            sourceList,
            sourceItemId: task.id,
            clientCode: task.clientCode,
            title: task.title,
            projectId: task.projectId,
            parentClassification: parent?.classification,
          },
          result,
        ),
      );
    }
  }
  return { operating, quarantined };
}

export function filterOwnerFacingWorkspaceItems(
  items: Array<Record<string, unknown>>,
  opts?: {
    /** Fallback only when item lacks stamped sourceList (legacy snapshots). */
    entityType?: HygieneEntityType;
    sourceList?: string;
    clientCode?: string;
  },
): { operating: Array<Record<string, unknown>>; quarantined: HygieneInventoryRow[] } {
  const operating: Array<Record<string, unknown>> = [];
  const quarantined: HygieneInventoryRow[] = [];
  for (const item of items) {
    const id = String(item.id ?? '');
    const title = typeof item.title === 'string' ? item.title : '';
    const summary =
      (typeof item.summary === 'string' && item.summary) ||
      (typeof item.description === 'string' && item.description) ||
      '';
    const clientCode =
      (typeof item.clientCode === 'string' && item.clientCode) || opts?.clientCode || '';
    const stampedList =
      typeof item.sourceList === 'string' && item.sourceList.trim()
        ? canonicalSourceList(item.sourceList)
        : undefined;
    const sourceList = stampedList || opts?.sourceList;
    const stampedEntity =
      typeof item.entityType === 'string' && item.entityType.trim()
        ? (item.entityType as HygieneEntityType)
        : undefined;
    const entityType =
      stampedEntity ||
      (sourceList ? entityTypeForSourceList(sourceList) : undefined) ||
      opts?.entityType;

    // Missing list identity on hygiene-targeted combined sections must not assume HVCG_Decisions.
    if (!sourceList || !entityType) {
      const unknownResult: OperatingRecordHygieneResult = {
        classification: 'UNKNOWN_REQUIRES_REVIEW',
        confidence: 'LOW',
        evidence: [
          'workspace item missing sourceList/entityType provenance; fail-closed for owner-facing current truth',
        ],
        signals: { discoveryHintOnly: true },
        safeClientOperatingVisibility: false,
        sourceMutationRequired: false,
      };
      quarantined.push(
        toHygieneInventoryRow(
          {
            entityType: entityType || 'other',
            sourceList: sourceList || 'UNKNOWN_SOURCE',
            sourceItemId: id,
            clientCode,
            title,
            summary,
          },
          unknownResult,
        ),
      );
      continue;
    }

    const result = classifyOperatingRecord({
      entityType,
      sourceList,
      sourceItemId: id,
      clientCode,
      title,
      summary,
      description: summary,
    });
    if (isOwnerFacingCurrentOperating(result.classification)) {
      operating.push(item);
    } else {
      quarantined.push(
        toHygieneInventoryRow(
          {
            entityType,
            sourceList,
            sourceItemId: id,
            clientCode,
            title,
            summary,
          },
          result,
        ),
      );
    }
  }
  return { operating, quarantined };
}

export function summarizeHygiene(input: {
  rawProjects: number;
  operatingProjects: number;
  rawTasks: number;
  operatingTasks: number;
  rawDecisionsRisks: number;
  operatingDecisionsRisks: number;
  quarantined: HygieneInventoryRow[];
}): WorkspaceHygieneSummary {
  const counts = {
    rawProjects: input.rawProjects,
    operatingProjects: input.operatingProjects,
    rawTasks: input.rawTasks,
    operatingTasks: input.operatingTasks,
    rawDecisionsRisks: input.rawDecisionsRisks,
    operatingDecisionsRisks: input.operatingDecisionsRisks,
    testHardening: 0,
    internalSystem: 0,
    historicalRecovered: 0,
    unknownRequiresReview: 0,
  };
  for (const row of input.quarantined) {
    if (row.proposedClassification === 'TEST_HARDENING') counts.testHardening += 1;
    if (row.proposedClassification === 'INTERNAL_SYSTEM') counts.internalSystem += 1;
    if (row.proposedClassification === 'HISTORICAL_RECOVERED') counts.historicalRecovered += 1;
    if (row.proposedClassification === 'UNKNOWN_REQUIRES_REVIEW') counts.unknownRequiresReview += 1;
  }
  return {
    contractVersion: 'atlas-operating-record-hygiene.v1',
    missionKey: 'ATLAS-W2C-ACCG01-LIVE-DATA-HYGIENE',
    ownerFacingFilter: 'REAL_CURRENT_OPERATING_ONLY',
    quarantined: input.quarantined,
    counts,
  };
}
