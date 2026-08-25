/**
 * First-class workflow templates — governed catalog over the live definition model.
 * Templates instantiate drafts; they do not execute directly.
 */

import { randomUUID } from 'node:crypto';
import type {
  WorkflowActionDefinition,
  WorkflowConditionDefinition,
  WorkflowPolicyClass,
  WorkflowTriggerDefinition,
} from './workflowDefinitions.ts';

export const WORKFLOW_TEMPLATES_MISSION_KEY = 'ATLAS-WORKFLOW-TEMPLATES-001' as const;
export const WORKFLOW_TEMPLATES_CONTRACT = 'atlas-hub-workflow-templates.v1' as const;

export type WorkflowTemplateStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'DISABLED';

export type WorkflowTemplateInput = {
  id: string;
  label: string;
  inputType: 'client' | 'number' | 'schedule' | 'text' | 'boolean';
  required: boolean;
  defaultValue?: string | number;
  description?: string;
};

export type WorkflowTemplateDefinition = {
  templateId: string;
  templateVersion: number;
  name: string;
  description: string;
  category: string;
  businessPurpose: string;
  status: WorkflowTemplateStatus;
  defaultScopeType: 'organization' | 'client' | 'project' | 'capital';
  supportedScopeTypes: Array<'organization' | 'client' | 'project' | 'capital'>;
  defaultTrigger: WorkflowTriggerDefinition;
  configurableTrigger: boolean;
  defaultConditions: WorkflowConditionDefinition[];
  configurableConditions: boolean;
  defaultActions: WorkflowActionDefinition[];
  configurableActions: boolean;
  requiredInputs: WorkflowTemplateInput[];
  optionalInputs: WorkflowTemplateInput[];
  policyClassifications: WorkflowPolicyClass[];
  approvalRequirements: string[];
  retryPolicy: string;
  failurePolicy: string;
  recommendedAutonomy: string;
  relatedSystems: string[];
  provenance: string;
  createdAt: string;
  updatedAt: string;
  configurableFields: string[];
  ownerReadableSummary: {
    purpose: string;
    whenItRuns: string;
    whatItDoes: string[];
    customizable: string[];
    automatic: string[];
    requiresApproval: string[];
    systems: string[];
    onFailure: string;
    dataScope: string;
  };
};

function action(
  order: number,
  actionType: string,
  description: string,
  policyClass: WorkflowPolicyClass,
): WorkflowActionDefinition {
  return {
    id: randomUUID(),
    order,
    actionType,
    policyClass,
    description,
    supported: true,
  };
}

const TEMPLATE_BASE = '2026-08-25T00:00:00.000Z';

