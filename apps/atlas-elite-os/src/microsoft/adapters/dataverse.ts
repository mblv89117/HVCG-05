import { acquireDataverseToken, dataverseApiRoot } from '../auth/msal';
import { microsoftConfig } from '../config';
import { sanitizeFinancialDisplay } from '../../data/financeGuard';
import type {
  AtlasApprovalRecord,
  AtlasBrief,
  AtlasRevenueKpi,
  Sourced,
} from '../types';

async function dvFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await acquireDataverseToken();
  if (!token) throw new Error('Dataverse token unavailable — sign in with Entra.');
  const url = path.startsWith('http') ? path : `${dataverseApiRoot()}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="*"',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dataverse ${res.status}: ${text.slice(0, 240)}`);
  }
  if (res.status === 204) return undefined as T;
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
    'hvcg_atlasapprovals?$select=hvcg_atlasapprovalid,hvcg_name,hvcg_risk,hvcg_track,hvcg_decision,hvcg_datasource,hvcg_ownernotes,modifiedon&$orderby=modifiedon desc&$top=50',
  );
  const data: AtlasApprovalRecord[] = (json.value || []).map((r) => ({
    id: String(r.hvcg_atlasapprovalid),
    title: String(r.hvcg_name || 'Untitled'),
    risk: choiceLabel(r, 'hvcg_risk') || 'Medium',
    track: String(r.hvcg_track || ''),
    decision: choiceLabel(r, 'hvcg_decision') || 'Pending',
    notes: r.hvcg_ownernotes ? String(r.hvcg_ownernotes) : undefined,
    modifiedOn: r.modifiedon ? String(r.modifiedon) : undefined,
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
    const rawValue = String(r.hvcg_value || '');
    const ds = String(r.hvcg_datasource || '').toLowerCase();
    const verified = ds.includes('verified') || ds.includes('live');
    return {
      id: String(r.hvcg_atlasrevenuekpiid),
      name: String(r.hvcg_name || ''),
      value: sanitizeFinancialDisplay(rawValue, 'Awaiting verified data'),
      unit: verified && r.hvcg_unit ? String(r.hvcg_unit) : undefined,
      trend: r.hvcg_trend ? String(r.hvcg_trend) : undefined,
      period: r.hvcg_period ? String(r.hvcg_period) : 'Reporting period pending',
      source: verified ? 'Dataverse' : 'Unavailable',
      verificationStatus: verified ? 'Verified' : 'Awaiting verified data',
    };
  });
  return {
    data,
    source: 'Dataverse',
    lastUpdated: new Date().toISOString(),
    detail: 'Atlas Revenue KPI table — unverified values forced to pending labels',
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

const DECISION_MAP: Record<string, number> = {
  Pending: 100000001,
  Approved: 200000001,
  Rejected: 300000001,
  'Changes requested': 400000001,
};

export async function createApproval(input: {
  title: string;
  track?: string;
  risk?: 'Low' | 'Medium' | 'High' | 'Critical';
  notes?: string;
}): Promise<string> {
  if (microsoftConfig.environment === 'production') {
    throw new Error('Approval creates blocked — Production requires an explicit gate.');
  }
  const riskMap: Record<string, number> = {
    Low: 100000001,
    Medium: 200000001,
    High: 300000001,
    Critical: 400000001,
  };
  const body: Record<string, unknown> = {
    hvcg_name: input.title,
    hvcg_decision: DECISION_MAP.Pending,
    hvcg_track: input.track || 'Executive Dashboard',
    hvcg_risk: riskMap[input.risk || 'Medium'],
  };
  if (input.notes) body.hvcg_ownernotes = input.notes;

  const json = await dvFetch<{ hvcg_atlasapprovalid: string }>('hvcg_atlasapprovals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  return String(json.hvcg_atlasapprovalid);
}

export async function updateApprovalDecision(
  id: string,
  decisionLabel: 'Pending' | 'Approved' | 'Rejected' | 'Changes requested',
  ownerNotes?: string,
): Promise<void> {
  if (microsoftConfig.environment === 'production') {
    throw new Error('Approval writes blocked — Production requires an explicit gate.');
  }
  const body: Record<string, unknown> = { hvcg_decision: DECISION_MAP[decisionLabel] };
  if (ownerNotes != null) body.hvcg_ownernotes = ownerNotes;

  await dvFetch(`hvcg_atlasapprovals(${id})`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });
}

export async function updateApprovalTitle(
  id: string,
  title: string,
  ownerNotes?: string,
): Promise<void> {
  if (microsoftConfig.environment === 'production') {
    throw new Error('Approval writes blocked — Production requires an explicit gate.');
  }
  const body: Record<string, unknown> = { hvcg_name: title };
  if (ownerNotes != null) body.hvcg_ownernotes = ownerNotes;
  await dvFetch(`hvcg_atlasapprovals(${id})`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });
}
