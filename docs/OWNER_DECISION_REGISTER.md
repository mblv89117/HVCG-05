# Owner Decision Register

Single register of decisions that require Manny. Unrelated engineering continues without these.

| # | Decision | Why required | Recommended | Alternatives | Risk | Work can continue? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Microsoft MFA window for Atlas Hub + Elite live cutover | Live certification of Phase 5G + client activation cannot complete without owner Entra auth | After repo gates stay green, deploy **matched Hub+Elite** from `cursor/atlas-hv-completion-52d1` once SHA is frozen; run SYN01 lead → opportunity → activation → capital P1 recorded-only | Keep current live Hub/Elite lineages (`5b50ca2` / `632b7ae` evidence) until the window | Deploying a mixed or stale SHA | Yes — all repo, test, contract, and UI work continues |
| 2 | Confirm current live Hub deployment ID | Repo docs (`dd965bc2` / `8ff4220`) conflict with supplied `7795bc89` / `5b50ca2` | Query Azure / Kudu footer before any apply; archive rollback zip from the confirmed live SHA | Treat user-supplied `5b50ca2` as working live hypothesis only | Accidental downgrade | Yes — do not deploy until reconciled |
| 3 | EVA runtime location / Autonomous Marketing access | EVA UI is not in the four-repo environment; Atlas intake exists | Keep EVA as HVCG-site / Autonomous Marketing deployment; do not create an eighth repo | Recreate a thin EVA sender later only if the live site is gone | Duplicate funnel | Yes — Atlas intake + Copilot/360 contracts proceed |

Do not ask Manny to QA CSS, logs, or screenshots. Batch the MFA window after Hub/Elite artifacts, rollback plan, SYN01 scripts, and health checks are staged.
