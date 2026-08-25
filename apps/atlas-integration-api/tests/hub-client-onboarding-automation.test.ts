import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { WorkflowDefinitionRecord } from '../src/pm/operatorDesk/workflowDefinitions.ts';
import {
  answerOnboardingContext,
  mapsToOnboardingContextIntent,
  runClientOnboardingAutomation,
} from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
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
      provenance: 'test',
    };
    const answer = answerOnboardingContext('What documents are missing for ACCG?', record);
    assert.match(answer, /W-9/);
  });

  it('restore env', () => {
    process.env = prevEnv;
  });
});
