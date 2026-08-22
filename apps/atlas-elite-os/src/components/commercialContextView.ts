import type { DeskCommercialContext, OperatorCommercialContext } from '../integrations/hub/pmApi';

export interface CommercialLaneCopy {
  title: string;
  available: boolean;
  count: number;
  emptyReason: string;
  lines: string[];
}

export interface CommercialContextCopy {
  title: string;
  subtitle: string;
  outboundOff: true;
  paidAdsOff: true;
  lanes: CommercialLaneCopy[];
  rows: Array<{
    clientCode: string;
    href?: string;
    detail: string;
  }>;
}

const GCC_EMPTY =
  'No GCC value signal on record. Live GCC dispatch is OFF. Atlas does not invent LTV, renewal, or expansion numbers.';
const COPILOT_EMPTY =
  'No Agent Copilot assessment or pre-call brief on record. Observation-only; Atlas does not invent MRI results.';
const GTM_EMPTY =
  'No GTM attribution or campaign origin on record. Live outbound and paid ads are OFF. Atlas does not invent campaign history.';

function deskFromOperator(ctx: OperatorCommercialContext): DeskCommercialContext {
  return {
    contractVersion: 'atlas-operator-commercial-context.v1',
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    entitledClientCount: ctx.clientCode ? 1 : ctx.opportunities.length,
    gcc: { ...ctx.gcc.honesty, count: ctx.gcc.signals.length },
    copilot: {
      ...ctx.copilot.honesty,
      count: ctx.copilot.assessments.length + ctx.copilot.preCall.length + ctx.copilot.sharepoint.length,
    },
    gtm: { ...ctx.gtm.honesty, count: ctx.gtm.attributions.length + ctx.gtm.crmSources.length },
    rows: (ctx.clientCode ? [ctx.clientCode] : ctx.opportunities.map((o) => o.clientCode)).filter(Boolean).map((clientCode) => {
      const opp = ctx.opportunities.find((o) => o.clientCode === clientCode);
      return {
        clientCode,
        opportunityId: opp?.opportunityId,
        title: opp?.title,
        stage: opp?.stage,
        capitalHandoffStatus: opp?.capitalHandoffStatus,
        hasGcc: ctx.gcc.signals.some((s) => s.clientCode === clientCode),
        hasCopilot:
          ctx.copilot.assessments.some((a) => a.clientCode === clientCode) ||
          ctx.copilot.preCall.some((b) => b.atlasClientCode === clientCode) ||
          ctx.copilot.sharepoint.some((s) => s.clientCode === clientCode),
        hasGtm:
          ctx.gtm.attributions.some((a) => a.clientCode === clientCode) ||
          ctx.gtm.crmSources.some((s) => s.clientCode === clientCode),
      };
    }),
  };
}

export function commercialContextCopy(
  input: DeskCommercialContext | OperatorCommercialContext | null | undefined,
): CommercialContextCopy {
  const desk: DeskCommercialContext | undefined = input
    ? 'rows' in input && 'entitledClientCount' in input
      ? (input as DeskCommercialContext)
      : deskFromOperator(input as OperatorCommercialContext)
    : undefined;
  const operator = input && 'gcc' in input && 'signals' in ((input as OperatorCommercialContext).gcc || {})
    ? (input as OperatorCommercialContext)
    : undefined;

  const gccLines =
    operator?.gcc.signals.map((s) =>
      [s.signalType.replace(/_/g, ' '), s.severity, s.summary].filter(Boolean).join(' · '),
    ) || [];
  const copilotLines = operator
    ? [
        ...operator.copilot.assessments.map((a) => a.summary || `Assessment ${a.assessmentId}`),
        ...operator.copilot.preCall.map((b) => b.summary || `Pre-call ${b.briefId}`),
        ...operator.copilot.sharepoint.map((s) => s.copilotSummary || s.copilotKeywords || '').filter(Boolean),
      ]
    : [];
  const gtmLines = operator
    ? [
        ...operator.gtm.attributions.map((a) =>
          [a.lineage.source, a.lineage.campaignId].filter(Boolean).join(' · '),
        ),
        ...operator.gtm.crmSources.map((s) => [s.source, s.leadSourceDetail].filter(Boolean).join(' · ')),
      ].filter(Boolean)
    : [];

  return {
    title: 'Commercial context',
    subtitle: 'Read-only GCC / Copilot / GTM records. Outbound and paid ads stay off.',
    outboundOff: true,
    paidAdsOff: true,
    lanes: [
      {
        title: 'GCC value',
        available: Boolean(desk?.gcc.available),
        count: desk?.gcc.count ?? 0,
        emptyReason: desk?.gcc.emptyReason || GCC_EMPTY,
        lines: gccLines,
      },
      {
        title: 'Agent Copilot',
        available: Boolean(desk?.copilot.available),
        count: desk?.copilot.count ?? 0,
        emptyReason: desk?.copilot.emptyReason || COPILOT_EMPTY,
        lines: copilotLines,
      },
      {
        title: 'GTM origin',
        available: Boolean(desk?.gtm.available),
        count: desk?.gtm.count ?? 0,
        emptyReason: desk?.gtm.emptyReason || GTM_EMPTY,
        lines: gtmLines,
      },
    ],
    rows: (desk?.rows || []).map((row) => ({
      clientCode: row.clientCode,
      href: row.opportunityId
        ? `/opportunities/${encodeURIComponent(row.opportunityId)}`
        : `/clients/${encodeURIComponent(row.clientCode)}`,
      detail: [
        row.title,
        row.stage,
        row.capitalHandoffStatus ? `Handoff ${row.capitalHandoffStatus}` : null,
        row.hasGcc ? 'GCC recorded' : null,
        row.hasCopilot ? 'Copilot recorded' : null,
        row.hasGtm ? 'GTM recorded' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  };
}

export function commercialContextForbidsLiveActions(copy: CommercialContextCopy): boolean {
  return copy.outboundOff && copy.paidAdsOff && !copy.lanes.some((lane) => /invent/i.test(lane.title));
}
