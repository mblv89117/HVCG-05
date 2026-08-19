# EXECUTIVE_BRIEF_ASSEMBLY — A13 recipe

**Automation ID:** A13 — Executive reporting (snapshot assembly)  
**Owner path:** Technology → Master PM → Manny  
**Environment:** Dev / read-only registers · **No Prod · No sends**  
**Output SoR:** `docs/business-launch/EXECUTIVE_BRIEF.md`

---

## Purpose

Assemble a daily **EXECUTIVE_BRIEF.md** for Manny from authoritative registers so COO / Master PM does not manually copy KPIs from six or more files. Unknown or unreadable values render as **`0`** (counts) or **`MISSING`** (text).

---

## Inputs (read-only)

| # | Source | Path (relative to `docs/business-launch/`) | Extract |
|---|--------|-----------------------------------------------|---------|
| 1 | Client health JSON | `executive/CLIENT_HEALTH_DASHBOARD.json` | `band_summary`, `client_count`, `structured_count`, Green/Yellow/Red clients |
| 2 | Finance AR | **Primary:** `.worktrees/finance-operations/docs/finance/inventory/AR_SNAPSHOT.md` + `INVOICE_REGISTER.json` · **Fallback:** `finance/AR_AGING_ONE_PAGER.md` | Past-due count, client breakdown, verified MRR floor |
| 3 | Website | `WEBSITE_STATUS.md` | Completion %, page count, publish state, BL-W1 block |
| 4 | Funnel | `FUNNEL_STATUS.md` | Live leads, blocked gates, ready vs blocked |
| 5 | Sales pipeline | `SALES_PIPELINE_STATUS.md` | Opportunity count, stage readiness |
| 6 | Automation catalog | `automation/AUTOMATION_CATALOG.md` | Workflow count (~22), est. hrs/wk |
| 7 | Implementation queue | `automation/IMPLEMENTATION_QUEUE.md` | Top no-gate builds, live deployment count |
| 8 | Owner gates | `OWNER_DECISIONS.md` | Open gates table (blocking only when hit) |
| 9 | Agent / specialist health | `SPECIALIST_ROSTER.md`, `PERMANENT_TEAMS.md`, optional `../../MASTER_PROJECT_STATUS.md` | Running specialists, stale heartbeat note |
| 10 | Client corpus (optional) | `clients/INDEX.md`, `crm-import/*_dev_shell.json` | Profile count, Dev CRM shell count |

---

## Assembly script

**Canonical runner:**

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/master-pm-orchestrator"
python3 docs/business-launch/automation/assemble_executive_brief.py
```

**Dry-run (stdout only, no write):**

```bash
python3 docs/business-launch/automation/assemble_executive_brief.py --dry-run
```

**Override date (testing):**

```bash
python3 docs/business-launch/automation/assemble_executive_brief.py --date 2026-07-15
```

---

## Output sections (EXECUTIVE_BRIEF.md)

| Section | Primary source(s) | Default if missing |
|---------|-------------------|--------------------|
| Header (date, from, to) | `--date` or local date | today |
| Revenue generated | AR register + SALES_PIPELINE | `$0` net-new; MRR floor from AR or MISSING |
| Revenue pipeline | FUNNEL + SALES_PIPELINE | `$0` public; internal upside from WEBSITE |
| Active proposals | SALES_PIPELINE | `0` |
| Active clients | CLIENT_HEALTH + clients/INDEX | counts `0`; names MISSING |
| Client health | CLIENT_HEALTH_DASHBOARD.json | Green/Yellow/Red `0` |
| Automations completed | AUTOMATION_CATALOG + IMPLEMENTATION_QUEUE | catalog `0`; live deployments `0` |
| Hours saved | AUTOMATION_CATALOG totals | `~0 realized`; catalog est. or MISSING |
| Cash flow risks | WEBSITE + FUNNEL + AR | MISSING |
| Collection risks | AR_SNAPSHOT / INVOICE_REGISTER | `0` signals; MISSING detail |
| Website progress | WEBSITE_STATUS | `MISSING` |
| Funnel progress | FUNNEL_STATUS | MISSING |
| AI agent health | SPECIALIST + PERMANENT_TEAMS + MASTER_PROJECT_STATUS | MISSING |
| Critical blockers | OWNER_DECISIONS + source blockers | MISSING |
| Decisions requiring Manny | OWNER_DECISIONS open gates | empty list |
| Top 5 priorities | IMPLEMENTATION_QUEUE + COO charter (static fallback) | MISSING |
| Footer | script metadata | assembly timestamp + sources read |

---

## Idempotency rules

1. **Deterministic body:** Same source file contents → same brief body (except assembly timestamp in footer).
2. **Safe re-run:** Overwrites `EXECUTIVE_BRIEF.md` in full; no append or partial merge.
3. **Missing files:** Script continues; affected sections use `0` / `MISSING` and list missing paths in footer.
4. **No side effects:** Does not send email, write Prod, import CRM, or touch credentials.

---

## Finance AR resolution order

1. `$REPO_ROOT/.worktrees/finance-operations/docs/finance/inventory/INVOICE_REGISTER.json`  
   → `ar_flag_count`, `row_count`, past-due by client  
2. `$REPO_ROOT/.worktrees/finance-operations/docs/finance/inventory/AR_SNAPSHOT.md`  
   → human-readable past-due table  
3. `docs/business-launch/finance/AR_AGING_ONE_PAGER.md`  
   → directional MRR floor when JSON absent  

`$REPO_ROOT` = parent of `.worktrees/` (repo root containing finance-operations worktree).

---

## Master PM daily checklist (manual fallback)

If Python is unavailable:

- [ ] Read `executive/CLIENT_HEALTH_DASHBOARD.json` → health bands  
- [ ] Read finance AR snapshot (finance-operations inventory or `finance/AR_AGING_ONE_PAGER.md`)  
- [ ] Read `WEBSITE_STATUS.md`, `FUNNEL_STATUS.md`, `SALES_PIPELINE_STATUS.md`  
- [ ] Read `automation/AUTOMATION_CATALOG.md` + `IMPLEMENTATION_QUEUE.md`  
- [ ] Read `OWNER_DECISIONS.md` → copy open gates to “Decisions requiring Manny”  
- [ ] Skim `SPECIALIST_ROSTER.md` / `PERMANENT_TEAMS.md` for agent health line  
- [ ] Write `EXECUTIVE_BRIEF.md` with today's date; use `0` / `MISSING` for gaps  

---

## Related automations

| ID | Name | Relationship |
|----|------|--------------|
| A13 | Executive reporting assembly | **This recipe** |
| A07 | Financial reporting (AR snapshot) | Upstream — refreshes finance inventory |
| A18 | Client health dashboard regen | Upstream — refreshes CLIENT_HEALTH_DASHBOARD.json |

---

## Gates

| Gate | Impact on assembly |
|------|---------------------|
| PROD-1 | **None** — read-only markdown/JSON |
| BL-C1 | **None** — no outbound |
| BL-F1 | **None** — no bank connect; uses filename signals only |

Owner approval **not required** to run assembly (catalog A13: Owner approval needed = **No**).
