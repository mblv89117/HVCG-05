import {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_SYN01_OBSERVATION,
  EVENT_GCC_VALUE_SIGNAL,
  EVENT_MRI_FINDINGS,
  SCHEMA_360_CAMPAIGN_APPROVAL,
  validateEnvelope,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import { getIdentityRegistry } from '../../identity/registry.ts';

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
    if (envelope.authorityClass !== 'OBSERVE' && envelope.authorityClass !== 'RECOMMEND') {
      return {
        ok: false,
        status: 400,
        code: 'AUTHORITY_NOT_OBSERVE',
        message: 'GCC ingest is observation-only.',
      };
    }
    if (envelope.payload.autoProvision === true) {
      return {
        ok: false,
        status: 400,
        code: 'AUTO_PROVISION_FORBIDDEN',
        message: 'GCC auto-provision remains false.',
      };
    }
    const impact = envelope.payload.financialImpact;
    if (
      envelope.confidence === 'INFERRED' &&
      typeof impact === 'number' &&
      impact > 0
    ) {
      return {
        ok: false,
        status: 400,
        code: 'INFERRED_IMPACT_FORBIDDEN',
        message: 'INFERRED signals must not claim financialImpact > 0.',
      };
    }
    const orgId = envelope.payload.organizationId;
    if (typeof orgId === 'string' && orgId) {
      const dual = registry.dualResolve({
        clientCode: envelope.clientCode,
        system: 'gcc',
        localId: orgId,
      });
      if (!dual.ok) {
        return {
          ok: false,
          status: 403,
          code: 'GCC_ORG_CLIENTCODE_MISMATCH',
          message: 'ClientCode and GCC organizationId disagree or are unmapped.',
        };
      }
    }
    notes.push('gcc_observation_accepted');
    return { ok: true, envelope, notes };
  }

  if (envelope.eventType === EVENT_360_CAMPAIGN_APPROVAL) {
    if (envelope.schemaVersion !== SCHEMA_360_CAMPAIGN_APPROVAL) {
      return {
        ok: false,
        status: 400,
        code: 'SCHEMA_MISMATCH',
        message: 'Expected 360_campaign_approval_v1.',
      };
    }
    if (envelope.payload.canExecute === true) {
      return {
        ok: false,
        status: 400,
        code: 'PAID_EXECUTE_FORBIDDEN',
        message: '360 campaign execute remains prohibited at Hub ingest.',
      };
    }
    const slug = envelope.payload.organizationSlug;
    if (slug === 'hart-family-dental' && envelope.clientCode !== 'HFD01') {
      return {
        ok: false,
        status: 403,
        code: 'HART_CLIENTCODE_REQUIRED',
        message: 'Hart Family Dental requires ClientCode HFD01.',
      };
    }
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
