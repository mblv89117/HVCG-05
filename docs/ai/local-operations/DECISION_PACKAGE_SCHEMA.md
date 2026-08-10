# Executive decision package schema (Phase 1)

See `packages/atlas-integration-core/src/local-ai/decisionPackage.ts`.

Fields: decision, recommendation, why, alternatives[], risks[], deadline, requiredReviewTimeMinutes, sourceRecords[], confidence (0..1), missingInformation[], banner, schemaVersion.

Validation rejects missing fields or incorrect synthetic banner.
