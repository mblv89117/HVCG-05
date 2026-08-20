# CC-001 Copilot field naming fail-safe

**Conflict:** Copilot tip `7e63a6d` required dual PascalCase + camelCase fields on `atlas-lead-handoff.v1`, diverging from Integration SoT (camelCase authority). Declared Copilot tip for directive 3 is `2f02702` (source not fetchable from this contracts worker; RT D26 inspected jose middleware, not field-naming SoT). SoT is unchanged.

**Fail-safe decision (Platform Integration):**
- camelCase remains **required** canonical (`assessmentId`, `organizationName`, `source`, `contact`, `provenance`, …).
- PascalCase fields (`AssessmentId`, `Company`, …) are **optional aliases only**.
- If an alias is present, it MUST equal its camelCase counterpart (enforced in harness).
- Requiring PascalCase as mandatory is a **contract violation** — Copilot train must relax required[] (COP-INT-001).
- `factClass` enum expanded additively to accept Copilot tip values without dropping originals.

**Not adopted:** Making PascalCase required in SoT (would break prior adapters and invent dual meaning).

**Live dispatch:** remains `false` until OD-003 + owner gates.
