/**
 * Atlas Communications product — timeline SoR (seed / repository-derived).
 * Surfaces context and launches Outlook/Teams; does not duplicate M365 clients.
 * No fabricated finances. Jeff Smith / CCB facts from Owner product-build evidence.
 */

export type CommunicationChannel =
  | 'Email'
  | 'Teams'
  | 'Phone'
  | 'In Person'
  | 'Portal'
  | 'Notification'
  | 'Other';

export type CommunicationDirection = 'Inbound' | 'Outbound' | 'Internal';

export type CommunicationPurpose =
  | 'ClientFollowUp'
  | 'MeetingHistory'
  | 'Notification'
  | 'ProjectUpdate'
  | 'ApprovalMessage'
  | 'DocumentRequest'
  | 'RevenueFollowUp'
  | 'ExecutiveBriefing'
  | 'Referral'
  | 'Other';

/** Draft must never be shown as Sent. */
export type CommunicationStatus = 'Draft' | 'PendingApproval' | 'Sent' | 'Recorded' | 'Cancelled';

export interface CommunicationRecord {
  id: string;
  title: string;
  clientCode: string;
  clientName: string;
  workspaceId: string;
  contactId: string | null;
  contactName: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  capitalOpportunityId: string | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  purpose: CommunicationPurpose;
  communicationDate: string;
  followUpDate: string | null;
  ownerEmail: string;
  communicationOwner: string;
  status: CommunicationStatus;
  summary: string;
  emailSummary: string | null;
  meetingSummary: string | null;
  teamsActivityLink: string | null;
  outlookItemLink: string | null;
  attachmentOrDocLinks: string[];
  templateId: string | null;
  requiresFollowUp: boolean;
  approvalRequiredBeforeSend: boolean;
  sendApproved: boolean;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  purpose: CommunicationPurpose;
  channel: CommunicationChannel;
  subject: string;
  bodyPreview: string;
  externalSend: boolean;
  approvalGate: string;
  filePath: string;
}

/** Launch helpers — open Microsoft tools; Atlas never auto-sends. */
export function outlookComposeUrl(opts: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.to) params.set('to', opts.to);
  if (opts.subject) params.set('subject', opts.subject);
  if (opts.body) params.set('body', opts.body);
  const q = params.toString();
  return q ? `https://outlook.office.com/mail/deeplink/compose?${q}` : 'https://outlook.office.com/mail/';
}

export function outlookCalendarUrl(): string {
  return 'https://outlook.office.com/calendar/view/week';
}

export function teamsChatUrl(optionalDeepLink?: string | null): string {
  if (optionalDeepLink) return optionalDeepLink;
  return 'https://teams.microsoft.com/';
}

export function teamsScheduleMeetingUrl(): string {
  return 'https://teams.microsoft.com/_#/scheduling-form/';
}

