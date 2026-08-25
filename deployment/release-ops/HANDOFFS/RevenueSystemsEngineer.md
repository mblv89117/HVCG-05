# Revenue Systems Engineer — Engineering Handoff

**Role:** HVCG Revenue Systems Engineer  
**Document as of:** 2026-07-16T04:06:00Z  
**Author session:** Sprint 3 finalize (handoff only — no commit/push)  
**Production:** Untouched  
**Development tenant changes this finalize session:** None  

---

## Current Sprint status

| Sprint | Status |
|--------|--------|
| Track 1 (internal Prod CRM) | **COMPLETE / FROZEN** — do not modify |
| Sprint 1 (EVA → Dev CRM capture) | **COMPLETE** |
| Sprint 2 (EVA multi-step experience) | **COMPLETE** (Dev/Staging) |
| Sprint 3 (Revenue recommendations & conversion) | **COMPLETE** (Dev/Staging artifacts + tests) |
| Sprint 4 | **NOT STARTED** — do not begin |

**Sprint 3 engineering work is complete and ready for Master PM documentation.**  
**Git:** Sprint 3 files exist on branch/worktree but are **not yet committed** (awaiting explicit owner approval to commit).

---

## Completed work (Sprint 3)

1. Conversion engine (`conversion-engine.js`) — executive diagnostic, score plain-language, valuation gate, capital path, HVCG engagement mapping, lead qualification, CTA selection  
2. CRM adapter update — locked schema v1 preserved; additive versioned `recommendation` object in `_experience` / Notes  
3. Prospect-facing results UX — no CRM JSON, schema names, or developer controls  
4. Branded printable/PDF report update  
5. Automated test suite (33/33)  
6. Dev CRM smoke (LeadId=14)  
7. QA validation packet  
8. Sync of EVA app into master-pm staging + Track3 preview (file sync only; no publish)

---

## Repository locations

| Area | Path |
|------|------|
| Primary worktree | `.worktrees/revenue-sprint3/` |
| Staging EVA app (canonical for this sprint) | `.worktrees/revenue-sprint3/docs/business-launch/website/staging/assessments/eva/` |
| Synced staging (master-pm) | `.worktrees/master-pm-orchestrator/docs/business-launch/website/staging/assessments/eva/` |
| Synced preview | `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/track3-website/preview/assessments/eva/` |
| Funnel / conversion docs | `.worktrees/revenue-sprint3/docs/business-launch/funnel/` |
| Tests | `.worktrees/revenue-sprint3/tests/revenue/` |
| Smoke evidence (main checkout reports) | `deployment/reports/checkpoints/eva-sprint3-conversion-smoke-20260715-205800.json` |
| This handoff | `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md` |

---

## Owned folders

- `docs/business-launch/funnel/conversion/`
- `docs/business-launch/website/staging/assessments/eva/` (Sprint 2–3 UI; additive Sprint 3)
- `docs/business-launch/funnel/` (Sprint 3 docs + screenshots)
- `tests/revenue/`
- `deployment/release-ops/HANDOFFS/` (this handoff)

---

## Owned files (Sprint 3 deliverables)

### Conversion / UI

- `docs/business-launch/website/staging/assessments/eva/js/conversion-engine.js`
- `docs/business-launch/website/staging/assessments/eva/js/crm-payload.js` (updated)
- `docs/business-launch/website/staging/assessments/eva/js/app.js` (updated)
- `docs/business-launch/website/staging/assessments/eva/index.html` (updated)
- `docs/business-launch/website/staging/assessments/eva/report.html` (updated)
- `docs/business-launch/website/staging/assessments/eva/css/eva-app.css` (updated)
- Sprint 2 baseline retained: `question-bank.js`, `scoring-engine.js`, `recommendations.js`, `autosave.js`

### Docs / QA