export const WORKFLOW_TEMPLATE_CATALOG: WorkflowTemplateDefinition[] = [
  {
    templateId: 'client_onboarding',
    templateVersion: 1,
    name: 'Client Onboarding',
    description: 'Structured onboarding when a client is governed as activated.',
    category: 'Client Operations',
    businessPurpose: 'Convert a newly activated client into an operational Atlas workspace.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client', 'organization'],
    defaultTrigger: {
      type: 'event',
      event: 'CLIENT_ACTIVATED',
      originalLanguage: 'when client is activated',
    },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'verify_client_identity', 'Verify client identity from entitled evidence', 'READ_AUTO'),
      action(2, 'reconcile_client_workspace', 'Create or reconcile client workspace', 'INTERNAL_WRITE_AUTO'),
      action(3, 'identify_required_documents', 'Identify required onboarding documents', 'READ_AUTO'),
      action(4, 'identify_missing_information', 'Surface missing onboarding information', 'READ_AUTO'),
      action(5, 'create_onboarding_tasks', 'Create onboarding tasks and milestones', 'INTERNAL_WRITE_AUTO'),
      action(6, 'assign_responsible_agents', 'Establish assigned agents from policy', 'INTERNAL_WRITE_AUTO'),
      action(7, 'notify_owner_blockers', 'Notify owner of onboarding blockers', 'REQUIRE_APPROVAL'),
      action(8, 'prepare_kickoff_materials', 'Prepare kickoff materials (no auto outbound)', 'DRAFT_ONLY'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'DRAFT_ONLY', 'REQUIRE_APPROVAL'],
    approvalRequirements: ['send_external_message', 'activate_client'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'INTERNAL_WRITE_AUTO',
    relatedSystems: ['sharepoint', 'atlas-onboarding'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'trigger'],
    ownerReadableSummary: {
      purpose: 'Onboard a newly activated client with tasks, documents, and milestones.',
      whenItRuns: 'When a client is activated or when you start onboarding manually.',
      whatItDoes: [
        'Verifies identity and workspace',
        'Identifies required and missing documents',
        'Creates onboarding tasks and milestones',
        'Surfaces blockers to you — does not auto-send client email',
      ],
      customizable: ['Client', 'Trigger timing'],
      automatic: ['Internal task creation', 'Document gap analysis'],
      requiresApproval: ['Outbound onboarding messages', 'Client activation commits'],
      systems: ['SharePoint', 'Atlas onboarding'],
      onFailure: 'Surfaces in Workflow Center and owner attention.',
      dataScope: 'Entitled client only',
    },
  },
  {
    templateId: 'document_collection',
    templateVersion: 1,
    name: 'Document Collection',
    description: 'Track required documents and surface missing items.',
    category: 'Documents',
    businessPurpose: 'Reconcile required documents against authorized M365/Atlas sources.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client', 'project', 'capital'],
    defaultTrigger: { type: 'manual', manual: true, originalLanguage: 'manual or project start' },
    configurableTrigger: true,
    defaultConditions: [
      {
        id: randomUUID(),
        expression: 'missing_required_documents = true',
        originalLanguage: 'documents still missing',
      },
    ],
    configurableConditions: true,
    defaultActions: [
      action(1, 'establish_document_checklist', 'Establish required document checklist', 'READ_AUTO'),
      action(2, 'reconcile_m365_documents', 'Reconcile documents from entitled M365 sources', 'READ_AUTO'),
      action(3, 'mark_confirmed_received', 'Mark confirmed received items with provenance', 'INTERNAL_WRITE_AUTO'),
      action(4, 'identify_missing_documents', 'Identify missing items', 'READ_AUTO'),
      action(5, 'create_followup_task', 'Create internal follow-up task', 'INTERNAL_WRITE_AUTO'),
      action(6, 'draft_document_request', 'Draft document request for owner review', 'DRAFT_ONLY'),
      action(7, 'escalate_overdue_missing', 'Escalate overdue missing items to owner', 'REQUIRE_APPROVAL'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [
      { id: 'projectScope', label: 'Project', inputType: 'text', required: false, description: 'Optional project scope' },
    ],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'DRAFT_ONLY', 'REQUIRE_APPROVAL'],
    approvalRequirements: ['send_external_message'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'READ_AUTO',
    relatedSystems: ['m365-fabric', 'sharepoint'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'project', 'trigger'],
    ownerReadableSummary: {
      purpose: 'Track required documents and missing items for a client or project.',
      whenItRuns: 'Manual start, project kickoff, or missing-document state.',
      whatItDoes: [
        'Builds checklist from policy',
        'Reconciles M365/Atlas document evidence',
        'Creates follow-up tasks and optional draft requests',
      ],
      customizable: ['Client', 'Project', 'Trigger'],
      automatic: ['Document reconciliation', 'Missing-item detection'],
      requiresApproval: ['Sending document requests to clients'],
      systems: ['M365 fabric', 'SharePoint'],
      onFailure: 'Escalates to Workflow Center.',
      dataScope: 'Entitled client/project documents only',
    },
  },
  {
    templateId: 'capital_submission_preparation',
    templateVersion: 1,
    name: 'Capital Submission Preparation',
    description: 'Prepare a governed Capital package for owner review before any external submit.',
    category: 'Capital',
    businessPurpose: 'Accelerate Capital prep while external lender/investor submit stays owner-gated.',
    status: 'ACTIVE',
    defaultScopeType: 'capital',
    supportedScopeTypes: ['capital', 'client'],
    defaultTrigger: { type: 'manual', manual: true, originalLanguage: 'manual or package update' },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'gather_capital_documents', 'Gather entitled Capital documents', 'READ_AUTO'),
      action(2, 'reconcile_borrower_info', 'Reconcile borrower/business information', 'READ_AUTO'),
      action(3, 'identify_capital_gaps', 'Identify missing Capital items', 'READ_AUTO'),
      action(4, 'analyze_financial_package', 'Analyze financial package (no invented amounts)', 'PREPARE_ONLY'),
      action(5, 'compare_lender_criteria', 'Compare criteria where research is authorized', 'PREPARE_ONLY'),
      action(6, 'prepare_submission_package', 'Prepare submission package for owner review', 'PREPARE_ONLY'),
      action(7, 'owner_review_capital_submit', 'Queue owner-gated external submission action', 'OWNER_GATED'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Capital client', inputType: 'client', required: true }],
    optionalInputs: [],
    policyClassifications: ['READ_AUTO', 'PREPARE_ONLY', 'OWNER_GATED'],
    approvalRequirements: ['external_lender_submit', 'external_investor_submit'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'PREPARE_ONLY',
    relatedSystems: ['atlas-capital', 'sharepoint'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'trigger'],
    ownerReadableSummary: {
      purpose: 'Prepare Capital submission packages without automatic external send.',
      whenItRuns: 'Manual, new Capital request, or financial package update.',
      whatItDoes: [
        'Gathers and reconciles Capital documents',
        'Analyzes and compares with honest provenance',
        'Prepares owner review package',
      ],
      customizable: ['Capital client', 'Trigger'],
      automatic: ['Ingest, analyze, compare, draft, prepare'],
      requiresApproval: ['External lender/investor submission', 'Guarantees', 'Money movement'],
      systems: ['Atlas Capital', 'SharePoint'],
      onFailure: 'Surfaces in Workflow Center; never invents funding outcomes.',
      dataScope: 'Entitled Capital client/matter only',
    },
  },
  {
    templateId: 'client_follow_up',
    templateVersion: 1,
    name: 'Client Follow-Up',
    description: 'Follow up when a client has not responded within a governed period.',
    category: 'Communications',
    businessPurpose: 'Create governed reminders and draft follow-ups without auto-send.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client', 'project'],
    defaultTrigger: {
      type: 'threshold',
      event: 'NO_REPLY_THRESHOLD',
      originalLanguage: 'no reply threshold',
    },
    configurableTrigger: true,
    defaultConditions: [
      {
        id: randomUUID(),
        expression: 'no_reply_days >= 3',
        originalLanguage: 'no reply for 3 days',
      },
    ],
    configurableConditions: true,
    defaultActions: [
      action(1, 'detect_no_reply', 'Detect no-reply from entitled communications evidence', 'READ_AUTO'),
      action(2, 'create_followup_reminder', 'Create owner follow-up reminder', 'INTERNAL_WRITE_AUTO'),
      action(3, 'draft_followup_message', 'Draft follow-up message for owner review', 'DRAFT_ONLY'),
      action(4, 'escalate_overdue_followup', 'Escalate if threshold exceeded', 'REQUIRE_APPROVAL'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [
      {
        id: 'followUpDays',
        label: 'Follow up after how many days?',
        inputType: 'number',
        required: false,
        defaultValue: 3,
      },
    ],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'DRAFT_ONLY', 'REQUIRE_APPROVAL'],
    approvalRequirements: ['send_external_message'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'DRAFT_ONLY',
    relatedSystems: ['m365-fabric', 'atlas-communications'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'followUpDays', 'trigger'],
    ownerReadableSummary: {
      purpose: 'Remind you when a client has not responded and draft a follow-up.',
      whenItRuns: 'After configured days without reply.',
      whatItDoes: ['Detects no-reply', 'Creates reminder', 'Drafts message — never auto-sends'],
      customizable: ['Client', 'Days without reply'],
      automatic: ['No-reply detection', 'Internal reminders'],
      requiresApproval: ['Sending follow-up to client'],
      systems: ['M365 mail', 'Atlas communications'],
      onFailure: 'Escalates to owner attention.',
      dataScope: 'Entitled client communications only',
    },
  },
  {
    templateId: 'project_milestone',
    templateVersion: 1,
    name: 'Project Milestone',
    description: 'Monitor milestones, due dates, and blockers for a project.',
    category: 'Projects',
    businessPurpose: 'Surface approaching/overdue milestones from entitled project data.',
    status: 'ACTIVE',
    defaultScopeType: 'project',
    supportedScopeTypes: ['project', 'client'],
    defaultTrigger: { type: 'schedule', schedule: 'daily_08:00_local_preview', scheduleHuman: 'Daily review', originalLanguage: 'daily' },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: true,
    defaultActions: [
      action(1, 'scan_milestone_dates', 'Scan milestone dates from entitled PM data', 'READ_AUTO'),
      action(2, 'detect_overdue_milestone', 'Detect overdue or approaching milestones', 'READ_AUTO'),
      action(3, 'identify_prerequisites', 'Identify incomplete prerequisites', 'READ_AUTO'),
      action(4, 'notify_responsible_internal', 'Notify responsible party internally', 'INTERNAL_WRITE_AUTO'),
      action(5, 'create_owner_attention', 'Create owner attention for blockers', 'REQUIRE_APPROVAL'),
      action(6, 'draft_external_followup', 'Draft external follow-up if permitted', 'DRAFT_ONLY'),
    ],
    configurableActions: false,
    requiredInputs: [
      { id: 'clientCode', label: 'Client', inputType: 'client', required: true },
      { id: 'projectScope', label: 'Project', inputType: 'text', required: false },
    ],
    optionalInputs: [],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'DRAFT_ONLY', 'REQUIRE_APPROVAL'],
    approvalRequirements: ['send_external_message'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'READ_AUTO',
    relatedSystems: ['sharepoint-pm', 'atlas-hub'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'project', 'schedule'],
    ownerReadableSummary: {
      purpose: 'Track project milestones and blockers without inventing deadlines.',
      whenItRuns: 'Daily or on milestone state change.',
      whatItDoes: ['Scans milestones', 'Detects overdue items', 'Creates internal notifications'],
      customizable: ['Client', 'Project', 'Schedule'],
      automatic: ['Milestone scan', 'Internal notifications'],
      requiresApproval: ['External milestone follow-up'],
      systems: ['SharePoint PM', 'Atlas'],
      onFailure: 'Logged in Workflow Center.',
      dataScope: 'Entitled project/client',
    },
  },
  {
    templateId: 'marketing_review',
    templateVersion: 1,
    name: 'Marketing Review',
    description: 'Daily marketing intelligence review (Google Ads, CallRail, CMO) without live campaign mutation.',
    category: 'Marketing',
    businessPurpose: 'Hart-style marketing review using production read paths.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client'],
    defaultTrigger: {
      type: 'schedule',
      schedule: 'daily_08:00_local_preview',
      scheduleHuman: 'Every day at 8:00 AM (confirm before activation)',
      originalLanguage: 'every morning',
    },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'google_ads_metrics_sync', 'Sync Google Ads metrics (read-only)', 'READ_AUTO'),
      action(2, 'callrail_reconcile', 'Reconcile CallRail attribution', 'INTERNAL_WRITE_AUTO'),
      action(3, 'evaluate_location_performance', 'Evaluate location performance', 'READ_AUTO'),
      action(4, 'cmo_analysis', 'Run CMO analysis on persisted metrics', 'RECOMMEND_AUTO'),
      action(5, 'marketing_recommendation', 'Generate recommendation (no auto spend)', 'RECOMMEND_AUTO'),
      action(6, 'owner_approval_spend_change', 'Owner approval for material budget changes', 'OWNER_GATED'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [
      {
        id: 'scheduleTime',
        label: 'Review time',
        inputType: 'schedule',
        required: false,
        defaultValue: '08:00',
        description: 'Local time for daily review',
      },
    ],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'RECOMMEND_AUTO', 'OWNER_GATED'],
    approvalRequirements: ['material_budget_change', 'new_paid_campaign_launch'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'RECOMMEND_AUTO',
    relatedSystems: ['360-growth-solution', 'google-ads', 'callrail'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'scheduleTime'],
    ownerReadableSummary: {
      purpose: 'Daily marketing review with Hart production Google Ads / CallRail / CMO stack.',
      whenItRuns: 'Daily scheduled review (default 8:00 AM local preview).',
      whatItDoes: [
        'Syncs Google Ads metrics',
        'Reconciles CallRail',
        'Runs CMO analysis and recommendations',
        'Never mutates live campaigns during template use',
      ],
      customizable: ['Client (e.g. Hart)', 'Daily review time'],
      automatic: ['Reporting', 'Analysis', 'Recommendations'],
      requiresApproval: ['Material budget changes', 'New paid campaign launch'],
      systems: ['360 Growth Solution', 'Google Ads', 'CallRail'],
      onFailure: 'Surfaces in Workflow Center.',
      dataScope: 'Entitled marketing client only',
    },
  },
  {
    templateId: 'client_support_escalation',
    templateVersion: 1,
    name: 'Client Support Escalation',
    description: 'Classify inbound support requests and route with evidence-backed urgency.',
    category: 'Support',
    businessPurpose: 'Support escalation without inventing emergency status.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client', 'project'],
    defaultTrigger: { type: 'event', event: 'EMAIL_RECEIVED', originalLanguage: 'inbound communication' },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'classify_support_request', 'Classify request from entitled evidence', 'READ_AUTO'),
      action(2, 'attach_client_context', 'Attach client context', 'READ_AUTO'),
      action(3, 'summarize_issue', 'Summarize issue for owner', 'READ_AUTO'),
      action(4, 'route_to_owner_agent', 'Route to appropriate owner/agent', 'INTERNAL_WRITE_AUTO'),
      action(5, 'draft_support_response', 'Draft response where permitted', 'DRAFT_ONLY'),
      action(6, 'track_resolution', 'Track response and resolution state', 'INTERNAL_WRITE_AUTO'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'DRAFT_ONLY', 'REQUIRE_APPROVAL'],
    approvalRequirements: ['send_external_message'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'DRAFT_ONLY',
    relatedSystems: ['m365-fabric', 'atlas-support'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'trigger'],
    ownerReadableSummary: {
      purpose: 'Escalate client support with context and draft responses.',
      whenItRuns: 'Inbound communication classified as needing attention.',
      whatItDoes: ['Classifies', 'Summarizes', 'Routes', 'Drafts — no auto-send'],
      customizable: ['Client'],
      automatic: ['Classification', 'Context attachment'],
      requiresApproval: ['Sending support responses'],
      systems: ['M365', 'Atlas support'],
      onFailure: 'Owner attention item.',
      dataScope: 'Entitled client only',
    },
  },
  {
    templateId: 'renewal_expansion',
    templateVersion: 1,
    name: 'Renewal / Expansion',
    description: 'Prepare renewal and expansion briefings without changing contracts.',
    category: 'Commercial',
    businessPurpose: 'Surface renewal opportunities from entitled engagement evidence.',
    status: 'ACTIVE',
    defaultScopeType: 'client',
    supportedScopeTypes: ['client'],
    defaultTrigger: { type: 'schedule', schedule: 'monthly_local_preview', scheduleHuman: 'Monthly review', originalLanguage: 'monthly' },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'summarize_delivered_value', 'Summarize delivered value from evidence', 'READ_AUTO'),
      action(2, 'identify_open_issues', 'Identify unresolved issues', 'READ_AUTO'),
      action(3, 'review_engagement_status', 'Review engagement status', 'READ_AUTO'),
      action(4, 'surface_expansion_signal', 'Surface expansion opportunity signals', 'RECOMMEND_AUTO'),
      action(5, 'prepare_renewal_briefing', 'Prepare owner renewal briefing', 'PREPARE_ONLY'),
    ],
    configurableActions: false,
    requiredInputs: [{ id: 'clientCode', label: 'Client', inputType: 'client', required: true }],
    optionalInputs: [],
    policyClassifications: ['READ_AUTO', 'RECOMMEND_AUTO', 'PREPARE_ONLY'],
    approvalRequirements: ['contract_change', 'pricing_change'],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'PREPARE_ONLY',
    relatedSystems: ['sharepoint', 'atlas-commercial'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['client', 'schedule'],
    ownerReadableSummary: {
      purpose: 'Prepare renewal/expansion briefings — no automatic contract changes.',
      whenItRuns: 'Contract milestone, anniversary, or scheduled review.',
      whatItDoes: ['Summarizes value', 'Identifies issues', 'Prepares briefing'],
      customizable: ['Client', 'Schedule'],
      automatic: ['Evidence-based summaries'],
      requiresApproval: ['Contract or pricing changes'],
      systems: ['SharePoint', 'Atlas commercial'],
      onFailure: 'Workflow Center visibility.',
      dataScope: 'Entitled client only',
    },
  },
  {
    templateId: 'research_refresh',
    templateVersion: 1,
    name: 'Research Refresh',
    description: 'Refresh stale lender/vendor/industry intelligence with source provenance.',
    category: 'Research',
    businessPurpose: 'Update research records without web content becoming execution authority.',
    status: 'ACTIVE',
    defaultScopeType: 'organization',
    supportedScopeTypes: ['organization', 'client', 'capital'],
    defaultTrigger: { type: 'schedule', schedule: 'weekly_local_preview', scheduleHuman: 'Weekly refresh', originalLanguage: 'weekly' },
    configurableTrigger: true,
    defaultConditions: [],
    configurableConditions: false,
    defaultActions: [
      action(1, 'identify_stale_research', 'Identify stale intelligence records', 'READ_AUTO'),
      action(2, 'research_authorized_sources', 'Research authorized sources only', 'READ_AUTO'),
      action(3, 'compare_prior_version', 'Compare with prior version', 'READ_AUTO'),
      action(4, 'mark_superseded_criteria', 'Mark superseded criteria', 'INTERNAL_WRITE_AUTO'),
      action(5, 'surface_material_changes', 'Surface meaningful changes to owner', 'REQUIRE_APPROVAL'),
    ],
    configurableActions: false,
    requiredInputs: [],
    optionalInputs: [
      { id: 'researchDomain', label: 'Research focus', inputType: 'text', required: false, description: 'e.g. lenders, vendors' },
    ],
    policyClassifications: ['READ_AUTO', 'INTERNAL_WRITE_AUTO', 'REQUIRE_APPROVAL'],
    approvalRequirements: [],
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    recommendedAutonomy: 'READ_AUTO',
    relatedSystems: ['atlas-research', 'capital-research'],
    provenance: 'hvcg_template_catalog_v1',
    createdAt: TEMPLATE_BASE,
    updatedAt: TEMPLATE_BASE,
    configurableFields: ['researchDomain', 'schedule'],
    ownerReadableSummary: {
      purpose: 'Refresh research intelligence with source-backed updates.',
      whenItRuns: 'Weekly or when research is stale.',
      whatItDoes: ['Finds stale records', 'Updates from authorized sources', 'Compares versions'],
      customizable: ['Research focus', 'Schedule'],
      automatic: ['Stale detection', 'Internal record updates'],
      requiresApproval: ['Acting on research for external submission'],
      systems: ['Atlas research', 'Capital research'],
      onFailure: 'Workflow Center + owner attention.',
      dataScope: 'Organization or entitled Capital scope',
    },
  },
];

