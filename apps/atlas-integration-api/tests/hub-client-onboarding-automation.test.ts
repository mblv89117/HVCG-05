import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { WorkflowDefinitionRecord } from '../src/pm/operatorDesk/workflowDefinitions.ts';
import {
  answerOnboardingContext,
  classifyOnboardingAskAtlasIntent,
  composeBlockerReview,
  composeKickoff,
  composeOperationsHandoff,
  composeOwnerAttention,
  composeMilestoneReview,
  ENTITLED_CANONICAL_CLIENT_CODES,
  findOnboardingRunForQuestion,
  isOnboardingProjectTitle,
  mapsToOnboardingContextIntent,
  mapsToOnboardingExecuteIntent,
  resolveEntitledClientCodeFromQuestion,
  runClientOnboardingAutomation,
} from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { executeEntitledOnboardingFromQuestion } from '../src/pm/operatorDesk/askAtlasOnboardingExecute.ts';
import {
  listVisibleDefinitions,
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
} from '../src/pm/operatorDesk/workflowDefinitions.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import { getOnboardingRun, readOnboardingOverlay, resolveOnboardingStateDir } from '../src/pm/operatorDesk/onboardingState.ts';
import { loadConfig } from '../src/config.ts';

const principal: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Team Member'],
};

function onboardingWorkflow(clientCode = 'ACCG01'): WorkflowDefinitionRecord {
  const now = new Date().toISOString();
  return {
    workflowDefinitionId: 'def-1',
    workflowId: 'client-onboarding-accg01',
    version: 1,
    name: 'Client Onboarding — ACCG',
    description: 'Onboarding',
    status: 'ACTIVE',
    scope: { organizationId: 'org-hvcg', clientCode, clientName: 'ACCG Test Client' },
    trigger: { type: 'manual', originalLanguage: 'manual' },
    conditions: [],
    actions: [],
    policyClass: 'READ_AUTO',
    approvalRequirements: [],
    retryPolicy: 'retry_safe_internal',
    failurePolicy: 'surface_blocker',
    responsibleAgent: 'atlas-hub-runtime',
    createdBy: principal.userId,
    createdAt: now,
    updatedAt: now,
    sourceConversation: 'template',
    provenance: 'template',
    sourceTemplateId: 'client_onboarding',
    sourceTemplateVersion: 1,
    versionHistory: [],
    authorityExpansionRequired: false,
  };
}

