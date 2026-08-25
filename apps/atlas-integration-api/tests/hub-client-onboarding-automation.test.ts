import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { WorkflowDefinitionRecord } from '../src/pm/operatorDesk/workflowDefinitions.ts';
import {
  answerOnboardingContext,
  ENTITLED_CANONICAL_CLIENT_CODES,
  findOnboardingRunForQuestion,
  mapsToOnboardingContextIntent,
  resolveEntitledClientCodeFromQuestion,
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

  it('restore env', () => {
    process.env = prevEnv;
  });
});
