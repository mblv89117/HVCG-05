import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { WorkflowDefinitionRecord } from '../src/pm/operatorDesk/workflowDefinitions.ts';
import {
  classifyOnboardingAskAtlasIntent,
  defaultOnboardingAgentAssign,
  ENTITLED_CANONICAL_CLIENT_CODES,
  mapsToOnboardingExecuteIntent,
  runClientOnboardingAutomation,
} from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { executeEntitledOnboardingFromQuestion } from '../src/pm/operatorDesk/askAtlasOnboardingExecute.ts';
import {
  listVisibleDefinitions,
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
} from '../src/pm/operatorDesk/workflowDefinitions.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
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

type ProjectRow = { id: string; name: string; clientCode: string; idempotencyKey?: string };
type TaskRow = { id: string; title: string; projectId?: string };
type MilestoneRow = { id: string; title: string; projectId?: string };

function mockSharePoint(opts: {
  clients?: Array<{ clientCode: string; displayName: string }>;
  projects?: ProjectRow[];
  tasks?: TaskRow[];
  milestones?: MilestoneRow[];
}): {
  sharepoint: SharePointPmService;
  projects: ProjectRow[];
  tasks: TaskRow[];
  milestones: MilestoneRow[];
  counts: {
    createProject: number;
    createTask: number;
    createMilestone: number;
    listTasks: number;
    listMilestones: number;
  };
} {
  const projects = opts.projects ?? [];
  const tasks: TaskRow[] = [...(opts.tasks ?? [])];
  const milestones: MilestoneRow[] = [...(opts.milestones ?? [])];
  const counts = { createProject: 0, createTask: 0, createMilestone: 0, listTasks: 0, listMilestones: 0 };
  const sharepoint = {
    listAuthorizedClients: async () => opts.clients ?? [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
    listAuthorizedProjects: async () => projects,
    createProject: async (
      _principal: AtlasPrincipal,
      body: { name?: string; clientCode?: string },
      idempotencyKey?: string,
    ) => {
      counts.createProject += 1;
      const created = {
        id: `proj-${counts.createProject}`,
        name: String(body.name),
        clientCode: String(body.clientCode),
        idempotencyKey,
      };
      projects.push(created);
      return created;
    },
    listAuthorizedTasks: async (_principal: AtlasPrincipal, projectId?: string) => {
      counts.listTasks += 1;
      return projectId ? tasks.filter((t) => !t.projectId || t.projectId === projectId) : tasks;
    },
    createTask: async (_principal: AtlasPrincipal, body: { title?: string; projectId?: string }) => {
      counts.createTask += 1;
      const created = { id: `task-${counts.createTask}`, title: String(body.title), projectId: body.projectId };
      tasks.push(created);
      return created;
    },
    listAuthorizedMilestones: async (_principal: AtlasPrincipal, projectId?: string) => {
      counts.listMilestones += 1;
      return projectId ? milestones.filter((row) => !row.projectId || row.projectId === projectId) : milestones;
    },
    createMilestone: async (_principal: AtlasPrincipal, body: { title?: string; projectId?: string }) => {
      counts.createMilestone += 1;
      const created = { id: `ms-${counts.createMilestone}`, title: String(body.title), projectId: body.projectId };
      milestones.push(created);
      return created;
    },
  } as unknown as SharePointPmService;
  return { sharepoint, projects, tasks, milestones, counts };
}

function withTempEnv(): string {
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  const dir = mkdtempSync(join(tmpdir(), 'onboarding-identity-'));
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR = join(dir, 'workflow-definitions');
  process.env.INTEGRATION_ONBOARDING_STATE_DIR = join(dir, 'onboarding-runs');
  return dir;
}

describe('onboarding execute fail-closed identity', () => {
  const prevEnv = { ...process.env };

  it('blocks entitled execute when ClientCode is missing from HVCG_Clients', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint, counts } = mockSharePoint({
      clients: [{ clientCode: 'PDG01', displayName: 'Prodigy' }],
    });
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.status, 'IDENTITY_RECONCILIATION');
    assert.equal(result.record.identityResolutionRequired, true);
    assert.equal(result.record.workspaceReconciled, false);
    assert.equal(result.record.documentsReconciled, false);
    assert.equal(result.record.clientCode, 'ACCG01');
    assert.equal(result.record.projectId, undefined);
    assert.deepEqual(result.record.taskIds, []);
    assert.deepEqual(result.record.milestoneIds, []);
    assert.equal(result.record.milestoneReconciled, false);
    assert.equal(result.record.milestoneReview?.milestoneReconciled, false);
    assert.deepEqual(result.record.assignedAgents, []);
    assert.equal(result.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(result.record.communicationContextReconciled, false);
    assert.equal(result.record.communicationContextReview?.communicationContextReconciled, false);
    assert.equal(result.record.communicationContextReview?.relatedThreadCount, 0);
    assert.deepEqual(result.record.communicationContextReview?.relatedEmails, []);
    assert.deepEqual(result.record.communicationContextReview?.relatedThreads, []);
    assert.equal(result.record.operationsHandoff.relatedThreadCount, 0);
    assert.equal(result.record.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(result.record.identityReview.send, false);
    assert.equal(result.record.identityReview.outbound, false);
    assert.equal(result.record.identityReview.liveGtmOutbound, false);
    assert.equal(result.record.identityReview.capitalSubmit, false);
    assert.equal(result.record.operationsHandoff.send, false);
    assert.equal(counts.createProject, 0);
    assert.equal(counts.createTask, 0);
    assert.equal(counts.createMilestone, 0);
    assert.equal(counts.listTasks, 0);
    assert.equal(counts.listMilestones, 0);
    assert.equal(result.events.includes('PROJECT_CREATED'), false);
    assert.equal(result.events.includes('TASKS_CREATED'), false);
    assert.equal(result.events.includes('MILESTONE_CREATED'), false);
    assert.equal(result.events.includes('AGENTS_ASSIGNED'), false);
    assert.equal(result.record.taskReview?.taskReconciled, false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('blocks entitled execute when SharePoint PM is null', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: null,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.status, 'IDENTITY_RECONCILIATION');
    assert.equal(result.record.identityResolutionRequired, true);
    assert.equal(result.record.workspaceReconciled, false);
    assert.equal(result.record.documentsReconciled, false);
    assert.equal(result.record.projectId, undefined);
    assert.deepEqual(result.record.taskIds, []);
    assert.deepEqual(result.record.milestoneIds, []);
    assert.equal(result.record.milestoneReconciled, false);
    assert.equal(result.record.milestoneReview?.milestoneReconciled, false);
    assert.deepEqual(result.record.assignedAgents, []);
    assert.equal(result.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(result.record.communicationContextReconciled, false);
    assert.equal(result.record.communicationContextReview?.relatedThreadCount, 0);
    assert.deepEqual(result.record.communicationContextReview?.relatedEmails, []);
    assert.equal(result.record.operationsHandoff.relatedThreadCount, 0);
    assert.equal(result.events.includes('MILESTONE_CREATED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('reuses an existing titled onboarding project and does not duplicate', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint, projects, counts } = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.identityResolutionRequired, false);
    assert.equal(result.record.workspaceReconciled, true);
    assert.equal(result.record.workspaceReview.workspaceReconciled, true);
    assert.equal(result.record.documentsReconciled, false);
    assert.equal(result.record.clientName, 'ACCG');
    assert.equal(result.record.projectId, 'existing-accg-onboarding');
    assert.equal(result.record.projectName, 'ACCG01 - Onboarding');
    assert.equal(result.record.identityReview.status, 'CLEAR');
    assert.equal(result.record.milestones.find((m) => m.id === 'identity_verified')?.status, 'complete');
    assert.equal(result.record.milestones.find((m) => m.id === 'identity_verified')?.provenance, 'CONFIRMED');
    assert.equal(counts.createProject, 0);
    assert.equal(projects.length, 1);
    assert.equal(result.events.includes('PROJECT_CREATED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates a project only when identity is found, sharepoint is provided, and not dryRun', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const live = mockSharePoint({ clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }] });
    const created = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.identityResolutionRequired, false);
    assert.equal(created.record.workspaceReconciled, true);
    assert.equal(created.record.workspaceReview.workspaceReconciled, true);
    assert.equal(created.record.documentsReconciled, false);
    assert.equal(created.events.includes('DOCUMENT_RECONCILED'), false);
    assert.equal(created.record.projectId, 'proj-1');
    assert.equal(live.counts.createProject, 1);
    assert.ok(live.counts.createTask > 0);
    assert.ok(created.record.taskIds.every((id) => Boolean(id)));
    assert.equal(created.record.taskReview?.taskReconciled, true);
    assert.deepEqual(created.record.assignedAgents, ['atlas-hub-runtime']);
    assert.equal(created.record.agentAssignmentReview?.agentReconciled, true);
    assert.equal(created.record.agentAssignmentReview?.send, false);
    assert.ok(created.events.includes('PROJECT_CREATED'));
    assert.ok(created.events.includes('TASKS_CREATED'));
    assert.ok(created.events.includes('MILESTONE_CREATED'));
    assert.ok(created.record.milestoneIds.every((id) => Boolean(id)));
    assert.equal(created.record.milestoneReconciled, true);
    assert.equal(created.record.milestoneReview?.milestoneReconciled, true);
    assert.ok(created.events.includes('AGENTS_ASSIGNED'));

    const dry = mockSharePoint({ clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }] });
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.identityResolutionRequired, false);
    assert.equal(proposed.record.workspaceReconciled, false);
    assert.equal(proposed.record.workspaceReview.workspaceReconciled, false);
    assert.equal(proposed.record.documentsReconciled, false);
    assert.equal(proposed.events.includes('DOCUMENT_RECONCILED'), false);
    assert.equal(proposed.record.projectId, undefined);
    assert.deepEqual(proposed.record.taskIds, []);
    assert.deepEqual(proposed.record.milestoneIds, []);
    assert.equal(proposed.record.milestoneReconciled, false);
    assert.equal(proposed.record.milestoneReview?.milestoneReconciled, false);
    assert.deepEqual(proposed.record.assignedAgents, []);
    assert.equal(proposed.record.taskReview?.status, 'OPEN');
    assert.equal(proposed.record.taskReview?.taskReconciled, false);
    assert.equal(proposed.record.taskReview?.send, false);
    assert.equal(proposed.record.agentAssignmentReview?.status, 'OPEN');
    assert.equal(proposed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(proposed.record.agentAssignmentReview?.send, false);
    assert.equal(dry.counts.createProject, 0);
    assert.equal(dry.counts.createTask, 0);
    assert.equal(dry.counts.createMilestone, 0);
    assert.equal(dry.counts.listTasks, 0);
    assert.equal(proposed.events.includes('PROJECT_CREATED'), false);
    assert.equal(proposed.events.includes('TASKS_CREATED'), false);
    assert.equal(proposed.events.includes('MILESTONE_CREATED'), false);
    assert.equal(proposed.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not claim workspaceReconciled when entitled create fails or returns no id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const thrown = mockSharePoint({ clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }] });
    thrown.sharepoint.createProject = async () => {
      thrown.counts.createProject += 1;
      throw new Error('sharepoint create failed');
    };
    const failed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: thrown.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(failed.ok, true);
    if (!failed.ok) return;
    assert.equal(failed.record.identityResolutionRequired, false);
    assert.equal(failed.record.workspaceReconciled, false);
    assert.equal(failed.record.workspaceReview.workspaceReconciled, false);
    assert.equal(failed.record.workspaceReview.ready, false);
    assert.equal(failed.record.projectId, undefined);
    assert.deepEqual(failed.record.taskIds, []);
    assert.deepEqual(failed.record.milestoneIds, []);
    assert.deepEqual(failed.record.assignedAgents, []);
    assert.equal(failed.record.taskReview?.status, 'OPEN');
    assert.equal(failed.record.taskReview?.taskReconciled, false);
    assert.equal(failed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(thrown.counts.createProject, 1);
    assert.equal(thrown.counts.createTask, 0);
    assert.equal(thrown.counts.createMilestone, 0);
    assert.equal(thrown.counts.listTasks, 0);
    assert.equal(failed.events.includes('PROJECT_CREATED'), false);
    assert.equal(failed.events.includes('TASKS_CREATED'), false);
    assert.equal(failed.events.includes('AGENTS_ASSIGNED'), false);

    const noId = mockSharePoint({ clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }] });
    noId.sharepoint.createProject = (async () => {
      noId.counts.createProject += 1;
      return { name: 'Client Onboarding — ACCG', clientCode: 'ACCG01' };
    }) as SharePointPmService['createProject'];
    const absent = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: noId.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(absent.ok, true);
    if (!absent.ok) return;
    assert.equal(absent.record.identityResolutionRequired, false);
    assert.equal(absent.record.workspaceReconciled, false);
    assert.equal(absent.record.workspaceReview.workspaceReconciled, false);
    assert.equal(absent.record.projectId, undefined);
    assert.deepEqual(absent.record.taskIds, []);
    assert.deepEqual(absent.record.milestoneIds, []);
    assert.deepEqual(absent.record.assignedAgents, []);
    assert.equal(absent.record.taskReview?.taskReconciled, false);
    assert.equal(absent.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(noId.counts.createProject, 1);
    assert.equal(noId.counts.createTask, 0);
    assert.equal(noId.counts.createMilestone, 0);
    assert.equal(noId.counts.listTasks, 0);
    assert.equal(absent.events.includes('TASKS_CREATED'), false);
    assert.equal(absent.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('status questions still do not execute or create structure', async () => {
    const dir = withTempEnv();
    assert.equal(mapsToOnboardingExecuteIntent('Where are we on onboarding ACCG?'), false);
    assert.equal(classifyOnboardingAskAtlasIntent('Where are we on onboarding ACCG?'), 'status');
    assert.equal(classifyOnboardingAskAtlasIntent('What is the onboarding status for ACCG?'), 'status');
    assert.equal(mapsToOnboardingExecuteIntent('Is onboarding complete for ACCG?'), false);
    const overlay = readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(dir));
    assert.equal(overlay.definitions.length, 0);
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    rmSync(dir, { recursive: true, force: true });
  });

  it('Ask Atlas entitled execute with missing HVCG_Clients row does not create project/task/milestone', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint, counts } = mockSharePoint({ clients: [] });
    const execution = await executeEntitledOnboardingFromQuestion({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      question: 'Start onboarding ACCG',
      entitledCodes: ['ACCG01'],
    });
    assert.equal(execution.executed, true);
    assert.equal(execution.record?.status, 'IDENTITY_RECONCILIATION');
    assert.equal(execution.record?.identityResolutionRequired, true);
    assert.equal(execution.record?.workspaceReconciled, false);
    assert.equal(execution.record?.documentsReconciled, false);
    assert.equal(execution.record?.milestoneReconciled, false);
    assert.deepEqual(execution.record?.milestoneIds, []);
    assert.equal(execution.record?.milestoneReview?.milestoneReconciled, false);
    assert.equal(execution.record?.communicationContextReconciled, false);
    assert.equal(execution.record?.communicationContextReview?.relatedThreadCount, 0);
    assert.deepEqual(execution.record?.communicationContextReview?.relatedEmails, []);
    assert.equal(execution.record?.projectId, undefined);
    assert.equal(execution.record?.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(counts.createProject, 0);
    assert.equal(counts.createTask, 0);
    assert.equal(counts.createMilestone, 0);
    const visible = listVisibleDefinitions(
      readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(dir)),
      principal,
    );
    const onboardingDefs = visible.filter(
      (d) => d.scope.clientCode === 'ACCG01' && d.sourceTemplateId === 'client_onboarding',
    );
    assert.equal(onboardingDefs.length, 1);
    rmSync(dir, { recursive: true, force: true });
  });

  it('reuses an existing entitled document request set and does not invent documents', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    writeFileSync(join(dir, 'client-document-requests.json'), `${JSON.stringify({
      requests: [{
        id: 'existing-accg-doc-req-1',
        clientCode: 'ACCG01',
        title: 'Operating agreement or formation documents',
        status: 'requested',
        createdAt: '2026-08-25T00:00:00.000Z',
        createdBy: principal.userId,
        provenance: 'hub_governed_overlay',
        binariesInAtlas: false,
      }],
    }, null, 2)}\n`);
    const { sharepoint, counts } = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    let createCalls = 0;
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      documentRequestCreate: async () => {
        createCalls += 1;
        throw new Error('create must not run when an entitled document set is reused');
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.identityResolutionRequired, false);
    assert.equal(result.record.workspaceReconciled, true);
    assert.equal(result.record.documentsReconciled, true);
    assert.equal(result.events.includes('DOCUMENT_RECONCILED'), true);
    assert.equal(result.events.includes('DOCUMENT_REQUIREMENTS_CREATED'), false);
    assert.equal(createCalls, 0);
    assert.equal(counts.createProject, 0);
    assert.equal(result.record.documentGaps.some((gap) => gap.status === 'CONFIRMED'), true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('sets documentsReconciled only after entitled create returns an id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint } = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    let createCalls = 0;
    const created = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      documentRequestCreate: async (_dataDir, input) => {
        createCalls += 1;
        return { id: `doc-req-${createCalls}`, title: input.title };
      },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.identityResolutionRequired, false);
    assert.equal(created.record.workspaceReconciled, true);
    assert.equal(created.record.documentsReconciled, true);
    assert.equal(created.events.includes('DOCUMENT_RECONCILED'), true);
    assert.equal(created.events.includes('DOCUMENT_REQUIREMENTS_CREATED'), true);
    assert.ok(createCalls > 0);

    const dry = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
    });
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
      documentRequestCreate: async () => {
        throw new Error('dry-run must not create document requests');
      },
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.identityResolutionRequired, false);
    assert.equal(proposed.record.workspaceReconciled, false);
    assert.equal(proposed.record.documentsReconciled, false);
    assert.equal(proposed.events.includes('DOCUMENT_RECONCILED'), false);
    assert.equal(proposed.events.includes('DOCUMENT_REQUIREMENTS_CREATED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not claim documentsReconciled when entitled create fails or returns no id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const thrown = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    let failedCreates = 0;
    const failed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: thrown.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      documentRequestCreate: async () => {
        failedCreates += 1;
        throw new Error('document request create failed');
      },
    });
    assert.equal(failed.ok, true);
    if (!failed.ok) return;
    assert.equal(failed.record.identityResolutionRequired, false);
    assert.equal(failed.record.workspaceReconciled, true);
    assert.equal(failed.record.documentsReconciled, false);
    assert.equal(failed.events.includes('DOCUMENT_RECONCILED'), false);
    assert.equal(failed.events.includes('DOCUMENT_REQUIREMENTS_CREATED'), false);
    assert.equal(failedCreates, 1);

    const noId = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    let absentCreates = 0;
    const absent = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: noId.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      documentRequestCreate: async () => {
        absentCreates += 1;
        return { title: 'Operating agreement or formation documents' };
      },
    });
    assert.equal(absent.ok, true);
    if (!absent.ok) return;
    assert.equal(absent.record.identityResolutionRequired, false);
    assert.equal(absent.record.workspaceReconciled, true);
    assert.equal(absent.record.documentsReconciled, false);
    assert.equal(absent.events.includes('DOCUMENT_RECONCILED'), false);
    assert.ok(absentCreates > 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('reuses existing entitled onboarding tasks and does not invent task ids', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint, counts } = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.identityResolutionRequired, false);
    assert.equal(result.record.workspaceReconciled, true);
    assert.equal(result.record.documentsReconciled, false);
    assert.equal(result.record.projectId, 'existing-accg-onboarding');
    assert.ok(result.record.taskIds.includes('existing-accg-task-1'));
    assert.ok(result.record.taskIds.every((id) => Boolean(id)));
    assert.equal(result.record.taskReview?.taskReconciled, true);
    assert.equal(result.record.taskReview?.reusedExisting, true);
    assert.equal(result.record.taskReview?.send, false);
    assert.equal(result.record.taskReview?.outbound, false);
    assert.deepEqual(result.record.assignedAgents, ['atlas-hub-runtime']);
    assert.equal(result.record.agentAssignmentReview?.agentReconciled, true);
    assert.ok(result.events.includes('AGENTS_ASSIGNED'));
    assert.equal(counts.createProject, 0);
    assert.ok(counts.listTasks > 0);
    assert.ok(counts.createTask > 0);
    assert.equal(result.record.communicationPolicy, 'DRAFT_ONLY');

    const dry = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.workspaceReconciled, true);
    assert.equal(proposed.record.documentsReconciled, false);
    assert.deepEqual(proposed.record.taskIds, ['existing-accg-task-1']);
    assert.deepEqual(proposed.record.milestoneIds, []);
    assert.equal(proposed.record.milestoneReconciled, false);
    assert.equal(proposed.record.milestoneReview?.milestoneReconciled, false);
    assert.deepEqual(proposed.record.assignedAgents, []);
    assert.equal(proposed.record.taskReview?.reusedExisting, true);
    assert.equal(proposed.record.taskReview?.send, false);
    assert.equal(proposed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(dry.counts.createTask, 0);
    assert.equal(dry.counts.createMilestone, 0);
    assert.equal(proposed.events.includes('TASKS_CREATED'), false);
    assert.equal(proposed.events.includes('MILESTONE_CREATED'), false);
    assert.equal(proposed.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates tasks only when entitled projectId exists and create returns an id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const live = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    const created = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.identityResolutionRequired, false);
    assert.equal(created.record.workspaceReconciled, true);
    assert.equal(created.record.documentsReconciled, false);
    assert.equal(created.record.projectId, 'existing-accg-onboarding');
    assert.ok(created.record.taskIds.length > 0);
    assert.ok(created.record.taskIds.every((id) => Boolean(id)));
    assert.equal(created.record.taskReview?.taskReconciled, true);
    assert.equal(created.record.taskReview?.reusedExisting, false);
    assert.deepEqual(created.record.assignedAgents, ['atlas-hub-runtime']);
    assert.equal(created.record.agentAssignmentReview?.agentReconciled, true);
    assert.ok(created.events.includes('TASKS_CREATED'));
    assert.ok(created.events.includes('MILESTONE_CREATED'));
    assert.ok(created.events.includes('AGENTS_ASSIGNED'));
    assert.ok(live.counts.createTask > 0);
    assert.ok(live.counts.createMilestone > 0);
    assert.equal(live.counts.createProject, 0);

    const dry = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
    });
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.identityResolutionRequired, false);
    assert.equal(proposed.record.workspaceReconciled, false);
    assert.equal(proposed.record.documentsReconciled, false);
    assert.equal(proposed.record.projectId, undefined);
    assert.deepEqual(proposed.record.taskIds, []);
    assert.deepEqual(proposed.record.milestoneIds, []);
    assert.equal(proposed.record.milestoneReconciled, false);
    assert.equal(proposed.record.milestoneReview?.milestoneReconciled, false);
    assert.deepEqual(proposed.record.assignedAgents, []);
    assert.equal(proposed.record.taskReview?.status, 'OPEN');
    assert.equal(proposed.record.taskReview?.taskReconciled, false);
    assert.equal(proposed.record.taskReview?.send, false);
    assert.equal(proposed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(dry.counts.createTask, 0);
    assert.equal(dry.counts.createMilestone, 0);
    assert.equal(dry.counts.listTasks, 0);
    assert.equal(proposed.events.includes('TASKS_CREATED'), false);
    assert.equal(proposed.events.includes('MILESTONE_CREATED'), false);
    assert.equal(proposed.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not invent task ids when entitled create fails or returns no id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const thrown = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    thrown.sharepoint.createTask = async () => {
      thrown.counts.createTask += 1;
      throw new Error('sharepoint task create failed');
    };
    const failed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: thrown.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(failed.ok, true);
    if (!failed.ok) return;
    assert.equal(failed.record.identityResolutionRequired, false);
    assert.equal(failed.record.workspaceReconciled, true);
    assert.equal(failed.record.documentsReconciled, false);
    assert.equal(failed.record.projectId, 'existing-accg-onboarding');
    assert.deepEqual(failed.record.taskIds, []);
    assert.deepEqual(failed.record.assignedAgents, []);
    assert.equal(failed.record.taskReview?.status, 'OPEN');
    assert.equal(failed.record.taskReview?.taskReconciled, false);
    assert.equal(failed.record.taskReview?.send, false);
    assert.equal(failed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(thrown.counts.createTask, 1);
    assert.equal(failed.events.includes('TASKS_CREATED'), false);
    assert.equal(failed.events.includes('AGENTS_ASSIGNED'), false);

    const noId = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    noId.sharepoint.createTask = (async () => {
      noId.counts.createTask += 1;
      return { title: 'Confirm primary client contact', projectId: 'existing-accg-onboarding' };
    }) as SharePointPmService['createTask'];
    const absent = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: noId.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(absent.ok, true);
    if (!absent.ok) return;
    assert.equal(absent.record.identityResolutionRequired, false);
    assert.equal(absent.record.workspaceReconciled, true);
    assert.equal(absent.record.documentsReconciled, false);
    assert.deepEqual(absent.record.taskIds, []);
    assert.deepEqual(absent.record.assignedAgents, []);
    assert.equal(absent.record.taskReview?.taskReconciled, false);
    assert.equal(absent.record.agentAssignmentReview?.agentReconciled, false);
    assert.ok(noId.counts.createTask > 0);
    assert.equal(absent.events.includes('TASKS_CREATED'), false);
    assert.equal(absent.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('assigns agents only when entitled project/task context exists and assign returns an id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const live = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    let assignCalls = 0;
    const created = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      agentAssign: (input) => {
        assignCalls += 1;
        assert.equal(input.projectId, 'existing-accg-onboarding');
        assert.ok(input.taskIds.includes('existing-accg-task-1'));
        return { id: `assign-${assignCalls}`, agentId: 'atlas-hub-runtime' };
      },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.identityResolutionRequired, false);
    assert.equal(created.record.workspaceReconciled, true);
    assert.equal(created.record.documentsReconciled, false);
    assert.equal(created.record.projectId, 'existing-accg-onboarding');
    assert.ok(created.record.taskIds.includes('existing-accg-task-1'));
    assert.deepEqual(created.record.assignedAgents, ['atlas-hub-runtime']);
    assert.equal(created.record.agentAssignmentReview?.status, 'CLEAR');
    assert.equal(created.record.agentAssignmentReview?.agentReconciled, true);
    assert.equal(created.record.agentAssignmentReview?.reusedExisting, false);
    assert.equal(created.record.agentAssignmentReview?.send, false);
    assert.equal(created.record.agentAssignmentReview?.outbound, false);
    assert.equal(created.record.communicationPolicy, 'DRAFT_ONLY');
    assert.ok(created.events.includes('AGENTS_ASSIGNED'));
    assert.equal(assignCalls, 1);
    assert.deepEqual(
      defaultOnboardingAgentAssign({
        clientCode: 'ACCG01',
        projectId: 'existing-accg-onboarding',
        taskIds: ['existing-accg-task-1'],
        agentId: 'atlas-hub-runtime',
      }).agentId,
      'atlas-hub-runtime',
    );
    assert.deepEqual(
      defaultOnboardingAgentAssign({
        clientCode: 'ACCG01',
        projectId: '',
        taskIds: [],
        agentId: 'atlas-hub-runtime',
      }),
      {},
    );

    const dry = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    let dryAssignCalls = 0;
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
      agentAssign: () => {
        dryAssignCalls += 1;
        throw new Error('dry-run must not assign agents');
      },
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.workspaceReconciled, true);
    assert.equal(proposed.record.documentsReconciled, false);
    assert.equal(proposed.record.projectId, 'existing-accg-onboarding');
    assert.deepEqual(proposed.record.taskIds, ['existing-accg-task-1']);
    assert.deepEqual(proposed.record.assignedAgents, []);
    assert.equal(proposed.record.agentAssignmentReview?.status, 'OPEN');
    assert.equal(proposed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(proposed.record.agentAssignmentReview?.send, false);
    assert.equal(dryAssignCalls, 0);
    assert.equal(proposed.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not invent assignees when assign fails or returns no id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const thrown = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    let failedAssigns = 0;
    const failed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: thrown.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      agentAssign: () => {
        failedAssigns += 1;
        throw new Error('agent assign failed');
      },
    });
    assert.equal(failed.ok, true);
    if (!failed.ok) return;
    assert.equal(failed.record.identityResolutionRequired, false);
    assert.equal(failed.record.workspaceReconciled, true);
    assert.equal(failed.record.documentsReconciled, false);
    assert.equal(failed.record.projectId, 'existing-accg-onboarding');
    assert.ok(failed.record.taskIds.includes('existing-accg-task-1'));
    assert.deepEqual(failed.record.assignedAgents, []);
    assert.equal(failed.record.agentAssignmentReview?.status, 'OPEN');
    assert.equal(failed.record.agentAssignmentReview?.agentReconciled, false);
    assert.equal(failed.record.agentAssignmentReview?.send, false);
    assert.equal(failedAssigns, 1);
    assert.equal(failed.events.includes('AGENTS_ASSIGNED'), false);

    const noId = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      tasks: [{
        id: 'existing-accg-task-1',
        title: 'Confirm primary client contact',
        projectId: 'existing-accg-onboarding',
      }],
    });
    let absentAssigns = 0;
    const absent = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: noId.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      agentAssign: () => {
        absentAssigns += 1;
        return { agentId: 'atlas-hub-runtime' };
      },
    });
    assert.equal(absent.ok, true);
    if (!absent.ok) return;
    assert.equal(absent.record.identityResolutionRequired, false);
    assert.equal(absent.record.workspaceReconciled, true);
    assert.equal(absent.record.documentsReconciled, false);
    assert.deepEqual(absent.record.assignedAgents, []);
    assert.equal(absent.record.agentAssignmentReview?.agentReconciled, false);
    assert.ok(absentAssigns > 0);
    assert.equal(absent.events.includes('AGENTS_ASSIGNED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('reuses existing entitled onboarding milestones and does not invent milestone ids', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const { sharepoint, counts } = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
      milestones: [
        { id: 'existing-ms-identity', title: 'Client identity verified', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-scope', title: 'Agreement / scope verified', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-docs', title: 'Documents complete', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-access', title: 'System access complete', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-kickoff-ready', title: 'Kickoff ready', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-kickoff-complete', title: 'Kickoff complete', projectId: 'existing-accg-onboarding' },
        { id: 'existing-ms-baseline', title: 'Initial operating baseline complete', projectId: 'existing-accg-onboarding' },
      ],
    });
    const result = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.identityResolutionRequired, false);
    assert.equal(result.record.workspaceReconciled, true);
    assert.equal(result.record.projectId, 'existing-accg-onboarding');
    assert.ok(result.record.milestoneIds.includes('existing-ms-identity'));
    assert.ok(result.record.milestoneIds.every((id) => Boolean(id)));
    assert.equal(result.record.milestoneReconciled, true);
    assert.equal(result.record.milestoneReview?.milestoneReconciled, true);
    assert.equal(result.record.milestoneReview?.reusedExisting, true);
    assert.equal(result.record.milestoneReview?.send, false);
    assert.equal(result.record.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(counts.createProject, 0);
    assert.ok(counts.listMilestones > 0);
    assert.equal(counts.createMilestone, 0);
    assert.equal(result.events.includes('MILESTONE_CREATED'), false);

    const dry = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    const proposed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: dry.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    assert.equal(proposed.record.workspaceReconciled, true);
    assert.equal(proposed.record.projectId, 'existing-accg-onboarding');
    assert.deepEqual(proposed.record.milestoneIds, []);
    assert.equal(proposed.record.milestoneReconciled, false);
    assert.equal(proposed.record.milestoneReview?.milestoneReconciled, false);
    assert.equal(proposed.record.milestoneReview?.status, 'OPEN');
    assert.equal(dry.counts.createMilestone, 0);
    assert.ok(dry.counts.listMilestones > 0);
    assert.equal(proposed.events.includes('MILESTONE_CREATED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates milestones only when entitled projectId exists and create returns an id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const live = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    const created = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.record.identityResolutionRequired, false);
    assert.equal(created.record.workspaceReconciled, true);
    assert.equal(created.record.projectId, 'existing-accg-onboarding');
    assert.ok(created.record.milestoneIds.length > 0);
    assert.ok(created.record.milestoneIds.every((id) => Boolean(id)));
    assert.equal(created.record.milestoneReconciled, true);
    assert.equal(created.record.milestoneReview?.milestoneReconciled, true);
    assert.equal(created.record.milestoneReview?.reusedExisting, false);
    assert.ok(created.events.includes('MILESTONE_CREATED'));
    assert.ok(live.counts.createMilestone > 0);
    assert.ok(live.counts.listMilestones > 0);
    assert.equal(live.counts.createProject, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not invent milestone ids when entitled create fails or returns no id', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const thrown = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    thrown.sharepoint.createMilestone = async () => {
      thrown.counts.createMilestone += 1;
      throw new Error('sharepoint milestone create failed');
    };
    const failed = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: thrown.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(failed.ok, true);
    if (!failed.ok) return;
    assert.equal(failed.record.identityResolutionRequired, false);
    assert.equal(failed.record.workspaceReconciled, true);
    assert.equal(failed.record.projectId, 'existing-accg-onboarding');
    assert.deepEqual(failed.record.milestoneIds, []);
    assert.equal(failed.record.milestoneReconciled, false);
    assert.equal(failed.record.milestoneReview?.status, 'OPEN');
    assert.equal(failed.record.milestoneReview?.milestoneReconciled, false);
    assert.equal(failed.record.milestoneReview?.send, false);
    assert.equal(thrown.counts.createMilestone, 1);
    assert.equal(failed.events.includes('MILESTONE_CREATED'), false);

    const noId = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    noId.sharepoint.createMilestone = (async () => {
      noId.counts.createMilestone += 1;
      return { title: 'Client identity verified', projectId: 'existing-accg-onboarding' };
    }) as SharePointPmService['createMilestone'];
    const absent = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: noId.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
    });
    assert.equal(absent.ok, true);
    if (!absent.ok) return;
    assert.equal(absent.record.identityResolutionRequired, false);
    assert.equal(absent.record.workspaceReconciled, true);
    assert.deepEqual(absent.record.milestoneIds, []);
    assert.equal(absent.record.milestoneReconciled, false);
    assert.equal(absent.record.milestoneReview?.milestoneReconciled, false);
    assert.ok(noId.counts.createMilestone > 0);
    assert.equal(absent.events.includes('MILESTONE_CREATED'), false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not invent communication context when search is empty, throws, or is the wrong client', async () => {
    const dir = withTempEnv();
    const cfg = loadConfig();
    const live = mockSharePoint({
      clients: [{ clientCode: 'ACCG01', displayName: 'ACCG' }],
      projects: [{ id: 'existing-accg-onboarding', name: 'ACCG01 - Onboarding', clientCode: 'ACCG01' }],
    });
    const reused = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => [
        { id: 'thread-accg-1', title: 'ACCG kickoff', clientCode: 'ACCG01', conversationId: 'conv-accg-1' },
      ],
    });
    assert.equal(reused.ok, true);
    if (!reused.ok) return;
    assert.equal(reused.record.communicationContextReconciled, true);
    assert.equal(reused.record.communicationContextReview?.communicationContextReconciled, true);
    assert.equal(reused.record.communicationContextReview?.reusedExisting, true);
    assert.equal(reused.record.communicationContextReview?.relatedThreadCount, 1);
    assert.deepEqual(reused.record.communicationContextReview?.relatedEmails.map((row) => row.id), ['thread-accg-1']);
    assert.equal(reused.record.operationsHandoff.relatedThreadCount, 1);
    assert.equal(reused.record.communicationContextReview?.send, false);
    assert.equal(reused.record.communicationContextReview?.autoRespond, false);
    assert.equal(reused.record.communicationContextReview?.outbound, false);
    assert.ok(reused.events.includes('COMMUNICATION_CONTEXT_RECONCILED'));

    const empty = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => [],
    });
    assert.equal(empty.ok, true);
    if (!empty.ok) return;
    assert.equal(empty.record.communicationContextReconciled, false);
    assert.equal(empty.record.communicationContextReview?.relatedThreadCount, 0);
    assert.deepEqual(empty.record.communicationContextReview?.relatedEmails, []);
    assert.equal(empty.record.operationsHandoff.relatedThreadCount, 0);

    const thrown = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => {
        throw new Error('thread search failed');
      },
    });
    assert.equal(thrown.ok, true);
    if (!thrown.ok) return;
    assert.equal(thrown.record.communicationContextReconciled, false);
    assert.deepEqual(thrown.record.communicationContextReview?.relatedThreads, []);
    assert.equal(thrown.record.operationsHandoff.relatedThreadCount, 0);

    const dry = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      dryRun: true,
    });
    assert.equal(dry.ok, true);
    if (!dry.ok) return;
    assert.equal(dry.record.communicationContextReconciled, false);
    assert.equal(dry.record.communicationContextReview?.relatedThreadCount, 0);
    assert.deepEqual(dry.record.communicationContextReview?.relatedEmails, []);

    const foreign = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => [
        { id: 'thread-pdg', title: 'PDG01 thread', clientCode: 'PDG01' },
      ],
    });
    assert.equal(foreign.ok, true);
    if (!foreign.ok) return;
    assert.equal(foreign.record.communicationContextReconciled, false);
    assert.deepEqual(foreign.record.communicationContextReview?.relatedEmails, []);
    assert.equal(JSON.stringify(foreign.record.communicationContextReview).includes('PDG01'), false);
    assert.equal(foreign.record.communicationContextReview?.send, false);
    assert.equal(foreign.record.communicationContextReview?.autoRespond, false);

    const identity = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: live.sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => [
        { id: 'thread-accg-1', title: 'ACCG kickoff', clientCode: 'ACCG01' },
      ],
    });
    const blockedIdentity = await runClientOnboardingAutomation({
      cfg,
      principal,
      dataDir: dir,
      sharepoint: mockSharePoint({ clients: [{ clientCode: 'PDG01', displayName: 'Prodigy' }] }).sharepoint,
      workflow: onboardingWorkflow('ACCG01'),
      commsSearch: async () => [
        { id: 'thread-should-not-attach', title: 'should not attach', clientCode: 'ACCG01' },
      ],
    });
    assert.equal(blockedIdentity.ok, true);
    if (!blockedIdentity.ok) return;
    assert.equal(blockedIdentity.record.identityResolutionRequired, true);
    assert.equal(blockedIdentity.record.communicationContextReconciled, false);
    assert.deepEqual(blockedIdentity.record.communicationContextReview?.relatedEmails, []);
    assert.equal(identity.ok, true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('restore env', () => {
    process.env = prevEnv;
  });
});
