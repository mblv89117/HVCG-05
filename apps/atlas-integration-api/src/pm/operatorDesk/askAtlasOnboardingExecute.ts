/**
 * Ask Atlas governed onboarding execution — reuse entitled workflow or
 * instantiate the existing client_onboarding template, then run automation.
 * Status questions must not call this path.
 */

import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import {
  answerOnboardingContext,
  findEntitledOnboardingWorkflowDefinition,
  resolveEntitledClientCodeFromQuestion,
  runClientOnboardingAutomation,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import type { OnboardingRunRecord } from './onboardingState.ts';
import {
  listVisibleDefinitions,
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
  type WorkflowDefinitionRecord,
} from './workflowDefinitions.ts';
import { instantiateWorkflowFromTemplate } from './workflowTemplateService.ts';

export type OnboardingAskAtlasExecution = {
  executed: boolean;
  instantiated: boolean;
  reusedWorkflow: boolean;
  match: EntitledClientCodeMatch;
  workflow?: WorkflowDefinitionRecord;
  record: OnboardingRunRecord | null;
  answer: string;
  error?: string;
};

export async function executeEntitledOnboardingFromQuestion(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  sharepoint: SharePointPmService | null;
  question: string;
  entitledCodes?: readonly string[];
}): Promise<OnboardingAskAtlasExecution> {
  const entitled = opts.entitledCodes ?? entitledClientCodes(opts.principal);
  const match = resolveEntitledClientCodeFromQuestion(opts.question, entitled);

  if (match.kind !== 'exact' && match.kind !== 'unique_prefix') {
    return {
      executed: false,
      instantiated: false,
      reusedWorkflow: false,
      match,
      record: null,
      answer: answerOnboardingContext(opts.question, null, { match }),
    };
  }

  const overlay = readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(opts.dataDir));
  const visible = listVisibleDefinitions(overlay, opts.principal);
  let workflow = findEntitledOnboardingWorkflowDefinition(visible, match.clientCode);
  let instantiated = false;
  let reusedWorkflow = Boolean(workflow);

  if (!workflow) {
    const created = await instantiateWorkflowFromTemplate({
      principal: opts.principal,
      dataDir: opts.dataDir,
      templateId: 'client_onboarding',
      inputs: { clientCode: match.clientCode },
      sourceConversation: opts.question,
    });
    if (!created.ok) {
      return {
        executed: false,
        instantiated: false,
        reusedWorkflow: false,
        match,
        record: null,
        answer: answerOnboardingContext(opts.question, null, { match }),
        error: created.error,
      };
    }
    workflow = created.payload.record;
    instantiated = true;
    reusedWorkflow = false;
  }

  const result = await runClientOnboardingAutomation({
    cfg: opts.cfg,
    principal: opts.principal,
    dataDir: opts.dataDir,
    sharepoint: opts.sharepoint,
    workflow,
    dryRun: false,
  });

  if (!result.ok) {
    return {
      executed: false,
      instantiated,
      reusedWorkflow,
      match,
      workflow,
      record: result.record ?? null,
      answer: answerOnboardingContext(opts.question, result.record ?? null, { match }),
      error: result.error,
    };
  }

  const existingProject = result.record.projectId
    ? { name: result.record.projectName ?? result.record.projectId, clientCode: match.clientCode }
    : undefined;
  const origin = instantiated
    ? 'instantiated existing client_onboarding template'
    : 'reused existing entitled onboarding workflow';
  const answer = [
    `Executed governed Client Onboarding for ${match.clientCode} (${origin}).`,
    answerOnboardingContext(opts.question, result.record, {
      match,
      existingProject,
      existingWorkflow: { name: workflow.name, clientCode: match.clientCode, workflowType: 'client_onboarding' },
    }),
  ].join('\n');

  return {
    executed: true,
    instantiated,
    reusedWorkflow,
    match,
    workflow,
    record: result.record,
    answer,
  };
}
