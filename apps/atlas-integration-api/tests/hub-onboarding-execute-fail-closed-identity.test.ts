import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { WorkflowDefinitionRecord } from '../src/pm/operatorDesk/workflowDefinitions.ts';
import {
  classifyOnboardingAskAtlasIntent,
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
}): {
  sharepoint: SharePointPmService;
  projects: ProjectRow[];
  tasks: TaskRow[];
  milestones: MilestoneRow[];
  counts: { createProject: number; createTask: number; createMilestone: number };
} {
  const projects = opts.projects ?? [];
  const tasks: TaskRow[] = [];
  const milestones: MilestoneRow[] = [];
  const counts = { createProject: 0, createTask: 0, createMilestone: 0 };
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
    listAuthorizedTasks: async () => tasks,
    createTask: async (_principal: AtlasPrincipal, body: { title?: string; projectId?: string }) => {
      counts.createTask += 1;
      const created = { id: `task-${counts.createTask}`, title: String(body.title), projectId: body.projectId };
      tasks.push(created);
      return created;
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
    assert.equal(result.record.clientCode, 'ACCG01');
    assert.equal(result.record.projectId, undefined);
    assert.deepEqual(result.record.taskIds, []);
    assert.deepEqual(result.record.milestoneIds, []);
    assert.equal(result.record.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(result.record.identityReview.send, false);
    assert.equal(result.record.identityReview.outbound, false);
    assert.equal(result.record.identityReview.liveGtmOutbound, false);
    assert.equal(result.record.identityReview.capitalSubmit, false);
    assert.equal(result.record.operationsHandoff.send, false);
    assert.equal(counts.createProject, 0);
    assert.equal(counts.createTask, 0);
    assert.equal(counts.createMilestone, 0);
    assert.equal(result.events.includes('PROJECT_CREATED'), false);
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
    assert.equal(result.record.projectId, undefined);
    assert.deepEqual(result.record.taskIds, []);
    assert.deepEqual(result.record.milestoneIds, []);
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
    assert.equal(created.record.projectId, 'proj-1');
    assert.equal(live.counts.createProject, 1);
    assert.ok(live.counts.createTask > 0);
    assert.ok(created.events.includes('PROJECT_CREATED'));

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
    assert.equal(proposed.record.projectId, undefined);
    assert.equal(dry.counts.createProject, 0);
    assert.equal(dry.counts.createTask, 0);
    assert.equal(dry.counts.createMilestone, 0);
    assert.equal(proposed.events.includes('PROJECT_CREATED'), false);
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
    assert.equal(thrown.counts.createProject, 1);
    assert.equal(thrown.counts.createTask, 0);
    assert.equal(thrown.counts.createMilestone, 0);
    assert.equal(failed.events.includes('PROJECT_CREATED'), false);

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
    assert.equal(noId.counts.createProject, 1);
    assert.equal(noId.counts.createTask, 0);
    assert.equal(noId.counts.createMilestone, 0);
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

  it('restore env', () => {
    process.env = prevEnv;
  });
});
