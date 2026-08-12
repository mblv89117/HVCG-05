# Production Gap Inventory — Sprint 17 update

## Closed in Sprint 17 Development
- Live Hub HTTP E2E (dev headers on :8792)
- Auth-required Hub fail-closed without Bearer (:8793)
- HR sensitive field serialization filter
- Staging finance read/reconcile adapter (sanitized)
- Migration rehearsal negatives
- Non-Prod file audit sink + monitoring signals
- AV mock clean/reject/unavailable fail-safe
- Graph permission inventory
- Release/UAT/QA/rollback packages prepared
- Gate evidence packs S17

## LIVE_VALIDATION_PENDING / CREDENTIAL_REQUIRED
- Real Entra JWT with populated apps
- Live Graph/SharePoint non-Prod
- QBO sandbox read
- Alert delivery
- Prod audit sink

## EXTERNAL_DEPENDENCY
- Approved malware/AV service
- Alert channel (Teams/email/webhook)

## Owner gate
- OPEN any Production gate
- Owner UAT execution
- Written QA GO
- Release Candidate
- Production GO / deploy / migration

## Sprint 17 did NOT close
- Staging env pack as first-class Azure env
- Production portal launch
- Production Graph RAG
- Money movement / QBO write
