# CLIENT_DATA_MODEL

**As of:** 2026-07-15 18:10 PT  
**Purpose:** Canonical logical model for migration + CRM mapping (Dev-only records later).  
**Architect:** Review/approve via bus (`architect`).  
**CRM mapping note:** `CRM_ACCOUNT_CONTACT_ENGAGEMENT_MAPPING.md` (recommendations only — no locked-index edits).

## Core entities

| Entity | Key fields | Notes |
|--------|------------|-------|
| Account | LegalName, DBA, EntityType, Classification, ContractingEntity (HVS\|HVCG), State, Status | Classification enum mandatory |
| Contact | AccountId, Name, Email, Phone, Role, Primary | |
| Engagement | AccountId, ContractingEntity, OriginalPricing, CurrentPricing, SOW ref, Start, Renewal, TermsHash | Preserve legacy pricing |
| Project | EngagementId, Type, Health, Risk, PM | |
| Task / Milestone / Deliverable | ProjectId, Due, Status, Owner | |
| FundingOpportunity | AccountId, CapitalType, Amount, Stage | Optional |
| Invoice / Payment | EngagementId, Amount, Status, Platform, ExternalId | No live connect yet |
| DocumentRequest | AccountId, Status, PortalVisible | |
| CommunicationEvent | AccountId, Channel, Direction, RefId, Timestamp | Metadata; no auto-send |
| WorkspacePlan | AccountId, SP site URL plan, DataRoom plan, Portal plan | Plan only until approved |
| SourceFileIndex | Hash, Path, Size, Mtime, SourceSystem, AccountHint | **Never delete sources** |

## Classification enum

`HVS_LEGACY_CLIENT` · `HVS_TRANSITIONING_CLIENT` · `HVCG_PROSPECT` · `HVCG_NEW_CLIENT` · `FORMER_CLIENT` · `REFERRAL_PARTNER`

## Mapping notes

- Demo `sample-data/clients.csv` is **not** the legacy roster.  
- SharePoint list shapes already exist in OS (Clients, Tasks, etc.) — additive fields for Classification / ContractingEntity via recommendations only (no locked-index edits without window).