- `docs/business-launch/funnel/SPRINT3_CONVERSION_ENGINE.md`
- `docs/business-launch/funnel/conversion/QA_VALIDATION_PACKET.md`
- `docs/business-launch/FUNNEL_STATUS.md`
- `docs/business-launch/funnel/screenshots/eva-sprint3-results-prospect.png`
- `docs/business-launch/funnel/EVA_CRM_PAYLOAD_SCHEMA.md` (locked contract copy)
- `docs/business-launch/PRICING_REGISTER.md` (canonical rates reference copy)

### Tests

- `tests/revenue/run_conversion_tests.js`
- `tests/revenue/Invoke-Sprint3ConversionSmoke.ps1`

### Prior Sprint 1 (main tree; not re-owned)

- `src/power-automate/definitions/HVCG_EvaFormCreateLead.definition.json`
- `deployment/scripts/crm/Invoke-EvaDevHttpSmoke.ps1`

---

## Branch

`cursor/revenue-sprint3-conversion`

---

## Worktree

`.worktrees/revenue-sprint3`  
Absolute: `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/revenue-sprint3`

---

## Latest commit SHA

| Ref | SHA |
|-----|-----|
| Branch HEAD (worktree) | `2c064b3235f30a908fb80369a1a30e17cd49d021` |
| Note | Sprint 3 file tree is **uncommitted** on top of this SHA |
| Track 1 freeze tag | `Track-1-Live-Internal` → `302615956cea80c238172931f5901792f548f59c` |

Until an approved commit, treat “latest engineering tip” as: **HEAD + uncommitted owned paths listed above**.

---

## Tests executed

| Test | Command | Result |
|------|---------|--------|
| Conversion / schema / UI heuristics | `node tests/revenue/run_conversion_tests.js` | **33/33 PASS** (re-verified at handoff) |
| Cases | Hot/Warm, early-stage, funding-ready, not-ready, acquisition, exit, incomplete valuation, legacy BLOCK, idempotency, schema key lock, OWNER REVIEW pricing, CTA, no prospect debug, report phone, a11y/mobile | PASS |

---

## QA results

| Artifact | Path | Status |
|----------|------|--------|
| QA validation packet | `docs/business-launch/funnel/conversion/QA_VALIDATION_PACKET.md` | **EXISTS** |
| Soft UAT checklist | Inside QA packet | Ready for QA/integration agent |
| Screenshot | `docs/business-launch/funnel/screenshots/eva-sprint3-results-prospect.png` | **EXISTS** |

Prospect HTML verified clean of: `crmJson`, `EVA_CRM_PAYLOAD`, `downloadCrm`, `downloadFull`, `btnHttpPost`.  
No `console.log` / `debugger` in EVA staging app tree.

---

## Smoke results

