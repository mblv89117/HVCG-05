/**
 * HVCG Revenue Operating System — production pipeline data & engine.
 * Fee/revenue dollars: only verified values or explicit PENDING.
 * Colorado Craft Beef facts: owner product-build directive + repository relationship history.
 */

export const PIPELINE_STAGES = [
  'New Lead',
  'Qualified',
  'Discovery',
  'Assessment',
  'Blueprint',
  'Proposal',
  'Negotiation',
  'Won',
  'Onboarding',
  'Active Engagement',
  'Closed',
  'Lost',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Default stage probabilities for weighted forecast (priors; not booked revenue). */
export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  'New Lead': 5,
  Qualified: 15,
  Discovery: 20,
  Assessment: 30,
  Blueprint: 40,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Onboarding: 100,
  'Active Engagement': 100,
  Closed: 100,
  Lost: 0,
};

export type MoneyAvailability = 'Verified' | 'Pending verification' | 'Not applicable';

export interface MoneyField {
  amount: number | null;
  currency: 'USD';
  availability: MoneyAvailability;
  note?: string;
}

export interface ReferralPartner {
  id: string;
  name: string;
  organization: string;
  contactName: string;
  attribution: string;
  active: boolean;
}

export interface Organization {
  id: string;
  legalName: string;
  dba?: string;
  industry?: string;
  state?: string;
  clientCode?: string;
  capitalNeed?: string;
  engagementStatus: string;
}

export interface Contact {
  id: string;
  name: string;
  organizationId: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  verified: boolean;
  verificationNote: string;
}

export interface MeetingRecord {
  id: string;
  date: string;
  title: string;
  summary: string;
  attendees: string[];
}

export interface ActivityRecord {
  id: string;
  occurredAt: string;
  type: 'Note' | 'Call' | 'Email' | 'Meeting' | 'Task' | 'StageChange' | 'Document';
  subject: string;
  detail: string;
  owner: string;
}

export interface DocumentRef {
  id: string;
  category: string;
  title: string;
  status: 'Requested' | 'Received' | 'Pending' | 'N/A';
}

export interface Opportunity {
  id: string;
  title: string;
  organizationId: string;
  contactId: string;
  referralPartnerId: string | null;
  referralSource: string;
  owner: string;
  stage: PipelineStage;
  probability: number;
  estimatedFee: MoneyField;
  recurringRevenue: MoneyField;
  successFeePotential: MoneyField;
  engagementType: string;
  expectedCloseDate: string | null;
  nextAction: string;
  nextActionDue: string | null;
  lastActivityAt: string;
  followUpDate: string | null;
  lostReason: string | null;
  serviceInterests: string[];
  capitalNeed: string;
  proposalStatus: 'None' | 'Draft' | 'Internal Review' | 'Sent' | 'Negotiation' | 'Accepted' | 'Withdrawn';
  blueprintStatus: 'Not Started' | 'In Progress' | 'Presented' | 'Accepted' | 'Deferred';
  onboardingStatus: 'Not Started' | 'Ready' | 'In Progress' | 'Complete' | 'Blocked';
  documents: DocumentRef[];
  meetings: MeetingRecord[];
  activities: ActivityRecord[];
  attributionChain: string[];
  notes: string;
  staleDaysThreshold: number;
}

export const referralPartners: ReferralPartner[] = [
  {
    id: 'rp-generational-group',
    name: 'Generational Group',
    organization: 'Generational Group',
    contactName: 'Randy Kamin',
    attribution: 'Original HVS referral → HVCG opportunity',
    active: true,
  },
  {
    id: 'rp-randy-kamin',
    name: 'Randy Kamin',
    organization: 'Generational Group',
    contactName: 'Randy Kamin',
    attribution: 'Referring advisor for Colorado Craft Beef',
    active: true,
  },
];

export const organizations: Organization[] = [
  {
    id: 'org-ccb',
    legalName: 'Colorado Craft Beef',
    dba: 'Colorado Craft Beef',
    industry: 'Agriculture / Food',
    state: 'CO',
    clientCode: 'CCB01',
    capitalNeed: 'Growth capital and additional real estate',
    engagementStatus: 'Transitioning to HVCG',
  },
  {
    id: 'org-accg',
    legalName: 'American Capital Consulting Group',
    dba: 'ACCG',
    industry: 'Professional Services',
    state: 'CA',
    clientCode: 'ACCG',
    capitalNeed: 'Expansion advisory (legacy contracted retainer protected)',
    engagementStatus: 'Active — legacy contracted pricing protected',
  },
];

