# Track 9 — Engineering Operating System
# Sprint 2 — Pre-Implementation Analysis Package

**Authority:** Master Project Management Agent
**Assigned:** 2026-07-16T23:35:00Z
**Owner:** HVCG Owner
**Branch:** `cursor/track9-eos-sprint2`
**Worktree:** `.worktrees/track9-eos-sprint2`
**Base:** `cursor/track9-eos-sprint1` @ `6b36782`
**Environment:** Development only
**Commit/push/deploy:** STOPPED pending QA and owner review

---

## 1. Impact Analysis

| Area | Impact | Breaking? |
|------|--------|-----------|
| Workflow Engine | Gate enforcement on advance / setStage | Behavioral hardening (stricter) |
| KPI definitions | Single config SoT; UI stops embedding duplicates | No |
| Command Center / Executive UI | Escape dynamic output | No |
| Snapshot layer | Additive live read-only collector | No |
| Agent Bus 2.0 | Persistence + additive v1 bridge (offline by default) | No |
| Project Atlas | Sprint 2 status / defect closure docs | No |
| Revenue Track 2 | Untouched | No |
| Track 1 / Production | Untouched | No |
| agent-comms live send | Not enabled | No |

### Defect resolution map

| ID | Finding area | Sprint 2 disposition |
|----|--------------|----------------------|
| DEF-EOS-001 | Workflow gate enforcement | Resolve |
| DEF-EOS-002 | KPI source duplication | Resolve |
| DEF-EOS-003 | UI output escaping | Resolve |
| DEF-EOS-004 | Live snapshot collection | Resolve |
| DEF-EOS-005 | Bus persistence / bridge | Resolve (bridge offline / draft-only) |

---

## 2. Dependency Analysis

1. EOS Sprint 1 package (`apps/hvcg-engineering-os/`, tests, Atlas Track 9)
2. `config/workflow-stages.json` — extended with transition gates
3. `config/kpi-definitions.json` — sole KPI SoT
4. `git worktree list` / registry JSON — read-only for live snapshot
5. `.agent-comms/templates/message.json` — mapping target for additive bridge
6. Project Atlas indexes and continuation files

No dependency on Revenue code, Track 1 freeze packages, or Production PAC profiles.

---

## 3. Module Ownership Review

| Module | Owner | Exclusive paths |
|--------|-------|-----------------|
| Workflow Engine + gates | Master PM / EOS | `js/workflow-engine.js`, `config/workflow-stages.json` |
| Engineering Analytics / KPI SoT | Master PM / EOS | `js/engineering-analytics.js`, `config/kpi-definitions.json`, UI bootloaders |
| UI escaping helpers | Master PM / EOS | `js/eos-core.js`, `js/app-*.js` |
| Live snapshot collector | Master PM / EOS | `js/live-snapshot-collector.js`, `scripts/collect-live-snapshot.js` |
| Agent Bus persist + bridge | Master PM / EOS | `js/agent-bus-v2.js`, `js/agent-bus-bridge.js`, `store/` |
| Atlas Track 9 Sprint 2 docs | Master PM | `PROJECT_ATLAS/**` Track9 / Sprint_EOS2 / QA / continuation |
| Shared Atlas roots | Master PM | Status indexes on this branch only |

Revenue / Track 1 / Deployment Production paths: **out of scope**.

---

## 4. Security Review

| Control | Approach |
|---------|----------|
| XSS | Escape all dynamic UI strings before HTML insertion |
| Live agent-comms | Bridge default `live: false`; writes EOS store outbox only |
| Snapshot collector | Read-only git/registry/Atlas; no writes outside EOS store |
| Secrets | No secrets in bus messages or snapshots |
| Production | No PAC / flow / DNS / Canvas actions |
| Freeze boundaries | Tests assert Revenue / Track 1 / Production paths unchanged |

---

## 5. Risk Assessment

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Stricter workflow gates break existing demos | Medium | Explicit metadata approvals; document gate matrix |
| R2 | Live bridge accidentally sends messages | High | Default offline; no shell invoke of send-message |
| R3 | Live collector fails without git | Low | Fixture fallback + error surface |
| R4 | Atlas index drift | Medium | Update CURRENT_STATE / SPRINT_INDEX together |
| R5 | Scope creep into Sprint 3 themes | Medium | Stick to approved 9 items only |

---

## 6. Testing Plan

1. Retain Sprint 1 suite (regression).
2. Negative-path: blocked advance, illegal setStage jump, missing gate.
3. Config validation: workflow stages, KPI defs, message types.
4. XSS: escapeHtml encodes `<script>` payloads.
5. Freeze-boundary: no Revenue / Track 1 path mutations in status.
6. Snapshot collector dry-run with fixture registry.
7. Bus persist round-trip; bridge maps to v1 without live send.
8. Command: `node tests/eos/run_eos_sprint2_tests.js` (+ Sprint 1 suite).

---

## 7. Rollback Plan

1. Discard uncommitted Sprint 2 worktree changes, or delete branch after review reject.
2. Revert to `cursor/track9-eos-sprint1` @ `6b36782`.
3. No Production rollback required (never deployed).

---

## 8. Implementation Sequence

1. Analysis package (this document set)
2. Workflow transition gates
3. KPI config SoT + UI loaders
4. Escape helpers + UI hardening
5. Live snapshot collector (read-only)
6. Bus persistence
7. Additive agent-comms bridge (offline)
8. Expanded tests
9. Atlas Sprint 2 sync
10. Stop for QA — no commit/push

---

## 9. Acceptance Criteria

- [ ] Workflow cannot skip stages or enter gated stages without required approvals
- [ ] KPI definitions loaded only from `config/kpi-definitions.json`
- [ ] Dynamic dashboard values are HTML-escaped
- [ ] Live snapshot collector exists and is read-only
- [ ] Agent Bus 2.0 persists messages to EOS store
- [ ] Additive v1 bridge exists; live send disabled by default
- [ ] DEF-EOS-001–005 resolved or formally closed with evidence
- [ ] Expanded tests pass (regression, negative, XSS, freeze, config)
- [ ] Atlas Sprint 2 documentation synchronized
- [ ] No Production / Track 1 / Revenue modifications
- [ ] No commit/push until QA + owner review
