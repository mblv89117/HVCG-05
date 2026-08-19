# ADR-0002 — Shared Connection References

| Field | Value |
|-------|--------|
| ID | ADR-0002 |
| Title | Four shared connection references for M365 connectors |
| Status | Accepted |
| Date | 2026-07-15 |
| Decision owner | architect (codifying embedded solution decision) |

## Context

Solution `HVCGCommandCenterDev` and `HVCG_ConnectionReferences.json` already define four shared refs used by CRM and platform flows.

## Problem

Prevent each module from creating its own SharePoint/Outlook/Teams/Approvals connection references (consent sprawl, binding fragility).

## Options considered

1. Single shared ref set (`hvcg_shared*`)
2. Per-module connection references
3. Service principal / custom connector only

## Decision

**Option 1.** Canonical refs:

- `hvcg_sharedsharepointonline`
- `hvcg_sharedoffice365`
- `hvcg_sharedteams`
- `hvcg_sharedapprovals`

New connectors require architect review; Production binding remains owner/QA gated.

## Rationale

One consent surface in Dev; consistent ALM; matches imported solution artifacts.

## Consequences

- Modules must not invent parallel logical names for the same connector
- Maker consent (owner decision class) remains outside architect authority

## Affected modules

CRM, Ops, Finance, Portal, Executive, AI (all flows).

## Migration / security / testing / rollback

Migration: remap any rogue refs to shared set. Security: least-privilege accounts still required for connection owners. Testing: connection bind checks in CRM acceptance. Rollback: keep prior ref only if QA approves dual-bind window.

## Related files

`src/power-platform/connection-references/HVCG_ConnectionReferences.json`, solution `ConnectionReferences/`.
