/**
 * Atlas operator commercial context — Integration SoT shapes, read-only on the desk.
 * Live GTM outbound, paid ads, and Graph mutations stay OFF.
 * Never invent LTV, campaign history, or Copilot assessments.
 */

export const GCC_SIGNAL_TYPES = [
  'renewal_risk',
  'expansion_opportunity',
  'value_realized',
  'engagement_health',
  'ltv_update',
  'capital_need',
  'constraint',
  'ai_opportunity',
  'process_bottleneck',
  'contract_opportunity',
] as const;

export type GccSignalType = (typeof GCC_SIGNAL_TYPES)[number];

export const GCC_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type GccSeverity = (typeof GCC_SEVERITIES)[number];

export const PRECALL_OWNERS = ['360', 'copilot', 'atlas'] as const;
export type PreCallOwner = (typeof PRECALL_OWNERS)[number];

export interface Honesty {
  available: boolean;
  recordedOnly: true;
  emptyReason?: string;
}

export interface AttributionLineage {
  source?: string;
  campaignId?: string;
  contentId?: string;
  messageId?: string;
  funnelId?: string;
  formId?: string;
  diagnosticId?: string;
  meetingId?: string;
  clientCode?: string;
  engagementId?: string;
  ltvSignalId?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export interface GccValueSignal {
  contractVersion: 'gcc-value-signal.v1';
  signalId: string;
  clientCode: string;
  signalType: GccSignalType;
  severity?: GccSeverity;
  summary?: string;
  metrics?: Record<string, number | string | boolean | null>;
  emittedAt: string;
  copiesLedger: false;
  idempotencyKey: string;
}

export interface PreCallBrief {
  contractVersion: 'pre-call-brief.v1';
  briefId: string;
  bookingId: string;
  companyName?: string;
  atlasClientCode?: string;
  summary?: string;
  painHypotheses?: string[];
  suggestedQuestions?: string[];
  generatedAt: string;
  ownerSystem: PreCallOwner;
  observationOnly: true;
  attribution?: AttributionLineage;
  idempotencyKey: string;
}

export interface CopilotAssessment {
  contractVersion: 'atlas-lead-handoff.v1';
  assessmentId: string;
  organizationName?: string;
  clientCode?: string;
  summary?: string;
  observationOnly: true;
  source: 'agent-copilot';
  idempotencyKey: string;
  recordedAt: string;
}

export interface PersistedAttribution {
  contractVersion: 'attribution-lineage.v1';
  clientCode: string;
  lineage: AttributionLineage;
  idempotencyKey: string;
  recordedAt: string;
}

export interface CommercialOpportunity {
  contractVersion: 'opportunity-commercial-context.v1';
  opportunityId: string;
  clientCode: string;
  title?: string;
  stage: string;
  leadId?: string;
  estimatedValue?: number;
  currency?: 'USD';
  capitalHandoffStatus?: string;
  attribution?: AttributionLineage;
}

export interface OperatorCommercialContext {
  contractVersion: 'atlas-operator-commercial-context.v1';
  entitled: true;
  liveGtmOutbound: false;
  paidAds: false;
  clientCode?: string;
  gcc: {
    contractVersion: 'gcc-value-signal.v1';
    honesty: Honesty;
    signals: GccValueSignal[];
  };
  copilot: {
    honesty: Honesty;
    assessments: CopilotAssessment[];
    preCall: PreCallBrief[];
    sharepoint: Array<{
      opportunityId: string;
      clientCode?: string;
      copilotSummary?: string;
      copilotKeywords?: string;
    }>;
  };
  gtm: {
    honesty: Honesty;
    attributions: PersistedAttribution[];
    crmSources: Array<{
      leadId: string;
      clientCode?: string;
      source?: string;
      leadSourceDetail?: string;
    }>;
  };
  opportunities: CommercialOpportunity[];
}

export interface DeskCommercialContext {
  contractVersion: 'atlas-operator-commercial-context.v1';
  entitled: true;
  liveGtmOutbound: false;
  paidAds: false;
  entitledClientCount: number;
  gcc: Honesty & { count: number };
  copilot: Honesty & { count: number };
  gtm: Honesty & { count: number };
  rows: Array<{
    clientCode: string;
    opportunityId?: string;
    title?: string;
    stage?: string;
    capitalHandoffStatus?: string;
    hasGcc: boolean;
    hasCopilot: boolean;
    hasGtm: boolean;
  }>;
}

export interface CommercialOverlay {
  gccSignals: GccValueSignal[];
  preCallBriefs: PreCallBrief[];
  attributions: PersistedAttribution[];
  copilotAssessments: CopilotAssessment[];
}

export const EMPTY_REASON = {
  gcc: 'No GCC value signal on record. Live GCC dispatch is OFF. Atlas does not invent LTV, renewal, or expansion numbers.',
  copilot:
    'No Agent Copilot assessment or pre-call brief on record. Observation-only; Atlas does not invent MRI results.',
  gtm: 'No GTM attribution or campaign origin on record. Live outbound and paid ads are OFF. Atlas does not invent campaign history.',
} as const;
