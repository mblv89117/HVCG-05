import { entitledClientCodes } from '../sharepoint/authz.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import type { SharePointLead, SharePointOpportunity } from '../sharepoint/repository.ts';
import { EMPTY_REASON, type CommercialOverlay, type DeskCommercialContext, type Honesty, type OperatorCommercialContext } from './types.ts';

export interface CommercialSource {
  principal: AtlasPrincipal;
  overlay: CommercialOverlay;
  opportunities?: SharePointOpportunity[];
  leads?: SharePointLead[];
  clientCode?: string;
}

function honesty(available: boolean, emptyReason: string): Honesty {
  return available ? { available: true, recordedOnly: true } : { available: false, recordedOnly: true, emptyReason };
}

function entitledSet(principal: AtlasPrincipal): Set<string> {
  return new Set(entitledClientCodes(principal));
}

function inScope(code: string | undefined, entitled: Set<string>, filter?: string): boolean {
  if (!code || !isCanonicalClientCode(code) || code === '*') return false;
  if (!entitled.has(code)) return false;
  if (filter && code !== filter) return false;
  return true;
}

export function buildOperatorCommercialContext(source: CommercialSource): OperatorCommercialContext {
  const entitled = entitledSet(source.principal);
  const filter = source.clientCode && isCanonicalClientCode(source.clientCode) ? source.clientCode : undefined;
  const opportunities = (source.opportunities || []).filter((o) => inScope(o.clientCode, entitled, filter));
  const leads = (source.leads || []).filter((l) => inScope(l.clientCode, entitled, filter));

  const gccSignals = source.overlay.gccSignals.filter((s) => inScope(s.clientCode, entitled, filter));
  const preCall = source.overlay.preCallBriefs.filter((b) => inScope(b.atlasClientCode, entitled, filter));
  const assessments = source.overlay.copilotAssessments.filter((a) => inScope(a.clientCode, entitled, filter));
  const attributions = source.overlay.attributions.filter((a) => inScope(a.clientCode, entitled, filter));

  const sharepoint = opportunities
    .map((o) => ({
      opportunityId: o.id,
      clientCode: o.clientCode,
      copilotSummary: o.copilotSummary,
      copilotKeywords: o.copilotKeywords,
    }))
    .filter((row) => Boolean(row.copilotSummary || row.copilotKeywords));

  const crmSources = leads
    .filter((l) => Boolean(l.source || l.leadSourceDetail))
    .map((l) => ({
      leadId: l.id,
      clientCode: l.clientCode,
      source: l.source,
      leadSourceDetail: l.leadSourceDetail,
    }));

  const commercial = opportunities.map((o) => {
    const lead = o.leadId ? leads.find((l) => l.id === o.leadId) : undefined;
    const overlayAttr = attributions.find((a) => a.clientCode === o.clientCode);
    const attribution =
      overlayAttr?.lineage ||
      (lead?.source || lead?.leadSourceDetail
        ? {
            source: lead.source,
            clientCode: o.clientCode,
            ...(lead.leadSourceDetail ? { contentId: lead.leadSourceDetail } : {}),
          }
        : undefined);
    return {
      contractVersion: 'opportunity-commercial-context.v1' as const,
      opportunityId: o.id,
      clientCode: o.clientCode as string,
      title: o.title,
      stage: o.stage,
      leadId: o.leadId,
      estimatedValue: o.proposalAmount,
      currency: o.proposalAmount !== undefined ? ('USD' as const) : undefined,
      capitalHandoffStatus: o.capitalHandoffStatus,
      attribution,
    };
  });

  return {
    contractVersion: 'atlas-operator-commercial-context.v1',
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    clientCode: filter,
    gcc: {
      contractVersion: 'gcc-value-signal.v1',
      honesty: honesty(gccSignals.length > 0, EMPTY_REASON.gcc),
      signals: gccSignals,
    },
    copilot: {
      honesty: honesty(assessments.length + preCall.length + sharepoint.length > 0, EMPTY_REASON.copilot),
      assessments,
      preCall,
      sharepoint,
    },
    gtm: {
      honesty: honesty(attributions.length + crmSources.length > 0, EMPTY_REASON.gtm),
      attributions,
      crmSources,
    },
    opportunities: commercial,
  };
}

export function toDeskCommercialContext(ctx: OperatorCommercialContext, entitledClientCount: number): DeskCommercialContext {
  const codes = new Set<string>();
  for (const row of ctx.opportunities) if (row.clientCode) codes.add(row.clientCode);
  for (const s of ctx.gcc.signals) codes.add(s.clientCode);
  for (const a of ctx.copilot.assessments) if (a.clientCode) codes.add(a.clientCode);
  for (const b of ctx.copilot.preCall) if (b.atlasClientCode) codes.add(b.atlasClientCode);
  for (const a of ctx.gtm.attributions) codes.add(a.clientCode);
  for (const s of ctx.gtm.crmSources) if (s.clientCode) codes.add(s.clientCode);

  const rows = [...codes].sort().map((clientCode) => {
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
  });

  return {
    contractVersion: 'atlas-operator-commercial-context.v1',
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    entitledClientCount,
    gcc: { ...ctx.gcc.honesty, count: ctx.gcc.signals.length },
    copilot: {
      ...ctx.copilot.honesty,
      count: ctx.copilot.assessments.length + ctx.copilot.preCall.length + ctx.copilot.sharepoint.length,
    },
    gtm: { ...ctx.gtm.honesty, count: ctx.gtm.attributions.length + ctx.gtm.crmSources.length },
    rows,
  };
}
