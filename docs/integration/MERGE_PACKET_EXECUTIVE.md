# MERGE PACKET — Executive Command Center (offline draft)

**Packet ID:** `MERGE-EXEC-001`  
**Prepared by:** Integration (`integration`) on `agent/crm-integration`  
**As of:** 2026-07-15  
**Owner gate:** **Awaiting owner D-003** (merge approval) — **do not merge until issued**  
**Deploy policy:** NO merges, NO deploys, NO Production from this packet alone

---

## Candidate

| Field | Value |
|-------|--------|
| Branch | `cursor/executive-command-center` |
| Tip (READY) | `8c3f7d8` — `feat(exec): finalize Option A handoff, Copilot prompts, and offline runners` |
| Worktree | `.worktrees/executive-command-center` |
| Packaging | Option A — exclusive paths only |
| Agent status | **READY FOR INTEGRATION** (Master READY queue) |
| Handoff SoR | `docs/executive/HANDOFF.md` |
| Shared appends | `docs/executive/SHARED_FILE_RECOMMENDATIONS.md` (parent-only) |

---

## Preconditions (all required before D-003 execution)

1. Owner issues **D-003** for this packet (`MERGE-EXEC-001`) explicitly.
2. CRM Maker OA / smoke / auth is **not interrupted**; if CRM WIP is mid-smoke, hold.
3. Offline executive suite **PASS** on tip SHA (re-run below).
4. No dual-writers on locked shared indexes (`flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`) — module agents must not edit them; parent appends only via recommendations.
5. Portal contamination absent from executive branch tip (prior cleanup commit `8f09e23`).
6. Integration agent holds merges until Master PM sequences this packet after Agent Comms cleanliness (see recommended order).

---

## File ownership (merge surface)

### Exclusive (bring from executive branch)

- `docs/executive/**`
- `src/power-apps/executive/**`
- `src/power-apps/formulas/ExecutiveNamedFormulas.fx`
- `src/power-automate/executive/**`
- `src/power-bi/executive/**`
- `src/sharepoint/views/executive-views.json`
- `tests/executive/**`
- `tests/unit/test_executive_command_center.py`
- `sample-data/executive/**` (if present on tip)

### Parent-only appends (after exclusive merge)

Apply **append-only** items listed in `docs/executive/SHARED_FILE_RECOMMENDATIONS.md`, including:

- Soft-conflict: `tests/Invoke-HVCGPreDeploymentTests.ps1` — append executive offline check only
- Optional pointers: `NamedFormulas.fx`, `BUILD_SHEET.md`, `README.md`, architecture report links
- Do **not** rewrite CRM `nf*` formulas or CRM flow packages

### Do not merge from this packet

- `deployment/**` engines
- CRM flows / Maker OA solution WIP
- Locked shared indexes as exclusive edits
- Production configs / secrets

---

## Test commands (offline)

From executive worktree (or tip checkout):

```bash
cd .worktrees/executive-command-center
python3 tests/executive/run_offline_tests.py
# alternate:
python3 tests/unit/test_executive_command_center.py
```

Expected: `PASS executive command center module checks` (or equivalent runner PASS).

Full suite (parent integration tree, after merge simulation — still offline):

```bash
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
```

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Soft-conflict on `Invoke-HVCGPreDeploymentTests.ps1` | M | Append-only; keep CRM + exec checks |
| Accidental shared-index edits | H | Indexes LOCKED; use recommendations only |
| Cross-module portal stubs | M | Verify tip clean of `docs/portal` / `HVCG_Portal*` |
| Premature merge before Agent Comms segregation | H | Hold until Master order + D-003; see recommended order |
| Live CRM smoke collision on MAIN / shared docs | H | Do not rewrite `docs/crm/*` acceptance during smoke; exclusive exec paths only |

---

## Recommended order (relative)

1. Park / segregate CRM dirty MAIN (do not combine with other packets).
2. Land **Agent Comms** packet (`MERGE_PACKET_AGENT_COMMS.md`) on a clean tree **or** confirm already landed without CRM dirt.
3. Merge **Executive** exclusive paths (`MERGE-EXEC-001`) with owner **D-003**.
4. Parent applies `SHARED_FILE_RECOMMENDATIONS.md` appends.
5. Re-run offline predeploy; mark VALIDATED.
6. Later packets: Client Portal → AI Governance → Operations replay → Finance (per Master plan).

---

## Integration stance

**HOLDING MERGES.** Packet is an offline draft only. Not requesting D-003 yet (Master: “No D-003 requested yet”).

| Decision | Status |
|----------|--------|
| D-001 Maker connector consent | Open (owner) — unrelated gate |
| D-002 CRM canvas Maker build | Open (owner) — do not interrupt |
| **D-003 Merge approval** | **Awaiting owner** — not requested for this packet yet |
