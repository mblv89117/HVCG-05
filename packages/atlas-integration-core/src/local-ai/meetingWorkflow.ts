/**
 * Meeting workflow draft schemas — before/after meeting (Phase 3).
 * Follow-up email drafts are internal only; never sent.
 */

export interface MeetingBriefDraft {
  schemaVersion: '1.0.0-phase3';
  kind: 'before_meeting';
  meetingObjective: string;
  backgroundSummary: string;
  currentProjects: string[];
  openCommitments: string[];
  missingDocuments: string[];
  risks: string[];
  decisionsRequired: string[];
  recommendedTalkingPoints: string[];
  agenda: string[];
  draftOnly: true;
  atlasUpdatesSuggested: string[];
}

export interface MeetingOutcomesDraft {
  schemaVersion: '1.0.0-phase3';
  kind: 'after_meeting';
  summary: string;
  decisions: string[];
  tasks: string[];
  owners: string[];
  deadlines: string[];
  clientCommitments: string[];
  hvcgCommitments: string[];
  unresolvedIssues: string[];
  followUpEmailDraft: string;
  suggestedAtlasUpdates: string[];
  draftOnly: true;
  /** Must remain false — never auto-update Atlas. */
  atlasRecordsUpdated: false;
}

export function emptyMeetingBrief(): MeetingBriefDraft {
  return {
    schemaVersion: '1.0.0-phase3',
    kind: 'before_meeting',
    meetingObjective: '',
    backgroundSummary: '',
    currentProjects: [],
    openCommitments: [],
    missingDocuments: [],
    risks: [],
    decisionsRequired: [],
    recommendedTalkingPoints: [],
    agenda: [],
    draftOnly: true,
    atlasUpdatesSuggested: [],
  };
}

export function emptyMeetingOutcomes(): MeetingOutcomesDraft {
  return {
    schemaVersion: '1.0.0-phase3',
    kind: 'after_meeting',
    summary: '',
    decisions: [],
    tasks: [],
    owners: [],
    deadlines: [],
    clientCommitments: [],
    hvcgCommitments: [],
    unresolvedIssues: [],
    followUpEmailDraft: 'TEST — SYNTHETIC AI OUTPUT — DO NOT SEND',
    suggestedAtlasUpdates: [],
    draftOnly: true,
    atlasRecordsUpdated: false,
  };
}

export function extractMeetingHintsFromText(text: string): {
  missingDocuments: string[];
  risks: string[];
  deadlines: string[];
} {
  const missingDocuments: string[] = [];
  const risks: string[] = [];
  const deadlines: string[] = [];
  if (/\bmissing\b/i.test(text) || /\bneed(?:s)?\b.*\b(doc|statement|tax)/i.test(text)) {
    missingDocuments.push('Document gaps referenced in notes');
  }
  if (/\brisk|concern|delay|gap\b/i.test(text)) {
    risks.push('Risk language detected in notes');
  }
  if (/\bdeadline|due|by friday|eod\b/i.test(text)) {
    deadlines.push('Deadline language detected in notes');
  }
  return { missingDocuments, risks, deadlines };
}
