// Dataverse schema definitions for the Project Atlas Command Center (Development/UAT).
// Data-driven: provision-schema.js walks these definitions to create tables + columns.
import { label } from './dv.js';

export const PREFIX = 'hvcg';
export const SOLUTION_UNIQUE = 'HVCGProjectAtlasCommandCenterDEV';
export const SOLUTION_FRIENDLY = 'HVCG Project Atlas Command Center (DEV)';

// ---- column builders -------------------------------------------------------
const req = (v) => ({ Value: v }); // RequiredLevel

export const S = (schema, display, { max = 200, required = 'None', primary = false } = {}) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
  SchemaName: schema,
  RequiredLevel: req(required),
  MaxLength: max,
  FormatName: { Value: 'Text' },
  DisplayName: label(display),
  ...(primary ? { IsPrimaryName: true } : {}),
});

export const M = (schema, display, { max = 4000 } = {}) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
  SchemaName: schema,
  RequiredLevel: req('None'),
  MaxLength: max,
  Format: 'TextArea',
  DisplayName: label(display),
});

export const I = (schema, display) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
  SchemaName: schema,
  RequiredLevel: req('None'),
  DisplayName: label(display),
});

export const DT = (schema, display, dateOnly = false) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
  SchemaName: schema,
  Format: dateOnly ? 'DateOnly' : 'DateAndTime',
  RequiredLevel: req('None'),
  DisplayName: label(display),
});

export const B = (schema, display, trueLabel = 'Yes', falseLabel = 'No') => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
  SchemaName: schema,
  RequiredLevel: req('None'),
  DisplayName: label(display),
  OptionSet: {
    '@odata.type': 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',
    TrueOption: { Value: 1, Label: label(trueLabel) },
    FalseOption: { Value: 0, Label: label(falseLabel) },
  },
});

// Local picklist. options: array of strings (values auto-assigned from 1).
export const C = (schema, display, options) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
  SchemaName: schema,
  RequiredLevel: req('None'),
  DisplayName: label(display),
  OptionSet: {
    '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
    IsGlobal: false,
    OptionSetType: 'Picklist',
    Options: options.map((o, i) => ({ Value: (i + 1) * 100000000 + 1, Label: label(o) })),
  },
});

// shared choice value lists
const SRC = ['Repository-derived', 'Development sample', 'Live', 'Unavailable'];
const ENV = ['Production', 'Development', 'Staging', 'Development/UAT', 'None'];
const HEALTH = ['Green', 'Yellow', 'Red'];
const SEV = ['Low', 'Medium', 'High', 'Critical'];

const source = () => C(`${PREFIX}_datasource`, 'Data Source', SRC);
const env = () => C(`${PREFIX}_environment`, 'Environment', ENV);
const health = () => C(`${PREFIX}_health`, 'Health', HEALTH);

