/**
 * Live Client pilot brief for PDG01 / HFD01 (reusable composition).
 * Authority: OBSERVE / RECOMMEND / PREPARE only. Never invents facts.
 */
import type {
  LiveClientPilotAction,
  LiveClientPilotBrief,
  OperatorCommercialContext,
} from './types.ts';

export type { LiveClientPilotAction, LiveClientPilotBrief };

export function buildLiveClientPilotBrief(
  ctx: OperatorCommercialContext,
  extras?: { hydratedFrom?: string[] },
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

  for (const signal of ctx.gcc.signals) {
    const summary = signal.summary || signal.signalType.replace(/_/g, ' ');
    whatIsHappening.push(`GCC signal (${signal.signalType}): ${summary}`);
    whyItMatters.push('GCC observation is available in Atlas without opening GCC for routine status.');
    whatChanged.push(`GCC observation recorded at ${signal.emittedAt}.`);
    known.push(`GCC value signal ${signal.signalId} on record (observation-only; copiesLedger=false).`);
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
    whatIsHappening.push(`Growth360 attribution recorded (${source} · ${campaign}).`);
    whyItMatters.push('Growth360 observation is available in Atlas without opening Growth360 for routine status.');
    whatChanged.push(`Growth360 attribution recorded at ${attr.recordedAt}.`);
    known.push(`Growth360 attribution on record for ${clientCode} (canExecute remains false).`);
    provenance.push({
      source: 'growth360-module-ingest',
      detail: `idempotencyKey=${attr.idempotencyKey}; source=${source}; campaignId=${attr.lineage.campaignId || 'n/a'}`,
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
  };
}