/**
 * Contact named in Owner product-build assignment (2026-07-19).
 * Email/phone not present in repository evidence — left null.
 */
export const contacts: Contact[] = [
  {
    id: 'ct-jeff-smith',
    name: 'Jeff Smith',
    organizationId: 'org-ccb',
    role: 'Primary contact',
    email: null,
    phone: null,
    verified: true,
    verificationNote:
      'Named in Owner Revenue Systems product-build assignment; contact channels pending verified source.',
  },
  {
    id: 'ct-accg-primary',
    name: 'ACCG Primary Contact',
    organizationId: 'org-accg',
    role: 'Primary contact',
    email: null,
    phone: null,
    verified: true,
    verificationNote: 'Legacy ACCG contact placeholder — channels pending verified source.',
  },
];

const nowIso = '2026-07-19T17:00:00Z';

/** Colorado Craft Beef — current HVCG opportunity at Blueprint presentation stage. */
export const coloradoCraftBeefOpportunity: Opportunity = {
  id: 'opp-ccb-blueprint-001',
  title: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
  organizationId: 'org-ccb',
  contactId: 'ct-jeff-smith',
  referralPartnerId: 'rp-generational-group',
  referralSource: 'Randy Kamin — Generational Group',
  owner: 'Manny Barela',
  stage: 'Blueprint',
  probability: STAGE_PROBABILITY.Blueprint,
  estimatedFee: {
    amount: null,
    currency: 'USD',
    availability: 'Pending verification',
    note: 'No verified fee in repository; do not invent.',
  },
  recurringRevenue: {
    amount: null,
    currency: 'USD',
    availability: 'Pending verification',
  },
  successFeePotential: {
    amount: null,
    currency: 'USD',
    availability: 'Pending verification',
    note: 'Success-fee potential exists for capital path; amount pending owner verification.',
  },
  engagementType: 'Capital Advisory — Blueprint',
  expectedCloseDate: null,
  nextAction: 'Present Blueprint engagement package; collect verified financial package',
  nextActionDue: '2026-07-26',
  lastActivityAt: nowIso,
  followUpDate: '2026-07-26',
  lostReason: null,
  serviceInterests: ['Growth capital advisory', 'Real estate financing exploration'],
  capitalNeed: 'Growth capital and additional real estate',
  proposalStatus: 'None',
  blueprintStatus: 'Presented',
  onboardingStatus: 'Not Started',
  documents: [
    { id: 'doc-ccb-corp', category: 'Corporate', title: 'Entity / formation package', status: 'Requested' },
    { id: 'doc-ccb-fin', category: 'Financial', title: 'Financial package (verified)', status: 'Pending' },
    { id: 'doc-ccb-re', category: 'Real Estate', title: 'Real estate schedule', status: 'Requested' },
    { id: 'doc-ccb-debt', category: 'Debt', title: 'Debt schedule', status: 'Requested' },
    { id: 'doc-ccb-cap', category: 'Capital', title: 'Capital needs brief', status: 'Pending' },
  ],
  meetings: [
    {
      id: 'mtg-ccb-blueprint',
      date: '2026-07-19',
      title: 'Blueprint presentation',
      summary:
        'Blueprint engagement stage for growth capital and real estate objectives. Referral continuity with Generational Group (Randy Kamin) maintained.',
      attendees: ['Manny Barela', 'Jeff Smith'],
    },
  ],
  activities: [
    {
      id: 'act-ccb-1',
      occurredAt: '2026-07-19T16:00:00Z',
      type: 'StageChange',
      subject: 'Stage set to Blueprint',
      detail: 'Current HVCG opportunity at Blueprint presentation stage per Owner product-build directive.',
      owner: 'Manny Barela',
    },
    {
      id: 'act-ccb-2',
      occurredAt: '2026-07-19T16:30:00Z',
      type: 'Note',
      subject: 'Referral attribution locked',
      detail: 'Original HVS referral → Generational Group / Randy Kamin → HVCG opportunity.',
      owner: 'Manny Barela',
    },
  ],
  attributionChain: [
    'Original HVS referral',
    'Generational Group',
    'Randy Kamin',
    'Colorado Craft Beef (Jeff Smith)',
    'Current HVCG opportunity — Blueprint',
  ],
  notes:
    'Transitioning to HVCG from HVS referral. Objectives: growth capital and additional real estate. Prior financing discussion included non-dilutive and agricultural financing options. Financial KPIs remain pending until verified sources connect.',
  staleDaysThreshold: 14,
};

