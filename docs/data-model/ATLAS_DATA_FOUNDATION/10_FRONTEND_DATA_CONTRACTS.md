# 10 — Frontend Data Contracts

Machine-readable catalog: [`../contracts/atlas-core.entities.json`](../contracts/atlas-core.entities.json)  
Workspace context schema: [`../contracts/workspace-context.schema.json`](../contracts/workspace-context.schema.json)

## Contract principles

1. Frontend types use **business keys** (`ClientCode`, `WorkspaceCode`), not only SharePoint ItemIds.
2. Every DTO that can show money includes `dataProvenance`.
3. Executive Dashboard reads `KpiRecord` for tiles when present; falls back to documented calculated measures.
4. Do not embed sample financials as defaults in UI code.

## Core TypeScript shapes (canonical)

```ts
export type DataProvenance =
  | "sample"
  | "test"
  | "imported"
  | "calculated"
  | "verified";

export interface WorkspaceContext {
  organizationCode: string;
  workspaceCode: string;
  workspaceType: "Internal" | "Client" | "Executive";
  defaultClientCode?: string;
}

export interface ClientSummary {
  clientCode: string;
  legalName: string;
  organizationCode: string;
  workspaceCode: string;
  overallHealth?: "Green" | "Yellow" | "Red";
  dataProvenance: DataProvenance;
}

export interface KpiRecordDto {
  kpiCode: string;
  periodCode: string;
  organizationCode: string;
  workspaceCode?: string;
  clientCode?: string;
  valueNumber?: number;
  valueText?: string;
  unit?: string;
  dataProvenance: DataProvenance;
  sourceSystem: string;
  lastRefreshedAt: string; // ISO-8601
}

export interface EnterpriseValueAssessmentDto {
  assessmentCode: string;
  clientCode: string;
  asOfDate: string;
  method: "Income" | "Market" | "Asset" | "Hybrid" | "Qualitative";
  enterpriseValueLow?: number;
  enterpriseValueHigh?: number;
  currency: string;
  status: "Draft" | "In Review" | "Accepted" | "Superseded";
  dataProvenance: DataProvenance;
}
```

## Adapter expectations (Elite OS / Power Apps)

| UI surface | Contract |
|------------|----------|
| Exec dashboard tiles | `KpiRecordDto[]` filtered by workspace |
| Client switcher | `ClientSummary[]` for workspace |
| CCB workspace home | `WorkspaceContext` + client-scoped lists |
| EV module | `EnterpriseValueAssessmentDto` + value drivers |

## Status on this branch

No `apps/` TypeScript tree is present here. Contracts are published for Elite UI / Power Platform to implement against; Data Engineering owns the schema, not the React package on this worktree.
