/**
 * Live Client operating brief — reusable composition (PDG01 / HFD01 / ACCG01).
 * Authority: OBSERVE / RECOMMEND / PREPARE only. Never invents facts.
 */
import type { OperatorOperatingPicture } from '../operatorDesk/types.ts';
import {
  composeClientTruth,
  type ClientTruthModel,
  type WorkspaceTruthSnapshot,
} from './clientTruth.ts';
import type {
  LiveClientPilotAction,
  LiveClientPilotBrief,
  OperatorCommercialContext,
} from './types.ts';
import { growth360ApprovalId } from '../../modules/ingest/campaignApproval.ts';
import { gccObservationHonestyLine } from '../../modules/ingest/gccValueSignal.ts';

export type { LiveClientPilotAction, LiveClientPilotBrief };

export function buildLiveClientPilotBrief(
  ctx: OperatorCommercialContext,
  extras?: {
    hydratedFrom?: string[];
    durableStatus?: string;
    durableReason?: string;
    truncated?: boolean;
    workspace?: WorkspaceTruthSnapshot;
    picture?: OperatorOperatingPicture;
  },
): LiveClientPilotBrief {
  const clientCode = ctx.clientCode || 'UNKNOWN';
  const whatIsHappening: string[] = [];
  const whyItMatters: string[] = [];
  const whatChanged: string[] = [];
  const known: string[] = [`ClientCode ${clientCode} is entitled on Atlas Hub.`];
  const unknown: string[] = [];
  const nextActions: LiveClientPilotAction[] = [];
  const provenance: Array<{ source: string; detail: string }> = [];
  const approvalRequired: string[] = [
    'External client communications remain unsent drafts (GLOBAL_AUTO_RESPOND=false).',
    'Money movement, contracts/signatures, and lender/investor submissions are never autonomous.',
  ];

  if (extras?.hydratedFrom?.length) {
    provenance.push({
      source: 'module-ingest-hydrate',
      detail: `Commercial observations hydrated from: ${extras.hydratedFrom.join(', ')}`,
    });
  }
  if (extras?.durableStatus === 'unavailable' || extras?.durableStatus === 'error') {
    unknown.push(
      `Durable Azure Table ingest is currently ${extras.durableStatus}` +
        (extras.durableReason ? ` (${extras.durableReason})` : '') +
        '. Atlas is not treating this as an empty observation set.',
    );
  }
  if (extras?.truncated || extras?.durableStatus === 'truncated') {
    unknown.push(
      'Durable Azure Table ingest read hit a safety ceiling (TRUNCATED). Hydration may be incomplete.',
    );
  }

  for (const signal of ctx.gcc.signals) {
    const line = gccObservationHonestyLine(signal);
    whatIsHappening.push(`GCC signal: ${line}`);
    whyItMatters.push('GCC observation is available in Atlas without opening GCC for routine status.');
    whatChanged.push(`GCC observation recorded at ${signal.emittedAt}.`);
    known.push(`GCC value signal ${signal.signalId} on record. ${line}`);
    provenance.push({
      source: 'gcc-module-ingest',
      detail: `idempotencyKey=${signal.idempotencyKey}; signalType=${signal.signalType}`,
    });
    nextActions.push({
      text: `Review GCC ${signal.signalType.replace(/_/g, ' ')} observation and decide if an internal follow-up task is warranted.`,
      authorityClass: 'RECOMMEND',
      approvalRequired: false,
      source: 'gcc-value-signal',
      why: 'Durable GCC OBSERVE traffic is present for this ClientCode.',
    });
    nextActions.push({
      text: 'PREPARE an internal status note linking this GCC signal to the Live Client workspace (do not email client).',
      authorityClass: 'PREPARE',
      approvalRequired: true,
      source: 'gcc-value-signal',
      why: 'External send remains approval-gated.',
    });
  }

  for (const attr of ctx.gtm.attributions) {
    const campaign = attr.lineage.campaignId || 'campaign';
    const source = attr.lineage.source || 'growth_360';
    const approvalId = growth360ApprovalId(attr.idempotencyKey);
    whatIsHappening.push(
      `Growth360 attribution recorded (${source} · ${campaign}). Approval ${approvalId} at /approvals and /clients/${clientCode}.`,
    );
    whyItMatters.push('Growth360 observation is available in Atlas without opening Growth360 for routine status.');
    whatChanged.push(`Growth360 attribution recorded at ${attr.recordedAt}.`);
    known.push(
      `Growth360 attribution on record for ${clientCode} (${approvalId}; canExecute remains false).`,
    );
    provenance.push({
      source: 'growth360-module-ingest',
      detail: `approvalId=${approvalId}; idempotencyKey=${attr.idempotencyKey}; source=${source}; campaignId=${attr.lineage.campaignId || 'n/a'}`,
    });
    nextActions.push({
      text: `Review Growth360 ${campaign} attribution and PREPARE a growth follow-up checklist (no paid launch).`,
      authorityClass: 'PREPARE',
      approvalRequired: true,
      source: 'growth360-attribution',
      why: 'Paid campaign launch remains Owner-gated; Atlas may only prepare.',
    });
    nextActions.push({
      text: 'Confirm canExecute=false remains enforced for this Growth360 observation.',
      authorityClass: 'OBSERVE',
      approvalRequired: false,
      source: 'growth360-attribution',
      why: 'Security invariant for Growth360 → Atlas path.',
    });
    approvalRequired.push('Material paid campaign launch requires Owner approval.');
  }

  for (const assessment of ctx.copilot.assessments) {
    whatIsHappening.push(
      `Copilot/MRI assessment on record: ${assessment.summary || assessment.assessmentId}`,
    );
    known.push('MRI/Copilot assessment is observation-only and must not mutate CRM autonomously.');
    provenance.push({
      source: 'copilot-mri-ingest',
      detail: `idempotencyKey=${assessment.idempotencyKey}`,
    });
  }

  if (!ctx.gcc.signals.length) {
    unknown.push(ctx.gcc.honesty.emptyReason || 'No GCC value signal on record for this ClientCode.');
  }
  if (!ctx.gtm.attributions.length && !ctx.gtm.crmSources.length) {
    unknown.push(
      ctx.gtm.honesty.emptyReason || 'No Growth360/GTM attribution on record for this ClientCode.',
    );
  }
  if (!ctx.copilot.assessments.length && !ctx.copilot.preCall.length) {
    unknown.push(
      ctx.copilot.honesty.emptyReason || 'No Copilot/MRI assessment on record for this ClientCode.',
    );
  }
  if (!ctx.opportunities.length) {
    unknown.push(
      'No entitled SharePoint opportunities projected into commercial context for this ClientCode.',
    );
  }

  const truth = ctx.clientCode
    ? composeClientTruth({
        clientCode: ctx.clientCode,
        commercial: ctx,
        workspace: extras?.workspace,
        picture: extras?.picture,
      })
    : undefined;
  const composed: ClientTruthModel | undefined =
    truth && 'failClosed' in truth ? undefined : truth;

  if (composed) {
    const workspaceHappening = [
      composed.answers.workingOn.text,
      composed.engagements.summary,
      composed.documents.summary,
    ].filter(
      (line) =>
        Boolean(line) &&
        !/NOT_CERTIFIED/i.test(line) &&
        !/no entitled projects and no recovered/i.test(line) &&
        !/projects=MISSING/i.test(line) &&
        !/no entitled document index rows/i.test(line) &&
        !/no entitled engagement rows and no recovered/i.test(line),
    );
    const onlyModuleEmpty =
      whatIsHappening.length === 1 && /No durable module commercial observations/i.test(whatIsHappening[0] || '');
    if (workspaceHappening.length && (onlyModuleEmpty || !whatIsHappening.length)) {
      whatIsHappening.length = 0;
      whatIsHappening.push(...workspaceHappening.slice(0, 6));
    } else if (workspaceHappening.length) {
      whatIsHappening.push(...workspaceHappening.slice(0, 3));
    }
    if (composed.operatingPosture !== 'STANDARD') {
      whyItMatters.push(
        `${composed.displayName || clientCode} is an already-active client. Operating posture is ${composed.operatingPosture} — do not treat this as a brand-new signup.`,
      );
    }
    if (composed.answers.changed.classification === 'CONFIRMED') {
      whatChanged.push(composed.answers.changed.text);
    }
    known.push(composed.identity.summary);
    known.push(`financialContext=${composed.financialContext.completeness} (${composed.financialContext.classification})`);
    if (ctx.gcc.signals.length) {
      known.push(composed.financialContext.summary);
    }
    known.push(`growthContext=${composed.growthContext.completeness} (${composed.growthContext.classification})`);
    known.push(`contacts=${composed.contacts.completeness} (${composed.contacts.classification})`);
    if (composed.contacts.classification === 'MISSING') {
      unknown.push(composed.contacts.summary);
    }
    if (composed.financialContext.classification === 'NOT_CERTIFIED') {
      unknown.push(composed.financialContext.summary);
    }
    if (composed.growthContext.classification === 'NOT_CERTIFIED') {
      unknown.push(composed.growthContext.summary);
    }
    provenance.push(...composed.identity.provenance);
    provenance.push(...composed.financialContext.provenance.slice(0, 2));
    provenance.push(...composed.growthContext.provenance.slice(0, 2));
    if (composed.writePolicy === 'read_only') {
      approvalRequired.push(
        'Hub writes for this ClientCode remain blocked unless an approved write window exists.',
      );
    }
    if (composed.contactCandidates.length) {
      nextActions.push({
        text: `PREPARE contact reconciliation for ${composed.contactCandidates.length} candidate(s) found in entitled sources. Do not silently create HVCG_Contacts.`,
        authorityClass: 'PREPARE',
        approvalRequired: true,
        source: 'contact-candidate-reconciliation',
        why: 'Candidate emails exist on entitled communications/engagements; canonical contacts are still MISSING.',
      });
    }
  }

  if (!whatIsHappening.length) {
    whatIsHappening.push(
      'No durable module commercial observations are currently projected for this ClientCode in Atlas.',
    );
  }
  if (!whyItMatters.length) {
    whyItMatters.push(
      'Until GCC/Growth360 observations hydrate into Live Client, operators must not invent status from empty panels.',
    );
  }
  if (!whatChanged.length) {
    whatChanged.push('No recent module observation deltas are available on this Hub read path.');
  }
  if (!nextActions.length) {
    nextActions.push({
      text: 'OBSERVE SharePoint workspace sections and keep commercial lanes honest-empty until durable ingest projects.',
      authorityClass: 'OBSERVE',
      approvalRequired: false,
      source: 'live-client-pilot',
      why: 'Prefer honest empty states over fabricated completeness.',
    });
  }

  return {
    clientCode,
    whatIsHappening,
    whyItMatters,
    whatChanged,
    known,
    unknown,
    nextActions,
    provenance,
    approvalRequired,
    ...(composed
      ? {
          operatingPosture: composed.operatingPosture,
          writePolicy: composed.writePolicy,
          financialContext: composed.financialContext.completeness,
          growthContext: composed.growthContext.completeness,
          capitalContext: composed.capitalContext.completeness,
          contactsCompleteness: composed.contacts.completeness,
          queues: composed.queues,
          contactCandidates: composed.contactCandidates.map((c) => ({
            displayName: c.displayName,
            email: c.email,
            source: c.source,
            sourceId: c.sourceId,
            classification: c.classification,
            writeStatus: c.writeStatus,
          })),
        }
      : {}),
  };
}