export const communicationTemplates: CommunicationTemplate[] = [
  {
    id: 'tpl-client-followup',
    name: 'Client follow-up',
    purpose: 'ClientFollowUp',
    channel: 'Email',
    subject: 'Follow-up — {{ClientLegalName}}',
    bodyPreview: 'Thank you for our recent discussion. Next steps and timing…',
    externalSend: true,
    approvalGate: 'OA-EXT-01',
    filePath: 'templates/communications/client-followup.md',
  },
  {
    id: 'tpl-document-request',
    name: 'Document request',
    purpose: 'DocumentRequest',
    channel: 'Email',
    subject: 'Document request — {{ClientLegalName}}',
    bodyPreview: 'Please upload the items below to the secure workspace…',
    externalSend: true,
    approvalGate: 'OA-EXT-01',
    filePath: 'templates/communications/document-request.md',
  },
  {
    id: 'tpl-document-reminder',
    name: 'Document reminder',
    purpose: 'DocumentRequest',
    channel: 'Email',
    subject: 'Reminder — documents for {{ClientLegalName}}',
    bodyPreview: 'Friendly reminder on outstanding checklist items…',
    externalSend: true,
    approvalGate: 'OA-EXT-01',
    filePath: 'templates/communications/document-reminder.md',
  },
  {
    id: 'tpl-project-update',
    name: 'Project update (internal)',
    purpose: 'ProjectUpdate',
    channel: 'Teams',
    subject: 'Project update — {{ProjectName}}',
    bodyPreview: 'Status, blockers, and next milestone…',
    externalSend: false,
    approvalGate: 'Internal',
    filePath: 'templates/communications/project-update.md',
  },
  {
    id: 'tpl-approval-message',
    name: 'Approval request',
    purpose: 'ApprovalMessage',
    channel: 'Teams',
    subject: 'Approval needed — {{ItemTitle}}',
    bodyPreview: 'Please review and Approve / Reject / Hold…',
    externalSend: false,
    approvalGate: 'HVCG_Approvals',
    filePath: 'templates/communications/approval-message.md',
  },
  {
    id: 'tpl-revenue-followup',
    name: 'Revenue / pipeline follow-up',
    purpose: 'RevenueFollowUp',
    channel: 'Email',
    subject: 'Next step on {{OpportunityTitle}}',
    bodyPreview: 'Confirming Blueprint next actions and document intake…',
    externalSend: true,
    approvalGate: 'OA-EXT-01',
    filePath: 'templates/communications/revenue-followup.md',
  },
  {
    id: 'tpl-exec-briefing',
    name: 'Executive briefing (internal)',
    purpose: 'ExecutiveBriefing',
    channel: 'Teams',
    subject: 'Executive briefing — {{ClientLegalName}}',
    bodyPreview: 'Relationship status, open actions, permission-safe summary…',
    externalSend: false,
    approvalGate: 'Internal + Owner if client-external',
    filePath: 'templates/communications/executive-briefing.md',
  },
  {
    id: 'tpl-meeting-followup',
    name: 'Meeting follow-up notes',
    purpose: 'MeetingHistory',
    channel: 'Email',
    subject: 'Notes from {{MeetingTitle}} — {{ClientLegalName}}',
    bodyPreview: 'Attendees, decisions, and follow-up owners…',
    externalSend: true,
    approvalGate: 'OA-EXT-01',
    filePath: 'templates/communications/meeting-followup.md',
  },
  {
    id: 'tpl-notification',
    name: 'Atlas notification (in-app / Teams test)',
    purpose: 'Notification',
    channel: 'Notification',
    subject: 'Atlas update — {{Topic}}',
    bodyPreview: 'Factual status change; test channel only until OA-CRM gate approved.',
    externalSend: false,
    approvalGate: 'OA-CRM-01 / test channel',
    filePath: 'templates/communications/notification.md',
  },
];

/**
 * Colorado Craft Beef — Jeff Smith relationship history for client/opportunity context.
 * Sources: Owner product-build directive + repository relationship facts (no invented $).
 */
