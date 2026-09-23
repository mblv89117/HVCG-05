import {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_SYN01_OBSERVATION,
  EVENT_GCC_VALUE_SIGNAL,
  EVENT_MRI_FINDINGS,
  validateEnvelope,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import { getIdentityRegistry } from '../../identity/registry.ts';
import { evaluateCampaignApproval } from './campaignApproval.ts';
import { evaluateGccValueSignal } from './gccValueSignal.ts';

export type HandlerResult =
  | { ok: true; envelope: AtlasIntegrationEnvelope; notes: string[] }
  | { ok: false; status: number; code: string; message: string };

export function handleModuleEnvelope(raw: unknown): HandlerResult {
  const validated = validateEnvelope(raw);
  if (!validated.ok) {
    const status = validated.reason.includes('CLIENT_CODE') ? 403 : 400;
    return { ok: false, status, code: validated.reason, message: 'Envelope validation failed.' };
  }
  const envelope = validated.envelope;
  const registry = getIdentityRegistry();
  if (!registry.getByClientCode(envelope.clientCode)) {
    return {
      ok: false,
      status: 403,
      code: 'CLIENTCODE_UNMAPPED',
      message: 'Unknown ClientCode — fail closed.',
    };
  }

  const notes: string[] = [];

  if (
    envelope.eventType === EVENT_GCC_VALUE_SIGNAL ||
    envelope.eventType === EVENT_GCC_SYN01_OBSERVATION
  ) {
    const decision = evaluateGccValueSignal(envelope);
    if (!decision.ok) return decision;
    notes.push('gcc_observation_accepted');
    return { ok: true, envelope, notes };
  }

  if (envelope.eventType === EVENT_360_CAMPAIGN_APPROVAL) {
    const decision = evaluateCampaignApproval(envelope);
    if (!decision.ok) return decision;
    notes.push('360_approval_received_execute_false');
    return { ok: true, envelope, notes };
  }

  if (envelope.eventType === EVENT_MRI_FINDINGS) {
    if (envelope.authorityClass === 'POLICY_BASED_AUTONOMOUS_EXECUTION') {
      return {
        ok: false,
        status: 400,
        code: 'AUTONOMOUS_FORBIDDEN',
        message: 'MRI findings require human review before CRM mutation.',
      };
    }
    notes.push('mri_findings_observation_accepted');
    return { ok: true, envelope, notes };
  }

  return {
    ok: false,
    status: 400,
    code: 'UNSUPPORTED_EVENT',
    message: `Unsupported eventType: ${envelope.eventType}`,
  };
}