const CLIENT_ALIASES: Record<string, { clientCode: string; clientName: string }> = {
  hart: { clientCode: 'HFD01', clientName: 'Hart Family Dental' },
  'hart family dental': { clientCode: 'HFD01', clientName: 'Hart Family Dental' },
  prodigy: { clientCode: 'PDG01', clientName: 'Prodigy Games' },
  accg: { clientCode: 'ACCG01', clientName: 'ACCG' },
};

export function getWorkflowTemplate(templateId: string): WorkflowTemplateDefinition | undefined {
  const matches = WORKFLOW_TEMPLATE_CATALOG.filter((t) => t.templateId === templateId);
  return matches.sort((a, b) => b.templateVersion - a.templateVersion)[0];
}

export function listActiveWorkflowTemplates(includeDeprecated = false): WorkflowTemplateDefinition[] {
  const byId = new Map<string, WorkflowTemplateDefinition>();
  for (const t of WORKFLOW_TEMPLATE_CATALOG) {
    if (t.status === 'DISABLED') continue;
    if (t.status === 'DEPRECATED' && !includeDeprecated) continue;
    const existing = byId.get(t.templateId);
    if (!existing || t.templateVersion > existing.templateVersion) byId.set(t.templateId, t);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveClientFromInput(
  clientCode?: string,
  clientHint?: string,
): { clientCode?: string; clientName?: string } {
  if (clientCode?.trim()) {
    const code = clientCode.trim().toUpperCase();
    const alias = Object.values(CLIENT_ALIASES).find((c) => c.clientCode === code);
    return { clientCode: code, clientName: alias?.clientName };
  }
  if (clientHint?.trim()) {
    const lower = clientHint.toLowerCase();
    for (const [key, val] of Object.entries(CLIENT_ALIASES)) {
      if (lower.includes(key)) return val;
    }
  }
  return {};
}

export function mapsToTemplateDiscoveryIntent(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('workflow template') ||
    q.includes('templates for') ||
    q.includes('do we have a workflow for onboarding') ||
    q.includes('template for capital') ||
    q.includes('missing documents') && q.includes('template') ||
    q.includes('which template') ||
    q.includes('show me templates')
  );
}

export function mapsToConversationalTemplateUse(question: string): boolean {
  const q = question.toLowerCase().trim();
  return (
    q.startsWith('use the ') && q.includes('template') ||
    q.startsWith('use ') && q.includes(' template') ||
    q.includes('set up document collection for') ||
    q.includes('create a capital preparation workflow') ||
    q.includes('use the hart marketing review template') ||
    q.includes('client onboarding template for')
  );
}

export function resolveTemplateIdFromText(text: string): string | undefined {
  const q = text.toLowerCase();
  if (q.includes('onboarding')) return 'client_onboarding';
  if (q.includes('document collection') || q.includes('missing document')) return 'document_collection';
  if (q.includes('capital') && (q.includes('preparation') || q.includes('submission'))) return 'capital_submission_preparation';
  if (q.includes('follow-up') || q.includes('follow up') || q.includes('not responded')) return 'client_follow_up';
  if (q.includes('milestone') || q.includes('project')) return 'project_milestone';
  if (q.includes('marketing') || q.includes('google ads') || q.includes('hart')) return 'marketing_review';
  if (q.includes('support') || q.includes('escalation')) return 'client_support_escalation';
  if (q.includes('renewal') || q.includes('expansion')) return 'renewal_expansion';
  if (q.includes('research refresh') || q.includes('research')) return 'research_refresh';
  return undefined;
}