| Smoke | Evidence | Result |
|-------|----------|--------|
| Sprint 3 Dev CRM conversion smoke | `deployment/reports/checkpoints/eva-sprint3-conversion-smoke-20260715-205800.json` | **PASS** |
| LeadId | `14` | |
| Session / idempotency | `eva\|sprint3-conv-20260715-205800` | count=1 |
| Site | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev` | Dev only |
| Sprint 1 Path A (prior) | `deployment/reports/checkpoints/eva-dev-smoke-20260715-203045.json` | PASS LeadId=13 → OppId=18 |

---

## Schema compatibility (Sprint 1 + 2)

- Locked contract: `EVA_CRM_PAYLOAD_SCHEMA` v1  
- `schemaOnly()` emits only: `sessionId`, `submittedAt`, `source`, `leadSourceDetail`, `contact`, `company`, `consent`, `eva`  
- Sprint 3 adds **`recommendation`** (version `HVCG-REC-2026-07-16-v1`) under `_experience` / Notes — not in HTTP schema body  
- Sample fixture keys verified against locked set  
- Legacy guard unchanged (BLOCK on HVS name match)  
- `LeadStatus` remains `New`; `auto_qualify: false`

---

## Track 1 status

- Tag `Track-1-Live-Internal` present  
- Freeze package: `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`  
- **No Production modifications** in Sprint 3 or this finalize session  
- **No flow activations** in this finalize session  

---

## Remaining blockers

1. Sprint 3 git commit not yet approved (explicit owner gate)  
2. Dev flow HTTP callback URL still optional for live UI POST  
3. Soft UAT of conversion CTA copy (human)  
4. BL-PUBLISH-1 (public website) — open  
5. BL-C1 (prospect outbound) — open  

---

## Technical debt

1. Fractional CFO / Exit / Acquisition / Modeling prices marked `OWNER REVIEW REQUIRED` (not on Section B package table)  
2. Second phone `725.577.6511` not displayed; DS-PHONE routing undefined  
3. Conversion rules duplicated conceptually vs Sprint 2 `recommendations.js` (lite layer still used for priorities) — consolidate later  
4. Staging/preview copies synced by rsync; single SoR path should be enforced after commit  
5. Full browser / axe accessibility automation not run (static heuristics only)  

---

## Known risks

| Risk | Mitigation in place |
|------|---------------------|
| Overclaiming funding/valuation | Disclaimers + valuation gate + “not lender approval” |
| Legacy HVS reprice | Name guard BLOCK |
| Schema break | Locked `schemaOnly` + contract tests |
| Prospect seeing internals | Debug stripped from results HTML |
| Premature Prod / publish | Explicit non-actions; Sprint 4 not started |

---

## Owner decisions still required

1. Approve **git commit** (and later push) of Sprint 3 worktree contents  
2. Price cards for **SKU-FCFO / SKU-EXIT / SKU-ACQ / SKU-MODEL** (or confirm OWNER REVIEW forever until rate card update)  
3. Public routing role for **725.577.6511** vs primary **702.906.6444**  
4. When CTAs may leave “staging-only” (booking / nurture) — Sprint 4 gate  

---

## Exact recommendation for Sprint 4 (do not start now)

**Sprint 4 — Conversion activation (gated):**  
Strategy Session / review **request capture into Dev CRM only** (no email) → optional Forms retirement → still **no** public DNS, no Prod, no BL-C1 outbound until owner gates close.

---

## Rollback notes

| Layer | Rollback |
|-------|----------|
| UI | Restore prior `assessments/eva/` from Sprint 2 snapshot / git history after commit; or remove `conversion-engine.js` script tag and revert `app.js`/`index.html` |
| CRM | Dev leads with Source=`Website-EVA` and LeadSourceDetail containing `sprint3` / `conversion` can be filtered/deleted in Dev; no Prod writes |
| Schema | HTTP body unchanged — safe vs Sprint 1 flow |
| Track 1 | Untouched — use freeze package rollback only if Prod regression (out of Revenue scope) |

---

## Resume instructions (brand-new engineer)

1. Open repo: `/Volumes/MacMiniPro2TB/HVCG Project Management System`  
2. Use worktree: `git worktree list` → checkout `.worktrees/revenue-sprint3` on branch `cursor/revenue-sprint3-conversion`  
3. Read this handoff + `docs/business-launch/funnel/SPRINT3_CONVERSION_ENGINE.md` + `funnel/conversion/QA_VALIDATION_PACKET.md`  
4. Register agent: `./scripts/agent-comms/register-agent.sh --agent-id revenue-systems ...`  
5. Verify tests: `cd .worktrees/revenue-sprint3 && node tests/revenue/run_conversion_tests.js`  
6. Preview UI:  
   `cd docs/business-launch/website/staging && python3 -m http.server 8766 --bind 127.0.0.1`  
   → `http://127.0.0.1:8766/assessments/eva/`  
7. **Do not** modify Production, activate flows, publish DNS, or start Sprint 4 without Master PM / owner approval  
8. **Do not** commit/push unless owner explicitly approves  
9. Notify `master-pm` via `.agent-comms/` when resuming  

---

## Finalize checklist (this session)

| Check | Result |
|-------|--------|
| Sprint 3 artifacts exist | ✓ |
| QA evidence exists | ✓ |
| Smoke evidence exists | ✓ |
| Owned files on disk | ✓ |
| No prospect debug UI | ✓ |
| Schema compat Sprint 1/2 | ✓ |
| Track 1 untouched | ✓ |
| Sprint 4 not started | ✓ |
| No commit/push | ✓ (per instruction) |