/** ACCG expansion opportunity — legacy contracted retainer ($4,539/mo) must remain protected. */
export const accgExpansionOpportunity: Opportunity = {
  id: 'opp-accg-expansion-001',
  title: 'ACCG — Expansion Opportunity (Legacy Protected)',
  organizationId: 'org-accg',
  contactId: 'ct-accg-primary',
  referralPartnerId: null,
  referralSource: 'Existing Client',
  owner: 'Manny Barela',
  stage: 'Discovery',
  probability: STAGE_PROBABILITY.Discovery,
  estimatedFee: {
    amount: null,
    currency: 'USD',
    availability: 'Pending verification',
    note: 'Recommended future economics only — do not overwrite contracted $4,539/mo.',
  },
  recurringRevenue: {
    amount: 4539,
    currency: 'USD',
    availability: 'Verified',
    note: 'CURRENT CONTRACTED pricing protected (ACCG lock).',
  },
  successFeePotential: {
    amount: null,
    currency: 'USD',
    availability: 'Pending verification',
  },
  engagementType: 'Legacy retainer + expansion evaluation',
  expectedCloseDate: null,
  nextAction: 'Evaluate V2 offer recommendation without changing contracted economics',
  nextActionDue: '2026-08-18',
  lastActivityAt: nowIso,
  followUpDate: '2026-08-18',
  lostReason: null,
  serviceInterests: ['Fractional CFO expansion', 'Capital readiness'],
  capitalNeed: 'Expansion advisory',
  proposalStatus: 'None',
  blueprintStatus: 'Not Started',
  onboardingStatus: 'Not Started',
  documents: [],
  meetings: [],
  activities: [
    {
      id: 'act-accg-1',
      occurredAt: nowIso,
      type: 'Note',
      subject: 'Legacy pricing protection active',
      detail: 'Contracted $4,539/mo must remain distinct from recommended future V2 pricing.',
      owner: 'Manny Barela',
    },
  ],
  attributionChain: ['Existing Client', 'ACCG', 'HVCG expansion opportunity'],
  notes: 'HVS_LEGACY_CLIENT. REPRICE recommendation cannot mutate contracted price.',
  staleDaysThreshold: 21,
};

/** Seed set for Dev/UAT pending-safe pipeline experience (no fabricated fees). */
export const opportunities: Opportunity[] = [coloradoCraftBeefOpportunity, accgExpansionOpportunity];

export function getOrganization(id: string) {
  return organizations.find((o) => o.id === id);
}

export function getContact(id: string) {
  return contacts.find((c) => c.id === id);
}

export function getReferralPartner(id: string | null) {
  if (!id) return undefined;
  return referralPartners.find((p) => p.id === id);
}

export function getOpportunity(id: string) {
  return opportunities.find((o) => o.id === id);
}

export function weightedValue(opp: Opportunity): number | null {
  if (opp.estimatedFee.amount == null) return null;
  return Math.round((opp.estimatedFee.amount * opp.probability) / 100);
}

export function formatMoney(field: MoneyField): string {
  if (field.amount == null) {
    return field.availability === 'Not applicable' ? '—' : 'Pending verification';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: field.currency,
    maximumFractionDigits: 0,
  }).format(field.amount);
}

