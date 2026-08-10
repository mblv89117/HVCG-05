# Phase 6B — HVCG Registry, Discovery, Baseline, Pilot, Security, Rollback, 6C

## Registry (Candidate A)

| Field | Value |
| --- | --- |
| Website ID | `ws_hvcg_real` |
| Name | High Value Capital Group |
| Production URL | https://www.highvaluecapitalgroup.com/ |
| Remote | https://github.com/mblv89117/hvcg-atlas-autonomous-marketing.git |
| Main checkout | `/Volumes/MacMiniPro2TB/Autonomous Marketing` (untouched) |
| Pilot worktree | `/Volumes/MacMiniPro2TB/.worktrees/hvcg-website-studio-pilot` |
| Site root | `website/` |
| Framework | Static HTML elite pack |
| Hosting | Azure Static Web Apps |
| Production branch | `main` |
| Pilot branch | `website-studio/hvcg-pilot` |
| Preview | `npm run preview` → http://127.0.0.1:8765/ |
| Tests | `npm run smoke`, `npm run validate:eva` |

Credentials/secrets are not stored.

## Discovery

Read-only discovery of worktree + `website/` site root. Inventories pages under `website/staging`, homepage H1 block, media filenames, EVA form as high-risk inventory only.

## Production baseline

Captured in SQLite baselines table: production branch `main`, baseline commit SHA, inventory counts, deployment-config fingerprint (hashes of deploy docs/package.json names only), pilot branch/worktree pointers. No Production tag created.

## Pilot change

Tier A homepage H1 only. Source mirrors: `website/scripts/generate_pages.py`, `website/staging/index.html`, `website/preview/index.html`.

## AI proposals

Three variants + one recommended (`variant_b`). Manny may select, edit, combine, reject all, or supply custom wording. Files stay unmodified until exact final wording is approved and apply runs.

## Git / preview / QA

Allow-listed commands only (`npm run preview|smoke|validate:eva`). Push requires explicit Manny authorization after commit + visual QA. Merge and deploy always rejected in Phase 6B.

## Security review

- Path allow-list + traversal checks
- Main checkout write refused
- Production branch push/commit refused
- No arbitrary UI shell
- Website content treated as untrusted input for classification
- Classification word-boundary fix so “capital” does not false-escalate via `api`

## Website rollback

Reset pilot worktree to baseline commit on `website-studio/hvcg-pilot` (or delete worktree). Do not reset Production `main`.

## Atlas rollback

Revert Phase 6B Atlas commit(s); delete `.data/website-studio/` if needed. Keep PR #3 draft.

## Phase 6C recommendation (do not start)

1. After Manny final wording + visual QA: apply/commit on pilot branch  
2. Optional Manny-authorized push + **draft** website PR labeled `DRAFT — WEBSITE STUDIO PILOT — DO NOT MERGE OR DEPLOY`  
3. Staging/SWA preview slot if Manny authorizes (still no Production cutover)  
4. Still no merge to `main`, no DNS changes, no Production deploy

## Owner actions required

1. Review 3 AI H1 proposals below / in Website Studio  
2. Select, edit, combine, reject, or replace final wording  
3. Explicitly approve exact final wording before any apply  
4. Separately authorize push if a remote checkpoint is desired  
5. Do not authorize Production deploy in Phase 6B/6C without a later phase