export const jeffSmithCcbTimeline: CommunicationRecord[] = [
  {
    id: 'comm-ccb-referral-hvs',
    title: 'Original HVS referral — Generational Group',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Other',
    direction: 'Inbound',
    purpose: 'Referral',
    communicationDate: '2025-11-01T15:00:00Z',
    followUpDate: null,
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Colorado Craft Beef entered via original HVS referral path. Referring organization: Generational Group. Referring advisor: Randy Kamin.',
    emailSummary: null,
    meetingSummary: null,
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: null,
    requiresFollowUp: false,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-randy-continuity',
    title: 'Referral continuity — Randy Kamin (Generational Group)',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Phone',
    direction: 'Internal',
    purpose: 'Referral',
    communicationDate: '2026-03-12T18:00:00Z',
    followUpDate: null,
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Confirmed referral attribution: Randy Kamin — Generational Group remains active referring advisor. No client mailbox content stored.',
    emailSummary: null,
    meetingSummary: null,
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: null,
    requiresFollowUp: false,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-hvs-discussions',
    title: 'Prior HVS discussions — growth capital & real estate',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'In Person',
    direction: 'Outbound',
    purpose: 'MeetingHistory',
    communicationDate: '2026-05-20T16:00:00Z',
    followUpDate: null,
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Prior HVS-era discussions covered growth capital and additional real estate. Financing options discussed included non-dilutive and agricultural paths. Amounts remain pending verification — not stored as figures.',
    emailSummary: null,
    meetingSummary:
      'HVS-context meeting notes (curated): objectives = growth capital + real estate; options explored = non-dilutive / agricultural; no verified facility sizing recorded.',
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: null,
    requiresFollowUp: false,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-transition-hvcg',
    title: 'Transition to HVCG engagement',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Email',
    direction: 'Internal',
    purpose: 'ProjectUpdate',
    communicationDate: '2026-06-15T17:00:00Z',
    followUpDate: null,
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Engagement transitioning from HVS referral context to HVCG Capital Advisory. Primary contact: Jeff Smith. Relationship owner: Manny Barela.',
    emailSummary: 'Internal note only — not an external client send.',
    meetingSummary: null,
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: 'tpl-project-update',
    requiresFollowUp: false,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-hvcg-meeting',
    title: 'Current HVCG meeting — Jeff Smith',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: 'task-ccb-followup-2026-07-26',
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Teams',
    direction: 'Outbound',
    purpose: 'MeetingHistory',
    communicationDate: '2026-07-19T16:00:00Z',
    followUpDate: '2026-07-26',
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Current HVCG working session with Jeff Smith. Agenda: relationship continuity, capital-readiness checklist, Blueprint package. No dollar amounts presented.',
    emailSummary: null,
    meetingSummary:
      'Attendees: Manny Barela, Jeff Smith. Topics: Generational Group continuity (Randy Kamin); growth capital + real estate needs; document intake next. Follow-up due 2026-07-26.',
    teamsActivityLink: 'https://teams.microsoft.com/',
    outlookItemLink: 'https://outlook.office.com/calendar/view/week',
    attachmentOrDocLinks: [],
    templateId: 'tpl-meeting-followup',
    requiresFollowUp: true,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-blueprint',
    title: 'Blueprint presentation',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'In Person',
    direction: 'Outbound',
    purpose: 'RevenueFollowUp',
    communicationDate: '2026-07-19T17:00:00Z',
    followUpDate: '2026-07-26',
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Blueprint engagement stage presented for growth capital and real estate objectives. Opportunity stage = Blueprint. Fee amounts: pending verification (not displayed).',
    emailSummary: null,
    meetingSummary:
      'Blueprint presentation with Jeff Smith. Referral continuity with Generational Group (Randy Kamin) maintained. Next: collect verified financial package.',
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: null,
    requiresFollowUp: true,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-followup-actions',
    title: 'Follow-up actions — document intake & continuity',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: 'task-ccb-followup-2026-07-26',
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Email',
    direction: 'Outbound',
    purpose: 'DocumentRequest',
    communicationDate: '2026-07-19T18:00:00Z',
    followUpDate: '2026-07-26',
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Draft',
    summary:
      'DRAFT follow-up: request entity/formation, financial package, real estate schedule, debt schedule, capital needs brief. Not sent — awaiting Owner approval (OA-EXT-01).',
    emailSummary:
      'Draft only. Subject: Document request — Colorado Craft Beef. Body prepared from document-request template. Contact email pending verified source.',
    meetingSummary: null,
    teamsActivityLink: null,
    outlookItemLink: null,
    attachmentOrDocLinks: [
      'Client library · 21 - Communications (approved folder)',
      'Document checklist · Corporate / Financial / Real Estate / Debt / Capital',
    ],
    templateId: 'tpl-document-request',
    requiresFollowUp: true,
    approvalRequiredBeforeSend: true,
    sendApproved: false,
  },
  {
    id: 'comm-ccb-exec-briefing',
    title: 'Executive briefing — CCB / Jeff Smith',
    clientCode: 'CCB01',
    clientName: 'Colorado Craft Beef',
    workspaceId: 'ws-ccb',
    contactId: 'ct-jeff-smith',
    contactName: 'Jeff Smith',
    opportunityId: 'opp-ccb-blueprint-001',
    opportunityTitle: 'Colorado Craft Beef — Capital Advisory (Blueprint)',
    projectId: 'prj-ccb-capital',
    projectName: 'Colorado Craft Beef — Capital Advisory',
    taskId: null,
    capitalOpportunityId: 'cap-ccb-growth-re',
    channel: 'Teams',
    direction: 'Internal',
    purpose: 'ExecutiveBriefing',
    communicationDate: '2026-07-19T19:00:00Z',
    followUpDate: '2026-07-26',
    ownerEmail: 'manny@highvaluecapitalgroup.com',
    communicationOwner: 'Manny Barela',
    status: 'Recorded',
    summary:
      'Internal executive briefing: Jeff Smith primary contact; Randy Kamin / Generational Group referral; prior HVS discussions; current HVCG Blueprint; open follow-ups for verified financial package. No invented KPIs.',
    emailSummary: null,
    meetingSummary: null,
    teamsActivityLink: 'https://teams.microsoft.com/',
    outlookItemLink: null,
    attachmentOrDocLinks: [],
    templateId: 'tpl-exec-briefing',
    requiresFollowUp: false,
    approvalRequiredBeforeSend: false,
    sendApproved: false,
  },
];

export const communicationCatalog: CommunicationRecord[] = [...jeffSmithCcbTimeline];

export function communicationsForWorkspace(workspaceId: string): CommunicationRecord[] {
  return communicationCatalog
    .filter((c) => c.workspaceId === workspaceId)
    .sort((a, b) => b.communicationDate.localeCompare(a.communicationDate));
}

export function communicationsForContact(contactId: string): CommunicationRecord[] {
  return communicationCatalog
    .filter((c) => c.contactId === contactId)
    .sort((a, b) => b.communicationDate.localeCompare(a.communicationDate));
}

export function isDraftStatus(status: CommunicationStatus): boolean {
  return status === 'Draft' || status === 'PendingApproval';
}