// ---- tables ----------------------------------------------------------------
export const TABLES = [
  {
    schema: `${PREFIX}_atlastrack`,
    display: 'Atlas Track',
    plural: 'Atlas Tracks',
    description: 'Portfolio tracks (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Track Name', { required: 'ApplicationRequired', primary: true }),
      I(`${PREFIX}_tracknumber`, 'Track Number'),
      C(`${PREFIX}_status`, 'Status', ['Not Started', 'In Development', 'Active Development', 'Gated', 'Waiting for QA', 'Waiting for Owner', 'Complete', 'Frozen']),
      S(`${PREFIX}_currentsprint`, 'Current Sprint'),
      S(`${PREFIX}_owner`, 'Owner'),
      S(`${PREFIX}_assignedagent`, 'Assigned Agent'),
      env(),
      S(`${PREFIX}_qastatus`, 'QA Status'),
      S(`${PREFIX}_deploymentstatus`, 'Deployment Status'),
      M(`${PREFIX}_blockers`, 'Blockers'),
      M(`${PREFIX}_nextaction`, 'Next Action'),
      health(),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlassprint`,
    display: 'Atlas Sprint',
    plural: 'Atlas Sprints',
    description: 'Sprints across tracks (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Sprint Name', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_track`, 'Track'),
      C(`${PREFIX}_stage`, 'Stage', ['Planned', 'Assigned', 'In Progress', 'Waiting for QA', 'Waiting for Owner', 'Ready for Release', 'Complete']),
      M(`${PREFIX}_objective`, 'Objective'),
      M(`${PREFIX}_deliverables`, 'Deliverables'),
      S(`${PREFIX}_branch`, 'Branch'),
      S(`${PREFIX}_worktree`, 'Worktree'),
      S(`${PREFIX}_tests`, 'Tests'),
      S(`${PREFIX}_qaresult`, 'QA Result'),
      M(`${PREFIX}_risks`, 'Risks'),
      M(`${PREFIX}_technicaldebt`, 'Technical Debt'),
      S(`${PREFIX}_releasereadiness`, 'Release Readiness'),
      health(),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasagent`,
    display: 'Atlas Agent',
    plural: 'Atlas Agents',
    description: 'Agent roster and status (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Agent Name', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_role`, 'Role'),
      S(`${PREFIX}_track`, 'Track'),
      S(`${PREFIX}_sprint`, 'Sprint'),
      M(`${PREFIX}_assignment`, 'Current Assignment'),
      C(`${PREFIX}_status`, 'Status', ['Idle', 'Assigned', 'Working', 'Blocked', 'Waiting for QA', 'Waiting for Owner', 'Ready for Release', 'Complete']),
      DT(`${PREFIX}_lastupdate`, 'Last Update'),
      M(`${PREFIX}_blocker`, 'Blocker'),
      S(`${PREFIX}_branch`, 'Branch'),
      S(`${PREFIX}_worktree`, 'Worktree'),
      S(`${PREFIX}_qastate`, 'QA State'),
      S(`${PREFIX}_owneraction`, 'Owner Action Needed'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasapproval`,
    display: 'Atlas Approval',
    plural: 'Atlas Approvals',
    description: 'Owner approval inbox (Development/UAT sample data).',
    hasNotes: true,
    attributes: [
      S(`${PREFIX}_name`, 'Title', { required: 'ApplicationRequired', primary: true }),
      C(`${PREFIX}_approvaltype`, 'Approval Type', ['Sprint start', 'QA acceptance', 'Commit and push', 'Release', 'Deployment', 'Change Request', 'Pricing', 'Proposal', 'Client communication', 'Portal invitation']),
      M(`${PREFIX}_businessreason`, 'Business Reason'),
      M(`${PREFIX}_requestedaction`, 'Requested Action'),
      S(`${PREFIX}_requester`, 'Requested By'),
      C(`${PREFIX}_risk`, 'Risk', SEV),
      M(`${PREFIX}_impact`, 'Impact'),
      S(`${PREFIX}_track`, 'Track'),
      env(),
      S(`${PREFIX}_qastatus`, 'QA Status'),
      M(`${PREFIX}_recommendation`, 'Recommendation'),
      C(`${PREFIX}_decision`, 'Decision', ['Pending', 'Approved', 'Rejected', 'Changes requested']),
      M(`${PREFIX}_ownernotes`, 'Owner Notes'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlaschangerequest`,
    display: 'Atlas Change Request',
    plural: 'Atlas Change Requests',
    description: 'Owner-submitted change requests (Development/UAT sample data).',
    hasNotes: true,
    attributes: [
      S(`${PREFIX}_name`, 'Title', { required: 'ApplicationRequired', primary: true }),
      M(`${PREFIX}_businessreason`, 'Business Reason'),
      M(`${PREFIX}_requestedoutcome`, 'Requested Outcome'),
      C(`${PREFIX}_priority`, 'Priority', ['Low', 'Medium', 'High', 'Urgent']),
      S(`${PREFIX}_affectedtrack`, 'Affected Track'),
      S(`${PREFIX}_affectedmodule`, 'Affected Module'),
      C(`${PREFIX}_risk`, 'Risk', SEV),
      DT(`${PREFIX}_desireddate`, 'Desired Date', true),
      M(`${PREFIX}_notes`, 'Notes'),
      C(`${PREFIX}_status`, 'Status', ['Draft', 'Submitted', 'In Review', 'Approved', 'Rejected', 'Deferred']),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasrisk`,
    display: 'Atlas Risk',
    plural: 'Atlas Risks',
    description: 'Portfolio risks (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Risk', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_track`, 'Track'),
      C(`${PREFIX}_severity`, 'Severity', SEV),
      C(`${PREFIX}_status`, 'Status', ['Open', 'Mitigating', 'Closed']),
      M(`${PREFIX}_mitigation`, 'Mitigation'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasblocker`,
    display: 'Atlas Blocker',
    plural: 'Atlas Blockers',
    description: 'Active blockers (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Blocker', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_track`, 'Track'),
      C(`${PREFIX}_severity`, 'Severity', SEV),
      C(`${PREFIX}_status`, 'Status', ['Open', 'In Progress', 'Resolved']),
      M(`${PREFIX}_resolution`, 'Resolution / Owner Action'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlastechnicaldebt`,
    display: 'Atlas Technical Debt',
    plural: 'Atlas Technical Debt Items',
    description: 'Tracked technical debt (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Item', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_track`, 'Track'),
      C(`${PREFIX}_severity`, 'Severity', SEV),
      C(`${PREFIX}_status`, 'Status', ['Open', 'Accepted', 'Closed']),
      M(`${PREFIX}_details`, 'Details'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasrelease`,
    display: 'Atlas Release',
    plural: 'Atlas Releases',
    description: 'Release / deployment tracking (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Release', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_track`, 'Track'),
      C(`${PREFIX}_status`, 'Status', ['Draft', 'Candidate', 'Released', 'Deployed', 'Rolled back']),
      env(),
      S(`${PREFIX}_commit`, 'Commit / Tag'),
      S(`${PREFIX}_qaresult`, 'QA Result'),
      S(`${PREFIX}_deploymentgate`, 'Deployment Gate'),
      B(`${PREFIX}_rollbackavailable`, 'Rollback Available'),
      DT(`${PREFIX}_releasedate`, 'Release Date', true),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasuatfeedback`,
    display: 'Atlas UAT Feedback',
    plural: 'Atlas UAT Feedback',
    description: 'Owner UAT feedback (Development/UAT).',
    hasNotes: true,
    attributes: [
      S(`${PREFIX}_name`, 'Summary', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_screen`, 'Screen'),
      C(`${PREFIX}_feedbacktype`, 'Feedback Type', ['Bug', 'Enhancement', 'Question', 'Praise']),
      C(`${PREFIX}_severity`, 'Severity', SEV),
      M(`${PREFIX}_expectedbehavior`, 'Expected Behavior'),
      M(`${PREFIX}_actualbehavior`, 'Actual Behavior'),
      M(`${PREFIX}_suggestion`, 'Suggestion'),
      C(`${PREFIX}_status`, 'Status', ['New', 'Triaged', 'In Progress', 'Resolved', 'Closed']),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasbrief`,
    display: 'Atlas Executive Brief',
    plural: 'Atlas Executive Briefs',
    description: 'Daily executive brief (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Title', { required: 'ApplicationRequired', primary: true }),
      DT(`${PREFIX}_briefdate`, 'Brief Date', true),
      M(`${PREFIX}_whatchanged`, 'What Changed'),
      M(`${PREFIX}_needsdecision`, 'Needs Your Decision'),
      M(`${PREFIX}_blocked`, 'Blocked'),
      M(`${PREFIX}_atrisk`, 'At Risk'),
      M(`${PREFIX}_readyforqa`, 'Ready for QA'),
      M(`${PREFIX}_readyforrelease`, 'Ready for Release'),
      M(`${PREFIX}_topactions`, 'Top Actions Today'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasrevenuekpi`,
    display: 'Atlas Revenue KPI',
    plural: 'Atlas Revenue KPIs',
    description: 'Revenue summary metrics (Development/UAT sample data).',
    attributes: [
      S(`${PREFIX}_name`, 'Metric', { required: 'ApplicationRequired', primary: true }),
      S(`${PREFIX}_value`, 'Value'),
      S(`${PREFIX}_unit`, 'Unit'),
      S(`${PREFIX}_trend`, 'Trend'),
      S(`${PREFIX}_period`, 'Period'),
      M(`${PREFIX}_notes`, 'Notes'),
      source(),
    ],
  },
  {
    schema: `${PREFIX}_atlasdatasource`,
    display: 'Atlas Data Source',
    plural: 'Atlas Data Sources',
    description: 'Data provenance registry (Development/UAT).',
    attributes: [
      S(`${PREFIX}_name`, 'Source Name', { required: 'ApplicationRequired', primary: true }),
      C(`${PREFIX}_sourcetype`, 'Source Type', SRC),
      DT(`${PREFIX}_lastupdated`, 'Last Updated'),
      C(`${PREFIX}_freshness`, 'Freshness', ['Fresh', 'Aging', 'Stale', 'Unknown']),
      env(),
      M(`${PREFIX}_details`, 'Details'),
    ],
  },
];
