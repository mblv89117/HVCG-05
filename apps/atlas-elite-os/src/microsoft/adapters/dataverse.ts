import { acquireDataverseToken, dataverseApiRoot } from '../auth/msal';
import { microsoftConfig } from '../config';
import type {
  AtlasApprovalRecord,
  AtlasBrief,
  AtlasRevenueKpi,
  Sourced,
} from '../types';

async function dvFetch<T>(path: string): Promise<T> {
  const token = await acquireDataverseToken();
  if (!token) throw new Error('Dataverse token unavailable — sign in with Entra.');
  const url = path.startsWith('http') ? path : `${dataverseApiRoot()}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="*"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dataverse ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

function choiceLabel(row: Record<string, unknown>, logical: string): string {
  const formatted = row[`${logical}@OData.Community.Display.V1.FormattedValue`];
  if (typeof formatted === 'string') return formatted;
  const raw = row[logical];
  return raw == null ? '' : String(raw);
}

export async function listApprovals(): Promise<Sourced<AtlasApprovalRecord[]>> {
  const json = await dvFetch<{ value: Record<string, unknown>[] }>(
    'hvcg_atlasapprovals?$select=hvcg_atlasapprovalid,hvcg_name,hvcg_risk,hvcg_track,hvcg_decision,hvcg_datasource&$orderby=createdon desc&$top=20',
  );
  const data: AtlasApprovalRecord[] = (json.value || []).map((r) => ({
    id: String(r.hvcg_atlasapprovalid),
    title: String(r.hvcg_name || 'Untitled'),
    risk: choiceLabel(r, 'hvcg_risk') || 'Medium',
    track: String(r.hvcg_track || ''),
    decision: choiceLabel(r, 'hvcg_decision') || 'Pending',
    source: 'Dataverse',
  }));
  return {
    data,
    source: 'Dataverse',
    lastUpdated: new Date().toISOString(),
    detail: `HVCG Development · ${microsoftConfig.dataverseUrl}`,
  };
}

export async function listRevenueKpis(): Promise<Sourced<AtlasRevenueKpi[]>> {
  const json = await dvFetch<{ value: Record<string, unknown>[] }>(
    'hvcg_atlasrevenuekpis?$select=hvcg_atlasrevenuekpiid,hvcg_name,hvcg_value,hvcg_unit,hvcg_trend,hvcg_period,hvcg_datasource&$top=20',
  );
  const data: AtlasRevenueKpi[] = (json.value || []).map((r) => {
    const datasource = choiceLabel(r, 'hvcg_datasource') || String(r.hvcg_datasource || '');
    return {
      id: String(r.hvcg_atlasrevenuekpiid),
      name: String(r.hvcg_name || ''),
      value: String(r.hvcg_value || ''),
      unit: r.hvcg_unit ? String(r.hvcg_unit) : undefined,
      trend: r.hvcg_trend ? String(r.hvcg_trend) : undefined,
      period: r.hvcg_period ? String(r.hvcg_period) : undefined,
      source: 'Dataverse',
      verificationLabel: datasource,
    };
  });
  return {
    data,
    source: 'Dataverse',
    lastUpdated: new Date().toISOString(),
    detail: 'Atlas Revenue KPI table (Development/Production per environment)',
  };
}

export async function listBriefs(): Promise<Sourced<AtlasBrief[]>> {
  const json = await dvFetch<{ value: Record<string, unknown>[] }>(
    'hvcg_atlasbriefs?$select=hvcg_atlasbriefid,hvcg_name,hvcg_whatchanged,hvcg_needsdecision,hvcg_topactions,hvcg_datasource&$orderby=createdon desc&$top=5',
  );
  const data: AtlasBrief[] = (json.value || []).map((r) => ({
    id: String(r.hvcg_atlasbriefid),
    title: String(r.hvcg_name || ''),
    whatChanged: r.hvcg_whatchanged ? String(r.hvcg_whatchanged) : undefined,
    needsDecision: r.hvcg_needsdecision ? String(r.hvcg_needsdecision) : undefined,
    topActions: r.hvcg_topactions ? String(r.hvcg_topactions) : undefined,
    source: 'Dataverse',
  }));
  return {
    data,
    source: 'Dataverse',
    lastUpdated: new Date().toISOString(),
  };
}

export async function whoAmI(): Promise<Sourced<{ userId: string; orgId: string }>> {
  const json = await dvFetch<{ UserId: string; OrganizationId: string }>('WhoAmI');
  return {
    data: { userId: json.UserId, orgId: json.OrganizationId },
    source: 'Dataverse',
    lastUpdated: new Date().toISOString(),
  };
}

/** Safe write: update approval decision only (Development). */
export async function updateApprovalDecision(
  id: string,
  decisionLabel: 'Pending' | 'Approved' | 'Rejected' | 'Changes requested',
  ownerNotes?: string,
): Promise<void> {
  if (microsoftConfig.environment === 'production') {
    throw new Error('Approval writes blocked — Production requires an explicit gate.');
  }
  const token = await acquireDataverseToken();
  if (!token) throw new Error('Not signed in');

  // Option values match schema.js picklist generation (index * 100000000 + 1)
  const map: Record<string, number> = {
    Pending: 100000001,
    Approved: 200000001,
    Rejected: 300000001,
    'Changes requested': 400000001,
  };
  const body: Record<string, unknown> = { hvcg_decision: map[decisionLabel] };
  if (ownerNotes != null) body.hvcg_ownernotes = ownerNotes;

  const res = await fetch(`${dataverseApiRoot()}/hvcg_atlasapprovals(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH approval failed: ${res.status}`);
}