export function daysSince(iso: string, asOf = nowIso): number {
  const a = new Date(iso).getTime();
  const b = new Date(asOf).getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

export function isStale(opp: Opportunity, asOf = nowIso): boolean {
  if (['Closed', 'Lost', 'Won', 'Onboarding', 'Active Engagement'].includes(opp.stage)) {
    return false;
  }
  const inactive = daysSince(opp.lastActivityAt, asOf) >= opp.staleDaysThreshold;
  const overdueNext =
    !!opp.nextActionDue && new Date(opp.nextActionDue).getTime() < new Date(asOf).getTime();
  return inactive || overdueNext;
}

export function stageCounts(list: Opportunity[] = opportunities) {
  return PIPELINE_STAGES.map((stage) => {
    const rows = list.filter((o) => o.stage === stage);
    const weighted = rows
      .map(weightedValue)
      .filter((v): v is number => v != null)
      .reduce((s, v) => s + v, 0);
    const hasPendingFees = rows.some((o) => o.estimatedFee.amount == null);
    return {
      stage,
      count: rows.length,
      weighted,
      weightedLabel:
        rows.length === 0
          ? '—'
          : hasPendingFees && weighted === 0
            ? 'Pending verification'
            : formatMoney({
                amount: weighted,
                currency: 'USD',
                availability: hasPendingFees ? 'Pending verification' : 'Verified',
              }),
    };
  });
}

export function forecastSummary(list: Opportunity[] = opportunities) {
  const open = list.filter((o) => !['Closed', 'Lost'].includes(o.stage));
  const weightedKnown = open
    .map(weightedValue)
    .filter((v): v is number => v != null)
    .reduce((s, v) => s + v, 0);
  const pendingFeeCount = open.filter((o) => o.estimatedFee.amount == null).length;
  const stale = open.filter((o) => isStale(o));
  return {
    openCount: open.length,
    weightedKnown,
    weightedLabel:
      pendingFeeCount === open.length
        ? 'Pending verification'
        : formatMoney({
            amount: weightedKnown,
            currency: 'USD',
            availability: pendingFeeCount ? 'Pending verification' : 'Verified',
          }),
    pendingFeeCount,
    staleCount: stale.length,
    staleIds: stale.map((o) => o.id),
    blueprintCount: open.filter((o) => o.stage === 'Blueprint').length,
    referralCoverage: open.filter((o) => !!o.referralSource).length,
  };
}

export function executiveRevenueWidgets(list: Opportunity[] = opportunities) {
  const forecast = forecastSummary(list);
  const ccb = list.find((o) => o.id === coloradoCraftBeefOpportunity.id);
  return {
    activePipelineLabel: forecast.weightedLabel,
    openOpportunities: forecast.openCount,
    staleAlerts: forecast.staleCount,
    blueprintInFlight: forecast.blueprintCount,
    referralAttributionIntact: Boolean(ccb?.referralSource?.includes('Generational Group')),
    highlightedOpportunity: ccb
      ? {
          id: ccb.id,
          title: ccb.title,
          stage: ccb.stage,
          contact: getContact(ccb.contactId)?.name,
          organization: getOrganization(ccb.organizationId)?.legalName,
          nextAction: ccb.nextAction,
        }
      : null,
  };
}

/** Capability matrix for role-based access (Entra roles later). */
export const REVENUE_CAPABILITIES = {
  createLead: ['Owner', 'Executive', 'Advisor'],
  qualifyLead: ['Owner', 'Executive', 'Advisor'],
  convertLead: ['Owner', 'Executive'],
  createOpportunity: ['Owner', 'Executive', 'Advisor'],
  updateStage: ['Owner', 'Executive', 'Advisor'],
  recordActivity: ['Owner', 'Executive', 'Advisor', 'Operations'],
  scheduleFollowUp: ['Owner', 'Executive', 'Advisor', 'Operations'],
  manageReferrals: ['Owner', 'Executive'],
  generateTasks: ['Owner', 'Executive', 'Advisor', 'Operations'],
  prepareBlueprint: ['Owner', 'Executive', 'Advisor'],
  trackProposals: ['Owner', 'Executive', 'Advisor'],
  markWonLost: ['Owner', 'Executive'],
  initiateOnboarding: ['Owner', 'Executive', 'Operations'],
  viewWeightedPipeline: ['Owner', 'Executive', 'Finance', 'Advisor'],
  forecastRevenue: ['Owner', 'Executive', 'Finance'],
  identifyStale: ['Owner', 'Executive', 'Advisor', 'Operations'],
} as const;

export function canRevenue(
  capability: keyof typeof REVENUE_CAPABILITIES,
  role: string
): boolean {
  return (REVENUE_CAPABILITIES[capability] as readonly string[]).includes(role);
}

export function advanceOnboarding(opp: Opportunity): Opportunity {
  if (!['Won', 'Onboarding'].includes(opp.stage)) {
    return opp;
  }
  return {
    ...opp,
    stage: 'Onboarding',
    probability: STAGE_PROBABILITY.Onboarding,
    onboardingStatus: 'In Progress',
    nextAction: 'Complete onboarding checklist and kickoff',
    lastActivityAt: nowIso,
    activities: [
      {
        id: `act-onboard-${Date.now()}`,
        occurredAt: nowIso,
        type: 'StageChange',
        subject: 'Onboarding initiated',
        detail: 'Won → Onboarding transition recorded. Delivery workspace handoff pending Operations/Portal.',
        owner: opp.owner,
      },
      ...opp.activities,
    ],
  };
}

export type LeadStatus = 'New' | 'Qualified' | 'Converted' | 'Disqualified';

export interface Lead {
  id: string;
  organizationName: string;
  contactName: string;
  referralPartnerId: string | null;
  referralSource: string;
  owner: string;
  status: LeadStatus;
  serviceInterests: string[];
  capitalNeed: string;
  nextAction: string;
  followUpDate: string | null;
  createdAt: string;
  lastActivityAt: string;
  opportunityId: string | null;
}

/** Seed lead already converted into the CCB Blueprint opportunity. */
export const leads: Lead[] = [
  {
    id: 'lead-ccb-001',
    organizationName: 'Colorado Craft Beef',
    contactName: 'Jeff Smith',
    referralPartnerId: 'rp-generational-group',
    referralSource: 'Randy Kamin — Generational Group',
    owner: 'Manny Barela',
    status: 'Converted',
    serviceInterests: ['Growth capital advisory', 'Real estate financing exploration'],
    capitalNeed: 'Growth capital and additional real estate',
    nextAction: 'Managed via opportunity opp-ccb-blueprint-001',
    followUpDate: '2026-07-26',
    createdAt: '2026-07-01T12:00:00Z',
    lastActivityAt: nowIso,
    opportunityId: 'opp-ccb-blueprint-001',
  },
];

export function createLead(input: {
  organizationName: string;
  contactName: string;
  referralPartnerId?: string | null;
  referralSource: string;
  owner: string;
  serviceInterests?: string[];
  capitalNeed?: string;
}): Lead {
  return {
    id: `lead-${Date.now()}`,
    organizationName: input.organizationName,
    contactName: input.contactName,
    referralPartnerId: input.referralPartnerId ?? null,
    referralSource: input.referralSource,
    owner: input.owner,
    status: 'New',
    serviceInterests: input.serviceInterests ?? [],
    capitalNeed: input.capitalNeed ?? '',
    nextAction: 'Qualify lead',
    followUpDate: null,
    createdAt: nowIso,
    lastActivityAt: nowIso,
    opportunityId: null,
  };
}

export function qualifyLead(lead: Lead): Lead {
  if (lead.status !== 'New') return lead;
  return {
    ...lead,
    status: 'Qualified',
    nextAction: 'Schedule discovery / convert to opportunity',
    lastActivityAt: nowIso,
  };
}

export function convertLeadToOpportunity(lead: Lead): { lead: Lead; opportunity: Opportunity } {
  const opp: Opportunity = {
    id: `opp-${Date.now()}`,
    title: `${lead.organizationName} — Opportunity`,
    organizationId: organizations.find((o) => o.legalName === lead.organizationName)?.id ?? 'org-pending',
    contactId: contacts.find((c) => c.name === lead.contactName)?.id ?? 'ct-pending',
    referralPartnerId: lead.referralPartnerId,
    referralSource: lead.referralSource,
    owner: lead.owner,
    stage: 'Discovery',
    probability: STAGE_PROBABILITY.Discovery,
    estimatedFee: { amount: null, currency: 'USD', availability: 'Pending verification' },
    recurringRevenue: { amount: null, currency: 'USD', availability: 'Pending verification' },
    successFeePotential: { amount: null, currency: 'USD', availability: 'Pending verification' },
    engagementType: 'Advisory',
    expectedCloseDate: null,
    nextAction: 'Complete discovery agenda',
    nextActionDue: lead.followUpDate,
    lastActivityAt: nowIso,
    followUpDate: lead.followUpDate,
    lostReason: null,
    serviceInterests: lead.serviceInterests,
    capitalNeed: lead.capitalNeed,
    proposalStatus: 'None',
    blueprintStatus: 'Not Started',
    onboardingStatus: 'Not Started',
    documents: [],
    meetings: [],
    activities: [
      {
        id: `act-convert-${Date.now()}`,
        occurredAt: nowIso,
        type: 'StageChange',
        subject: 'Lead converted',
        detail: `Converted from ${lead.id}. Referral attribution preserved: ${lead.referralSource}`,
        owner: lead.owner,
      },
    ],
    attributionChain: [
      lead.referralSource,
      lead.organizationName,
      'HVCG opportunity',
    ].filter(Boolean),
    notes: '',
    staleDaysThreshold: 14,
  };
  return {
    lead: { ...lead, status: 'Converted', opportunityId: opp.id, lastActivityAt: nowIso },
    opportunity: opp,
  };
}

export function updateStage(opp: Opportunity, stage: PipelineStage, actor: string): Opportunity {
  const patch: Partial<Opportunity> = {
    stage,
    probability: STAGE_PROBABILITY[stage],
    lastActivityAt: nowIso,
  };
  if (stage === 'Lost') {
    patch.lostReason = opp.lostReason || 'Reason pending owner entry';
  }
  if (stage === 'Won') {
    patch.proposalStatus = opp.proposalStatus === 'None' ? 'Accepted' : opp.proposalStatus;
    patch.onboardingStatus = 'Ready';
    patch.nextAction = 'Initiate onboarding';
  }
  if (stage === 'Blueprint') {
    patch.blueprintStatus = opp.blueprintStatus === 'Not Started' ? 'In Progress' : opp.blueprintStatus;
  }
  if (stage === 'Proposal') {
    patch.proposalStatus = opp.proposalStatus === 'None' ? 'Draft' : opp.proposalStatus;
  }
  return {
    ...opp,
    ...patch,
    activities: [
      {
        id: `act-stage-${Date.now()}`,
        occurredAt: nowIso,
        type: 'StageChange',
        subject: `Stage → ${stage}`,
        detail: `Stage updated by ${actor}`,
        owner: actor,
      },
      ...opp.activities,
    ],
  };
}

export function recordActivity(
  opp: Opportunity,
  activity: Omit<ActivityRecord, 'id' | 'occurredAt'>
): Opportunity {
  return {
    ...opp,
    lastActivityAt: nowIso,
    activities: [
      {
        id: `act-${Date.now()}`,
        occurredAt: nowIso,
        ...activity,
      },
      ...opp.activities,
    ],
  };
}

export function scheduleFollowUp(opp: Opportunity, date: string, action: string): Opportunity {
  return {
    ...opp,
    followUpDate: date,
    nextActionDue: date,
    nextAction: action,
    lastActivityAt: nowIso,
    activities: [
      {
        id: `act-fu-${Date.now()}`,
        occurredAt: nowIso,
        type: 'Task',
        subject: 'Follow-up scheduled',
        detail: `${action} · due ${date}`,
        owner: opp.owner,
      },
      ...opp.activities,
    ],
  };
}

export function generateTasks(opp: Opportunity): Array<{ id: string; title: string; due: string | null; related: string }> {
  const tasks = [
    {
      id: `task-${opp.id}-next`,
      title: opp.nextAction,
      due: opp.nextActionDue,
      related: opp.title,
    },
  ];
  if (opp.stage === 'Blueprint') {
    tasks.push({
      id: `task-${opp.id}-blueprint-pkg`,
      title: 'Prepare Blueprint engagement package',
      due: opp.followUpDate,
      related: opp.title,
    });
  }
  if (opp.proposalStatus === 'Draft' || opp.stage === 'Proposal') {
    tasks.push({
      id: `task-${opp.id}-proposal`,
      title: 'Advance proposal toward internal review / send',
      due: opp.followUpDate,
      related: opp.title,
    });
  }
  for (const doc of opp.documents.filter((d) => d.status === 'Requested' || d.status === 'Pending')) {
    tasks.push({
      id: `task-${opp.id}-${doc.id}`,
      title: `Collect document: ${doc.title}`,
      due: opp.followUpDate,
      related: opp.title,
    });
  }
  return tasks;
}

export function markWon(opp: Opportunity, actor: string): Opportunity {
  return updateStage(opp, 'Won', actor);
}

export function markLost(opp: Opportunity, actor: string, reason: string): Opportunity {
  return updateStage({ ...opp, lostReason: reason }, 'Lost', actor);
}

export function prepareBlueprint(opp: Opportunity, actor: string): Opportunity {
  const advanced = opp.stage === 'Assessment' || opp.stage === 'Discovery'
    ? updateStage(opp, 'Blueprint', actor)
    : opp;
  return {
    ...advanced,
    blueprintStatus: 'In Progress',
    nextAction: 'Present Blueprint engagement package',
    activities: [
      {
        id: `act-bp-${Date.now()}`,
        occurredAt: nowIso,
        type: 'Document',
        subject: 'Blueprint preparation',
        detail: 'Blueprint engagement package prepared for presentation.',
        owner: actor,
      },
      ...advanced.activities,
    ],
  };
}
