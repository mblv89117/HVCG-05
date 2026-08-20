# CC-001 Copilot field naming fail-safe

**Conflict:** Copilot tip `7e63a6d` requires dual PascalCase + camelCase fields on `atlas-lead-handoff.v1`, diverging from Integration SoT @ `8fc711f` (camelCase authority).

**Fail-safe decision (Platform Integration):**
- camelCase remains **required** canonical (`assessmentId`, `organizationName`, `source`, `contact`, `provenance`, …).
- PascalCase fields (`AssessmentId`, `Company`, …) are **optional aliases only**.
- If an alias is present, it MUST equal its camelCase counterpart (enforced in harness).
- Requiring PascalCase as mandatory is a **contract violation** — Copilot train must relax required[] (COP-INT-001).
- `factClass` enum expanded additively to accept Copilot tip values without dropping originals.

**Not adopted:** Making PascalCase required in SoT (would break prior adapters and invent dual meaning).

**Live dispatch:** remains `false` until OD-003 + owner gates.
