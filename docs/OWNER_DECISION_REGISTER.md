# Owner Decision Register

Single register of decisions that require Manny. Unrelated engineering continues without these.

| # | Decision | Why required | Recommended | Alternatives | Risk | Work can continue? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Microsoft MFA window for Atlas Hub + Elite live cutover | Live certification of Phase 5G + client activation cannot complete without owner Entra auth | **Used 2026-08-20.** Matched Hub+Elite `b6a3c9c` is live. SYN01 lead → opportunity → activation verified. Capital recorded-only isolation/fail-closed verified; full lender-package submit remains attestation-gated. | Keep prior live Hub/Elite (`5b50ca2` / `632b7ae`) only as rollback | Mixed SHA | Closed for this window |
| 2 | Confirm current live Hub deployment ID | Repo docs (`dd965bc2` / `8ff4220`) conflicted with live `7795bc89` / `5b50ca2` | **Reconciled.** Live before cutover was `5b50ca2` / `7795bc89`. Now `b6a3c9c` / `3f62750c`. `dd965bc2` is inactive. | — | Accidental downgrade | Closed |
| 3 | EVA runtime location / Autonomous Marketing access | EVA UI is not in the four-repo environment; Atlas intake exists | Keep EVA as HVCG-site / Autonomous Marketing deployment; do not create an eighth repo | Recreate a thin EVA sender later only if the live site is gone | Duplicate funnel | Yes — Atlas intake + Copilot/360 contracts proceed |

Do not ask Manny to QA CSS, logs, or screenshots. Batch the MFA window after Hub/Elite artifacts, rollback plan, SYN01 scripts, and health checks are staged.