describe('client onboarding automation', () => {
  const prevEnv = { ...process.env };

  it('requires identity when client scope missing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_DATA_DIR = mkdtempSync(join(tmpdir(), 'onboarding-'));
    const cfg = loadConfig();
    const workflow = onboardingWorkflow();
    workflow.scope = { organizationId: 'org-hvcg' };
    const dir = process.env.INTEGRATION_DATA_DIR!;
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      workflow,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.status, 'IDENTITY_RECONCILIATION');
    assert.equal(result.record.identityResolutionRequired, true);
    assert.equal(result.record.operationsHandoff.status, 'NOT_READY');
    assert.equal(result.record.operationsHandoff.ready, false);
    assert.equal(result.record.operationsHandoff.send, false);
    assert.equal(result.record.kickoff.status, 'NOT_READY');
    assert.equal(result.record.kickoff.ready, false);
    assert.equal(result.record.kickoff.send, false);
    assert.equal(result.record.kickoff.outbound, false);
    assert.equal(result.record.ownerAttentionPackage.status, 'NOT_READY');
    assert.equal(result.record.ownerAttentionPackage.ready, false);
    assert.equal(result.record.ownerAttentionPackage.send, false);
    assert.equal(result.record.ownerAttentionPackage.outbound, false);
    assert.equal(result.record.milestoneReview.status, 'NOT_READY');
    assert.equal(result.record.milestoneReview.ready, false);
    assert.equal(result.record.milestoneReview.send, false);
    assert.equal(result.record.milestoneReview.outbound, false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('blocks non-entitled client', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const dir = mkdtempSync(join(tmpdir(), 'onboarding-'));
    process.env.INTEGRATION_DATA_DIR = dir;
    const cfg = loadConfig();
    const workflow = onboardingWorkflow('HFD01');
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      workflow,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'client_not_entitled');
    rmSync(dir, { recursive: true, force: true });
  });

  it('dry-run proposes structure without sharepoint', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const dir = mkdtempSync(join(tmpdir(), 'onboarding-'));
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_ONBOARDING_STATE_DIR = join(dir, 'onboarding-runs');
    const cfg = loadConfig();
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      workflow: onboardingWorkflow(),
      dryRun: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(result.record.dryRun, true);
    const overlay = readOnboardingOverlay(resolveOnboardingStateDir(dir));
    const run = getOnboardingRun(overlay, 'client-onboarding-accg01');
    assert.ok(run);
    rmSync(dir, { recursive: true, force: true });
  });

  it('maps Ask Atlas onboarding intents', () => {
    assert.equal(mapsToOnboardingContextIntent('Where are we on onboarding ACCG?'), true);
    assert.equal(mapsToOnboardingContextIntent('Start onboarding ACCG'), true);
    assert.equal(mapsToOnboardingContextIntent('Run onboarding for ACCG01'), true);
    assert.equal(mapsToOnboardingContextIntent('Execute onboarding ACCG'), true);
    assert.equal(mapsToOnboardingContextIntent('Activate onboarding ACCG'), true);
    assert.equal(mapsToOnboardingContextIntent('Begin onboarding ACCG'), true);
    assert.equal(mapsToOnboardingContextIntent('Kick off onboarding ACCG'), true);
    assert.equal(mapsToOnboardingContextIntent('What is the onboarding status for ACCG?'), true);
    assert.equal(mapsToOnboardingContextIntent('Search ACCG files'), false);
    assert.equal(mapsToOnboardingContextIntent('Start the weekly marketing review'), false);
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'DOCUMENT_COLLECTION' as const,
      currentStep: 'Collect documents',
      nextStep: 'Kickoff',
      blockers: [],
      ownerAttention: [],
      taskIds: [],
      milestoneIds: [],
      assignedAgents: [],
      documentGaps: [{ label: 'W-9', status: 'MISSING' as const }],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: [],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        documentGaps: [{ label: 'W-9', status: 'MISSING' }],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: composeKickoff({
        workspaceReconciled: true,
        documentGaps: [{ label: 'W-9', status: 'MISSING' }],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        documentGaps: [{ label: 'W-9', status: 'MISSING' }],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        communicationPolicy: 'DRAFT_ONLY',
      }),
      provenance: 'test',
    };
    const answer = answerOnboardingContext('What documents are missing for ACCG?', record);
    assert.match(answer, /W-9/);
  });

  it('matches ACCG to entitled ACCG01 by unique prefix and not invented codes', () => {
    const roster = [...ENTITLED_CANONICAL_CLIENT_CODES];
    const prefix = resolveEntitledClientCodeFromQuestion('Where are we on onboarding ACCG?', roster);
    assert.equal(prefix.kind, 'unique_prefix');
    assert.equal(prefix.clientCode, 'ACCG01');
    const exact = resolveEntitledClientCodeFromQuestion('Where are we on onboarding ACCG01?', roster);
    assert.equal(exact.kind, 'exact');
    assert.equal(exact.clientCode, 'ACCG01');
    const invented = resolveEntitledClientCodeFromQuestion('Where are we on onboarding ACCG99?', roster);
    assert.equal(invented.kind, 'none');
    assert.equal(invented.clientCode, undefined);
    const foreign = resolveEntitledClientCodeFromQuestion('Where are we on onboarding ACCG?', ['PDG01']);
    assert.equal(foreign.kind, 'none');
    const ambiguous = resolveEntitledClientCodeFromQuestion('Compare ACCG01 and PDG01 onboarding', roster);
    assert.equal(ambiguous.kind, 'ambiguous');
    assert.deepEqual(ambiguous.candidates.slice().sort(), ['ACCG01', 'PDG01']);
  });

  it('finds overlay run by ACCG prefix and fails closed when missing', () => {
    const now = new Date().toISOString();
    const accgRun = {
      workflowId: 'wf-accg',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'DOCUMENT_COLLECTION' as const,
      currentStep: 'Collect documents',
      nextStep: 'Kickoff',
      blockers: [],
      ownerAttention: [],
      taskIds: [],
      milestoneIds: [],
      assignedAgents: [],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: composeKickoff({
        workspaceReconciled: true,
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        communicationPolicy: 'DRAFT_ONLY',
      }),
      provenance: 'test',
    };
    const pdgRun = { ...accgRun, workflowId: 'wf-pdg', clientCode: 'PDG01', clientName: 'Prodigy', updatedAt: now };
    const found = findOnboardingRunForQuestion('Where are we on onboarding ACCG?', [pdgRun, accgRun]);
    assert.equal(found?.clientCode, 'ACCG01');
    const miss = findOnboardingRunForQuestion('Where are we on onboarding ACCG?', [pdgRun]);
    assert.equal(miss, null);
  });

  it('answers honestly from entitled existing project when overlay run is missing', () => {
    const match = resolveEntitledClientCodeFromQuestion(
      'Where are we on onboarding ACCG?',
      [...ENTITLED_CANONICAL_CLIENT_CODES],
    );
    const answer = answerOnboardingContext('Where are we on onboarding ACCG?', null, {
      match,
      existingProject: {
        name: 'ACCG01 - Onboarding',
        clientCode: 'ACCG01',
        status: 'draft',
        health: 'unknown',
      },
    });
    assert.match(answer, /ACCG01/);
    assert.match(answer, /ACCG01 - Onboarding/);
    assert.match(answer, /Draft \| Unverified/);
    assert.match(answer, /did not create a duplicate/);
    assert.equal(/invented|created project|ACCG99/i.test(answer), false);
    const ambiguous = answerOnboardingContext('Where are we on onboarding?', null, {
      match: { kind: 'ambiguous', candidates: ['ACCG01', 'PDG01'] },
    });
    assert.match(ambiguous, /Which entitled code/);
  });

  it('classifies execute vs status and does not treat status as execute', () => {
    assert.equal(classifyOnboardingAskAtlasIntent('Start onboarding ACCG'), 'execute');
    assert.equal(classifyOnboardingAskAtlasIntent('Run onboarding for ACCG01'), 'execute');
    assert.equal(classifyOnboardingAskAtlasIntent('Execute onboarding ACCG'), 'execute');
    assert.equal(classifyOnboardingAskAtlasIntent('Activate onboarding ACCG'), 'execute');
    assert.equal(classifyOnboardingAskAtlasIntent('Begin onboarding ACCG'), 'execute');
    assert.equal(mapsToOnboardingExecuteIntent('Where are we on onboarding ACCG?'), false);
    assert.equal(classifyOnboardingAskAtlasIntent('Where are we on onboarding ACCG?'), 'status');
    assert.equal(classifyOnboardingAskAtlasIntent('What documents are missing for ACCG onboarding?'), 'status');
    assert.equal(classifyOnboardingAskAtlasIntent('What is the onboarding status for ACCG?'), 'status');
    assert.equal(classifyOnboardingAskAtlasIntent('Kick off onboarding ACCG'), 'status');
    assert.equal(classifyOnboardingAskAtlasIntent('Start the weekly marketing review'), null);
    assert.equal(isOnboardingProjectTitle('Client Onboarding — ACCG'), true);
    assert.equal(isOnboardingProjectTitle('ACCG01 - Onboarding'), true);
    assert.equal(isOnboardingProjectTitle('Weekly marketing review'), false);
  });

  it('does not invent ClientCodes or execute on ambiguous/none match', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const dir = mkdtempSync(join(tmpdir(), 'onboarding-exec-'));
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR = join(dir, 'workflow-definitions');
    process.env.INTEGRATION_ONBOARDING_STATE_DIR = join(dir, 'onboarding-runs');
    const cfg = loadConfig();
    const invented = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      question: 'Start onboarding ACCG99',
      entitledCodes: [...ENTITLED_CANONICAL_CLIENT_CODES],
    });
    assert.equal(invented.executed, false);
    assert.equal(invented.instantiated, false);
    assert.equal(invented.match.kind, 'none');
    assert.match(invented.answer, /does not invent/);
    const none = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      question: 'Start onboarding',
      entitledCodes: [...ENTITLED_CANONICAL_CLIENT_CODES],
    });
    assert.equal(none.executed, false);
    assert.equal(none.match.kind, 'none');
    const ambiguous = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      question: 'Start onboarding for ACCG01 and PDG01',
      entitledCodes: [...ENTITLED_CANONICAL_CLIENT_CODES],
    });
    assert.equal(ambiguous.executed, false);
    assert.equal(ambiguous.match.kind, 'ambiguous');
    assert.match(ambiguous.answer, /Which entitled code/);
    const overlay = readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(dir));
    assert.equal(overlay.definitions.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('executes entitled onboarding once and reuses workflow/project on the second run', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const dir = mkdtempSync(join(tmpdir(), 'onboarding-exec-'));
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR = join(dir, 'workflow-definitions');
    process.env.INTEGRATION_ONBOARDING_STATE_DIR = join(dir, 'onboarding-runs');
    const cfg = loadConfig();
    const projects: Array<{ id: string; name: string; clientCode: string; idempotencyKey?: string }> = [];
    let createProjectCalls = 0;
    const sharepoint = {
      listAuthorizedClients: async () => [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      listAuthorizedProjects: async () => projects,
      createProject: async (
        _principal: AtlasPrincipal,
        body: { name?: string; clientCode?: string },
        idempotencyKey?: string,
      ) => {
        const reused = idempotencyKey
          ? projects.find((p) => p.idempotencyKey === idempotencyKey)
          : projects.find((p) => p.clientCode === body.clientCode && /onboard/i.test(p.name));
        if (reused) return reused;
        createProjectCalls += 1;
        const created = {
          id: `proj-${createProjectCalls}`,
          name: String(body.name),
          clientCode: String(body.clientCode),
          idempotencyKey,
        };
        projects.push(created);
        return created;
      },
      listAuthorizedTasks: async () => [],
      createTask: async (_principal: AtlasPrincipal, body: { title?: string }) => ({
        id: `task-${body.title}`,
        title: String(body.title),
      }),
      createMilestone: async (_principal: AtlasPrincipal, body: { title?: string }) => ({
        id: `ms-${body.title}`,
        title: String(body.title),
      }),
    } as unknown as SharePointPmService;

    const first = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      question: 'Start onboarding ACCG',
      entitledCodes: ['ACCG01'],
    });
    assert.equal(first.executed, true);
    assert.equal(first.instantiated, true);
    assert.equal(first.reusedWorkflow, false);
    assert.equal(first.record?.clientCode, 'ACCG01');
    assert.equal(first.record?.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(first.record?.operationsHandoff.status, 'PREPARED');
    assert.equal(first.record?.operationsHandoff.ready, true);
    assert.equal(first.record?.operationsHandoff.send, false);
    assert.equal(first.record?.operationsHandoff.capitalSubmit, false);
    assert.equal(first.record?.kickoff.status, 'PREPARED');
    assert.equal(first.record?.kickoff.send, false);
    assert.equal(first.record?.kickoff.outbound, false);
    assert.equal(first.record?.kickoff.capitalSubmit, false);
    assert.equal(first.record?.blockerReview.send, false);
    assert.equal(first.record?.blockerReview.outbound, false);
    assert.equal(first.record?.blockerReview.capitalSubmit, false);
    assert.equal(first.record?.ownerAttentionPackage.send, false);
    assert.equal(first.record?.ownerAttentionPackage.outbound, false);
    assert.equal(first.record?.ownerAttentionPackage.capitalSubmit, false);
    assert.equal(first.record?.ownerAttentionPackage.status, 'OPEN');
    assert.equal(first.record?.milestoneReview.send, false);
    assert.equal(first.record?.milestoneReview.outbound, false);
    assert.equal(first.record?.milestoneReview.capitalSubmit, false);
    assert.equal(first.record?.milestoneReview.status, 'OPEN');
    assert.equal(first.record?.dryRun, false);
    assert.equal(createProjectCalls, 1);
    const firstWorkflowId = first.workflow?.workflowId;
    assert.ok(firstWorkflowId);

    const second = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      question: 'Run onboarding ACCG01',
      entitledCodes: ['ACCG01'],
    });
    assert.equal(second.executed, true);
    assert.equal(second.instantiated, false);
    assert.equal(second.reusedWorkflow, true);
    assert.equal(second.workflow?.workflowId, firstWorkflowId);
    assert.equal(createProjectCalls, 1);
    assert.equal(projects.length, 1);
    const visible = listVisibleDefinitions(readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(dir)), principal);
    const onboardingDefs = visible.filter((d) => d.scope.clientCode === 'ACCG01' && d.sourceTemplateId === 'client_onboarding');
    assert.equal(onboardingDefs.length, 1);
    rmSync(dir, { recursive: true, force: true });
  });

  it('status questions do not instantiate or execute when no run exists', async () => {
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const dir = mkdtempSync(join(tmpdir(), 'onboarding-status-'));
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR = join(dir, 'workflow-definitions');
    process.env.INTEGRATION_ONBOARDING_STATE_DIR = join(dir, 'onboarding-runs');
    assert.equal(mapsToOnboardingExecuteIntent('Where are we on onboarding ACCG?'), false);
    const match = resolveEntitledClientCodeFromQuestion(
      'Where are we on onboarding ACCG?',
      [...ENTITLED_CANONICAL_CLIENT_CODES],
    );
    const answer = answerOnboardingContext('Where are we on onboarding ACCG?', null, { match });
    assert.match(answer, /No onboarding run found/);
    assert.equal(/Executed governed/i.test(answer), false);
    const overlay = readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(dir));
    assert.equal(overlay.definitions.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('prepares operations handoff from entitled run facts and answers Ask Atlas handoff', () => {
    const prepared = composeOperationsHandoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1', 't2'],
      milestoneIds: ['m1'],
      documentGaps: [{ label: 'W-9', status: 'MISSING' }],
      ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
      communicationPolicy: 'DRAFT_ONLY',
      capitalScope: true,
    });
    assert.equal(prepared.status, 'PREPARED');
    assert.equal(prepared.ready, true);
    assert.equal(prepared.send, false);
    assert.equal(prepared.liveGtmOutbound, false);
    assert.equal(prepared.capitalSubmit, false);
    assert.equal(prepared.missingDocumentCount, 1);
    assert.equal(prepared.capitalScope, true);
    assert.equal(prepared.relatedThreadCount, 0);
    assert.equal(prepared.communicationPolicy, 'DRAFT_ONLY');

    const blocked = composeOperationsHandoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.ready, false);

    const identity = composeOperationsHandoff({
      identityResolutionRequired: true,
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(identity.status, 'NOT_READY');
    assert.equal(identity.ready, false);

    const now = new Date().toISOString();
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'DOCUMENT_COLLECTION' as const,
      currentStep: 'Collect documents',
      nextStep: 'Kickoff',
      blockers: [],
      ownerAttention: prepared.ownerAttention,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1', 't2'],
      milestoneIds: ['m1'],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [{ label: 'W-9', status: 'MISSING' as const }],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: true,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [],
      operationsHandoff: prepared,
      kickoff: composeKickoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        documentGaps: [{ label: 'W-9', status: 'MISSING' }],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        documentGaps: [{ label: 'W-9', status: 'MISSING' }],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      provenance: 'test',
    };
    assert.equal(mapsToOnboardingContextIntent('What is the onboarding handoff for ACCG?'), true);
    assert.equal(classifyOnboardingAskAtlasIntent('What is the onboarding handoff for ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('What is the onboarding handoff for ACCG?'), false);
    const answer = answerOnboardingContext('What is the onboarding handoff for ACCG?', record);
    assert.match(answer, /Operations handoff for ACCG01: PREPARED/);
    assert.match(answer, /Client Onboarding — ACCG/);
    assert.match(answer, /PREPARE_ONLY/);
    assert.match(answer, /Related entitled threads: 0/);
    assert.match(answer, /did not send mail/);
    assert.equal(/ACCG99|invented|submitted|AUTO_RESPOND/i.test(answer), false);

    const withThreads = composeOperationsHandoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      communicationPolicy: 'DRAFT_ONLY',
      relatedThreadCount: 2,
    });
    assert.equal(withThreads.relatedThreadCount, 2);
    assert.equal(withThreads.send, false);
    const threadAnswer = answerOnboardingContext('What is the onboarding handoff for ACCG?', {
      ...record,
      operationsHandoff: withThreads,
    });
    assert.match(threadAnswer, /Related entitled threads: 2/);
    assert.match(threadAnswer, /DRAFT_ONLY, no send/);
  });

  it('prepares kickoff from entitled run facts and answers Ask Atlas kickoff', () => {
    const prepared = composeKickoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      milestones: [{ id: 'kickoff_ready', label: 'Kickoff ready', status: 'pending', provenance: 'PROPOSED' }],
      ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(prepared.status, 'PREPARED');
    assert.equal(prepared.ready, true);
    assert.equal(prepared.send, false);
    assert.equal(prepared.outbound, false);
    assert.equal(prepared.liveGtmOutbound, false);
    assert.equal(prepared.capitalSubmit, false);
    assert.equal(prepared.milestoneStatus, 'pending');
    assert.equal(prepared.relatedThreadCount, 0);
    assert.equal(prepared.communicationPolicy, 'DRAFT_ONLY');

    const blocked = composeKickoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.ready, false);

    const identity = composeKickoff({
      identityResolutionRequired: true,
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(identity.status, 'NOT_READY');
    assert.equal(identity.ready, false);

    const missingDocs = composeKickoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      documentGaps: [{ label: 'W-9', status: 'MISSING' }],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(missingDocs.status, 'PREPARED');
    assert.equal(missingDocs.ready, false);
    assert.equal(missingDocs.missingDocumentCount, 1);

    const now = new Date().toISOString();
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'KICKOFF_PREPARATION' as const,
      currentStep: 'Establish onboarding operating structure',
      nextStep: 'Prepare kickoff and operating baseline',
      blockers: [],
      ownerAttention: prepared.ownerAttention,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1'],
      milestoneIds: ['m1'],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [{ id: 'kickoff_ready', label: 'Kickoff ready', status: 'pending' as const, provenance: 'PROPOSED' as const }],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: prepared,
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      provenance: 'test',
    };
    assert.equal(mapsToOnboardingContextIntent('What is the onboarding kickoff for ACCG?'), true);
    assert.equal(classifyOnboardingAskAtlasIntent('What is the onboarding kickoff for ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('What is the onboarding kickoff for ACCG?'), false);
    const answer = answerOnboardingContext('What is the onboarding kickoff for ACCG?', record);
    assert.match(answer, /Kickoff for ACCG01: PREPARED/);
    assert.match(answer, /Client Onboarding — ACCG/);
    assert.match(answer, /Related entitled threads: 0/);
    assert.match(answer, /did not send mail/);
    assert.equal(/ACCG99|invented|submitted|AUTO_RESPOND/i.test(answer), false);

    const withThreads = composeKickoff({
      workspaceReconciled: true,
      projectId: 'proj-1',
      communicationPolicy: 'DRAFT_ONLY',
      relatedThreadCount: 2,
    });
    assert.equal(withThreads.relatedThreadCount, 2);
    assert.equal(withThreads.send, false);
    const threadAnswer = answerOnboardingContext('What is the onboarding kickoff for ACCG?', {
      ...record,
      kickoff: withThreads,
    });
    assert.match(threadAnswer, /Related entitled threads: 2/);
    assert.match(threadAnswer, /DRAFT_ONLY, no send/);
  });

  it('prepares blocker review from entitled run facts and answers Ask Atlas blockers', () => {
    const prepared = composeBlockerReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(prepared.status, 'CLEAR');
    assert.equal(prepared.ready, true);
    assert.equal(prepared.send, false);
    assert.equal(prepared.outbound, false);
    assert.equal(prepared.liveGtmOutbound, false);
    assert.equal(prepared.capitalSubmit, false);
    assert.equal(prepared.itemCount, 0);

    const blocked = composeBlockerReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.ready, false);
    assert.equal(blocked.itemCount, 1);

    const identity = composeBlockerReview({
      identityResolutionRequired: true,
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(identity.status, 'NOT_READY');
    assert.equal(identity.ready, false);

    const openDocs = composeBlockerReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      documentGaps: [{ label: 'W-9', status: 'MISSING' }],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(openDocs.status, 'OPEN');
    assert.equal(openDocs.ready, false);
    assert.equal(openDocs.missingDocumentCount, 1);

    const now = new Date().toISOString();
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'BLOCKED' as const,
      currentStep: 'Establish onboarding operating structure',
      nextStep: 'Clear blockers',
      blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
      ownerAttention: ['Review SharePoint PM availability'],
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1'],
      milestoneIds: ['m1'],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: composeKickoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        blockers: ['SharePoint PM backend unavailable — onboarding execution deferred'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: blocked,
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        projectId: 'proj-1',
        projectName: 'Client Onboarding — ACCG',
        ownerAttention: ['Review SharePoint PM availability'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      provenance: 'test',
    };
    assert.equal(mapsToOnboardingContextIntent('What are the onboarding blockers for ACCG?'), true);
    assert.equal(classifyOnboardingAskAtlasIntent('What are the onboarding blockers for ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('What are the onboarding blockers for ACCG?'), false);
    const answer = answerOnboardingContext('What are the onboarding blockers for ACCG?', record);
    assert.match(answer, /Blocker review for ACCG01: BLOCKED/);
    assert.match(answer, /SharePoint PM backend unavailable/);
    assert.match(answer, /did not send mail/);
    assert.equal(/ACCG99|invented|submitted|AUTO_RESPOND/i.test(answer), false);
  });

  it('prepares owner attention from entitled run facts and answers Ask Atlas attention', () => {
    const prepared = composeOwnerAttention({
      workspaceReconciled: true,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(prepared.status, 'CLEAR');
    assert.equal(prepared.ready, true);
    assert.equal(prepared.send, false);
    assert.equal(prepared.outbound, false);
    assert.equal(prepared.liveGtmOutbound, false);
    assert.equal(prepared.capitalSubmit, false);
    assert.equal(prepared.itemCount, 0);

    const open = composeOwnerAttention({
      workspaceReconciled: true,
      projectId: 'proj-1',
      ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(open.status, 'OPEN');
    assert.equal(open.ready, false);
    assert.equal(open.itemCount, 1);

    const identity = composeOwnerAttention({
      identityResolutionRequired: true,
      ownerAttention: ['Assign client scope to onboarding workflow'],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(identity.status, 'NOT_READY');
    assert.equal(identity.ready, false);

    const now = new Date().toISOString();
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'WAITING_ON_OWNER' as const,
      currentStep: 'Establish onboarding operating structure',
      nextStep: 'Owner review',
      blockers: [],
      ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1'],
      milestoneIds: ['m1'],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: composeKickoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        projectId: 'proj-1',
        ownerAttention: ['Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits'],
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: open,
      provenance: 'test',
    };
    assert.equal(mapsToOnboardingContextIntent('What needs owner attention for onboarding ACCG?'), true);
    assert.equal(classifyOnboardingAskAtlasIntent('What needs owner attention for onboarding ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('What needs owner attention for onboarding ACCG?'), false);
    const answer = answerOnboardingContext('What needs owner attention for onboarding ACCG?', record);
    assert.match(answer, /Owner attention for ACCG01: OPEN/);
    assert.match(answer, /DRAFT_ONLY unless explicit policy permits/);
    assert.match(answer, /did not send mail/);
    assert.equal(/ACCG99|invented|submitted|AUTO_RESPOND/i.test(answer), false);
  });

  it('prepares milestone review from entitled run facts and answers Ask Atlas milestones', () => {
    const prepared = composeMilestoneReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      milestones: [
        { id: 'identity_verified', label: 'Client identity verified', status: 'complete', provenance: 'CONFIRMED' },
        { id: 'kickoff_ready', label: 'Kickoff ready', status: 'pending', provenance: 'PROPOSED' },
      ],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(prepared.status, 'OPEN');
    assert.equal(prepared.ready, false);
    assert.equal(prepared.send, false);
    assert.equal(prepared.outbound, false);
    assert.equal(prepared.liveGtmOutbound, false);
    assert.equal(prepared.capitalSubmit, false);
    assert.equal(prepared.completeCount, 1);
    assert.equal(prepared.milestoneCount, 2);
    assert.equal(prepared.nextMilestone, 'Kickoff ready');

    const clear = composeMilestoneReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      milestones: [
        { id: 'identity_verified', label: 'Client identity verified', status: 'complete', provenance: 'CONFIRMED' },
      ],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(clear.status, 'CLEAR');
    assert.equal(clear.ready, true);

    const blocked = composeMilestoneReview({
      workspaceReconciled: true,
      projectId: 'proj-1',
      milestones: [
        { id: 'documents_complete', label: 'Documents complete', status: 'blocked', provenance: 'CONFIRMED' },
      ],
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(blocked.status, 'BLOCKED');
    assert.equal(blocked.ready, false);

    const identity = composeMilestoneReview({
      identityResolutionRequired: true,
      communicationPolicy: 'DRAFT_ONLY',
    });
    assert.equal(identity.status, 'NOT_READY');
    assert.equal(identity.ready, false);

    const now = new Date().toISOString();
    const record = {
      workflowId: 'wf-1',
      workflowDefinitionId: 'def',
      clientCode: 'ACCG01',
      clientName: 'ACCG',
      status: 'KICKOFF_PREPARATION' as const,
      currentStep: 'Establish onboarding operating structure',
      nextStep: 'Advance milestones',
      blockers: [],
      ownerAttention: [],
      projectId: 'proj-1',
      projectName: 'Client Onboarding — ACCG',
      taskIds: ['t1'],
      milestoneIds: ['m1'],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY' as const,
      capitalScope: false,
      identityResolutionRequired: false,
      workspaceReconciled: true,
      dryRun: false,
      createdAt: now,
      updatedAt: now,
      milestones: [
        { id: 'identity_verified', label: 'Client identity verified', status: 'complete' as const, provenance: 'CONFIRMED' as const },
        { id: 'kickoff_ready', label: 'Kickoff ready', status: 'pending' as const, provenance: 'PROPOSED' as const },
      ],
      operationsHandoff: composeOperationsHandoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      kickoff: composeKickoff({
        workspaceReconciled: true,
        projectId: 'proj-1',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      blockerReview: composeBlockerReview({
        workspaceReconciled: true,
        projectId: 'proj-1',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      ownerAttentionPackage: composeOwnerAttention({
        workspaceReconciled: true,
        projectId: 'proj-1',
        communicationPolicy: 'DRAFT_ONLY',
      }),
      milestoneReview: prepared,
      provenance: 'test',
    };
    assert.equal(mapsToOnboardingContextIntent('What are the onboarding milestones for ACCG?'), true);
    assert.equal(classifyOnboardingAskAtlasIntent('What are the onboarding milestones for ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('What are the onboarding milestones for ACCG?'), false);
    const answer = answerOnboardingContext('What are the onboarding milestones for ACCG?', record);
    assert.match(answer, /Milestone review for ACCG01: OPEN/);
    assert.match(answer, /Kickoff ready/);
    assert.match(answer, /did not invent dates/);
    assert.equal(/ACCG99|submitted|AUTO_RESPOND/i.test(answer), false);
  });

  it('restore env', () => {
    process.env = prevEnv;
  });
});
