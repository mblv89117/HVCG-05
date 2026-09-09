/** Wave 7 — canonical Atlas authority vocabulary. */
import type { AuthorityClass } from './envelope.ts';

export const AUTHORITY_CLASSES = [
  'OBSERVE',
  'RECOMMEND',
  'PREPARE',
  'EXECUTE_WITH_APPROVAL',
  'POLICY_BASED_AUTONOMOUS_EXECUTION',
  'PROHIBITED_WITHOUT_HUMAN_AUTHORIZATION',
] as const satisfies readonly AuthorityClass[];

export const DEFAULT_MATERIAL_AUTHORITY: AuthorityClass = 'EXECUTE_WITH_APPROVAL';

/** Wave 8 hard default — never infer send authority. */
export const GLOBAL_AUTO_RESPOND = false as const;

export type CommunicationRespondMode = 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'POLICY_AUTO_RESPOND';

export type WorkflowStatusEnvelope = {
  workflowId: string;
  clientCode: string;
  authorityClass: AuthorityClass;
  status: string;
  approvalInterface?: string;
};

export type { AuthorityClass };
