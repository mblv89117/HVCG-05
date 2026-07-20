export type DataSourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live' | 'Dataverse';

export interface Sourced<T> {
  data: T;
  source: DataSourceKind;
  lastUpdated?: string;
  detail?: string;
}

export interface AtlasApprovalRecord {
  id: string;
  title: string;
  risk: string;
  track: string;
  decision: string;
  notes?: string;
  modifiedOn?: string;
  source: DataSourceKind;
}

export interface AtlasRevenueKpi {
  id: string;
  name: string;
  value: string;
  unit?: string;
  trend?: string;
  period?: string;
  source: DataSourceKind;
  verificationStatus?: string;
}

export interface AtlasBrief {
  id: string;
  title: string;
  whatChanged?: string;
  needsDecision?: string;
  topActions?: string;
  source: DataSourceKind;
}

export interface DocumentRef {
  id: string;
  name: string;
  webUrl: string;
  lastModified?: string;
  source: DataSourceKind;
}

export interface GraphProfile {
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
  source: DataSourceKind;
}
