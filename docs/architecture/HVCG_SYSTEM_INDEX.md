# HVCG System Index

Documentation only. Not application source.

Gate: **GATE 11 — COMPLETE** (2026-08-14). C1 checkout reductions are historical (see below).  
Working architecture: seven real systems. Do not invent an eighth product from leftover folders.  
Commercial launches are **after** the architecture audit.

Canonical Atlas line: `integration/atlas-canonical` (parent code/index SHA `9ca7023f23a721a724820e1bec144fb37f1d5456`; this Atlas continuity update follows).  
`origin/main` remains `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion.

Atlas V1 SoR: SharePoint `HVCG_*` (CRM / clients / projects / tasks / HVCG finance ops). No Dynamics/Dataverse migration.  
Client 360 mapping: **CLIENT 360 MAPPING — POST CORE AUDIT DEFERRED BACKLOG** (fail-closed).

---

# Real Systems

## 1. Atlas / HVCG OS

- **Purpose:** Internal operating system for High Value Capital Group (Elite OS, Hub, Business Architecture / FreeFit, PM, Client 360, finance/risk/growth workbenches).
- **Owner:** HVCG (internal)
- **Classification:** Internal platform
- **Repository:** `github.com/mblv89117/HVCG-05.git`
- **Canonical branch:** `integration/atlas-canonical`
- **Canonical worktree:** `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-canonical-integration`
- **Primary system of record:** SharePoint `HVCG_*` lists for Version 1 CRM/clients/projects/tasks/HVCG finance ops; Hub for runtime APIs; BA engines in-tree at `config/business/`
- **Production URL/status:** Azure production Elite/Hub (untouched by Gate 11 final closure). Do not treat `origin/main` as the integration line.
- **Integrations:** Entra ID, SharePoint, Graph, optional Local AI / Ollama loopback, Plaid API in-tree (`apps/atlas-plaid-api`). QBO application package exists on `cursor/quickbooks-integration` (preserved on origin) and is **not** yet merged into canonical.

## 2. Autonomous Marketing

- **Purpose:** HVCG commercial website, launch funnel, and lead routing (including EVA as a thin website assessment/lead funnel).
- **Owner:** HVCG (commercial marketing)
- **Classification:** Commercial
- **Repository:** `github.com/mblv89117/hvcg-atlas-autonomous-marketing.git`
- **Canonical branch:** `main` @ `97e3a913bc2ec7f8884d8bc7035864069122d06e`
- **Path:** `/Volumes/MacMiniPro2TB/Autonomous Marketing`
- **Primary system of record:** Website/CRM lead ingest; production leads route into Atlas intake
- **Production URL/status:** Live HVCG website (untouched by C1)
- **Integrations:** Atlas intake; EVA HTML funnel under `website/` and `campaigns/`

## 3. 360 Growth

- **Purpose:** Autonomous agentic AI marketing operating system for client tenants.
- **Owner:** HVCG (commercial product)
- **Classification:** Commercial
- **Repository:** `github.com/mblv89117/360-growth-solution.git`
- **Canonical branch:** current working branch `feature/system-monitor` @ `c8a7efafd6d02bae34500393aa25460a8866fa63` (product repo; not Atlas)
- **Path:** `/Volumes/MacMiniPro2TB/360 Growth Solution`
- **Primary system of record:** 360 Growth database / tenant configuration (`packages/db`, `packages/hart-pilot` for Hart)
- **Production URL/status:** 360 production (untouched by C1)
- **Integrations:** Hart Family Dental is a **tenant/pilot**, not a separate product

## 4. Growth Command Center

- **Purpose:** Commercial CFO / financial-intelligence product (not HVCG internal accounting).
- **Owner:** HVCG (commercial product)
- **Classification:** Commercial SaaS; own application and data boundary. HVCG may use GCC as a customer/tenant.
- **Repository:** `github.com/mblv89117/growth-command-center.git`
- **Canonical branch:** `main` @ `a69b3f5a8a35ddfcbadfc66a20ab27841bea32b5`
- **Path:** `/Volumes/MacMiniPro2TB/Growth Command Center`
- **Primary system of record:** GCC application data (separate from Atlas SharePoint `HVCG_*`)
- **Production URL/status:** GCC production (untouched by Gate 11). Commercial launch is post-audit.
- **Integrations:** Distinct product; do not merge into Atlas because of similar dashboards

## 5. Agent Copilot

- **Purpose:** Deep AI Business MRI / assessment product (not the website EVA funnel).
- **Owner:** HVCG (commercial product)
- **Classification:** Commercial
- **Repository:** `github.com/mblv89117/hvcg-agent-copilot.git`
- **Canonical branch:** `main` @ `c356cacf09e7d812d20ad92d80aa900e37953bcf`
- **Path:** `/Volumes/MacMiniPro2TB/getagentcopilot.com`
- **Primary system of record:** Copilot assessment store/engines
- **Production URL/status:** Not launched by C1. Do not launch from this gate.
- **Integrations:** Independent assessment product. EVA must not become a third assessment backend.

## 6. Elevated Syndicate

- **Purpose:** Private AI-powered podcast production system for Elevated Syndicate.
- **Owner:** Elevated Syndicate / HVCG independent line
- **Classification:** Independent product
- **Repository:** Nested git at `/Volumes/MacMiniPro2TB/Elevated Syndicate/elevated-syndicate-os` (no commits on `main` yet; source present). Parent folder is not a git repo.
- **Canonical branch:** none yet (uncommitted Next.js/Supabase app)
- **Path:** `/Volumes/MacMiniPro2TB/Elevated Syndicate`
- **Primary system of record:** Intended Supabase (schema present under `elevated-syndicate-os/supabase/`)
- **Production URL/status:** Not a production deployment in C1
- **Integrations:** Independent. Do not fold into Atlas.

## 7. Best Day Of My Life

- **Purpose:** Best Day Of My Life consulting website.
- **Owner:** Independent brand/site
- **Classification:** Independent
- **Repository:** Local git at `/Volumes/MacMiniPro2TB/Best Day Of My Life Consulting Website` — **no commits yet**; Next.js source untracked. No `origin` configured.
- **Canonical branch:** none yet
- **Path:** `/Volumes/MacMiniPro2TB/Best Day Of My Life Consulting Website`
- **Primary system of record:** Site content in this working tree
- **Production URL/status:** Not modified by C1
- **Integrations:** Independent. Do not merge into Atlas or 360.

---

# Client/Tenant Material

## Hart Family Dental → 360 Growth tenant

Hart is **not** an eighth product.

| Location | Classification | C1 disposition |
| -------- | -------------- | -------------- |
| `/Volumes/MacMiniPro2TB/360 Growth Solution/packages/hart-pilot` | **A.** Tenant configuration required by 360 | Leave. Authoritative Hart tenant software. |
| `/Volumes/MacMiniPro2TB/Hart Family Dental OS` | **B.** Client documentation + incomplete OneDrive dump (`OneDrive_2026-08-02/…`). Nested git `hart-family-dental-growth-os` has **no commits**, website working tree is `node_modules` only. | **Left in place.** Do not delete client documents. Unique complete standalone software was **not** proven. Do not create Hart OS v2. |
| `/Volumes/MacMiniPro2TB/Hart Family Dental Marketing OS` | **E.** Obsolete/active npm cache only (`.npm-cache`, written 2026-08-14) | **HOLD** — local npm process used this cache today. Not a product. |

Remote `github.com/mblv89117/hart-family-dental-growth-os.git` exists but `origin/main` was gone from the incomplete dump. Treat as client-material residue, not a live product.

---

# Archived / Retired Architecture

## Atlas worktrees retired (C1)

Worktree checkouts removed with `git worktree remove` only. **Local branches retained.** Remote refs and the preservation bundle were not deleted. Canonical HEAD unchanged at `70b6127ffb217f07091d1d54b5d660018617a563`.

| Worktree | Branch | SHA | Preservation evidence | Why the checkout is no longer required |
| -------- | ------ | --- | --------------------- | -------------------------------------- |
| client-portal-data-rooms | `cursor/client-portal-data-rooms` | `b8b2005b5467` | `origin/cursor/client-portal-data-rooms` | Portal docs/schema on origin; Elite already has client-portal surfaces in canonical |
| client-portal-sprint1 | `cursor/client-portal-sprint1` | `1d399eb656f5` | `origin/preservation/client-portal-sprint1-2026-08-12` | Sprint-1 MVP preserved remotely |
| crm-dev-validation-commit | `agent/crm-dev-validation` | `7c226e6737dd` | `origin/agent/crm-dev-validation` | CRM packaging commits on origin |
| crm-docs-owner | `agent/crm-docs-owner` | `d39efa22bd58` | origin + contained in canonical | History already in canonical |
| crm-migration-audit | `agent/crm-migration-audit` | `e6c5d723fc12` | origin + contained in canonical | History already in canonical |
| crm-power-automate | `agent/crm-power-automate` | `4c3d709252a8` | origin + contained in canonical | History already in canonical |
| crm-testing-qa | `agent/crm-testing-qa` | `fdd5f1157132` | origin + contained in canonical | History already in canonical |
| documentation-manager-sprint12-validation | `cursor/documentation-manager/sprint12-validation-ATLAS-T-1208` | `bd428ff9b040` | origin branch | Orchestration/docs validation on origin |
| elite-ui-release-recovery | `cursor/elite-ui-release-recovery` | `35ca684c5756` | origin + contained in canonical | Recovery line already in canonical |
| executive-command-center-sprint1 | `cursor/executive-command-center-sprint1` | `5bb42c252f5a` | origin | Mock ECC sprint on origin; later exec work is on other preserved lines |
| finance-operations-sprint1 | `cursor/finance-operations-sprint1` | `c287508ab775` | origin | Mock finance sprint on origin |
| operations-hub | `cursor/operations-hub` | `a584f612cb43` | origin | Ops hub package on origin |
| plaid-integration | `cursor/plaid-integration` | `6d78514c3197` | `origin/preservation/plaid-2026-08-12` | Plaid API already in canonical `apps/atlas-plaid-api` |
| project-atlas-authoritative | `cursor/project-atlas-rc1` | `bd07e6104847` | origin | Docs continuation line on origin |
| quickbooks-integration | `cursor/quickbooks-integration` | `c892215b31df` | `origin/cursor/quickbooks-integration` | Unique QBO app preserved on origin (`apps/atlas-qbo-api`); not copied into canonical in C1 |
| revenue-pipeline-product | `cursor/revenue-pipeline-product` | `6d47f0deda15` | `origin/preservation/revenue-pipeline-2026-08-12` | Commercial workbench preserved remotely |
| revenue-sprint4 | `cursor/revenue-sprint4-activation` | `bf34c931e645` | origin | Sprint 4/5 docs+engine on origin |
| sprint11-azure-production-migration | `cursor/sprint11-azure-production-migration` | `a386d816e77a` | origin | Azure migration history on origin; production not bound to this path |
| track9-eos-sprint1 | `cursor/track9-eos-sprint1` | `6b36782265e9` | origin | EOS sprint 1 on origin |

Registered Atlas worktrees after C1: **27** (root + canonical + 25 retained specialist checkouts). C1 did not change canonical HEAD (`70b6127` at that moment). Later Gate 11 docs/index commits advanced `integration/atlas-canonical` only. `origin/main` was not promoted.

## Duplicate HVCG copies

| Path | Disposition |
| ---- | ----------- |
| `/Volumes/MacMiniPro2TB/HVCG%20Project%20Management%20System` | **HOLD — REQUIRES REVIEW.** Not a git repo. Contains unique `.secrets` (different hashes from the registered local-ai worktree; **not** copied by the preservation program) plus sqlite already snapshotted under `ATLAS_PRESERVATION/05_data/orphan_encoded/`. Current Cursor workspace root. Do not permanently delete. |

## Archived empty roots

| Path | Disposition |
| ---- | ----------- |
| `/Volumes/MacMiniPro2TB/OllamaModels` | **MOVED** to `/Volumes/MacMiniPro2TB/HVCG_ARCHIVE/redundant-workspace-copies/20260814T201551Z/OllamaModels`. Empty (0 files). Real models remain in `~/.ollama/models`. |

## Assessment implementations

| Implementation | Role |
| -------------- | ---- |
| Autonomous Marketing `website/**/assessments/eva.html` | Thin HVCG website EVA funnel (keep; do not change live site in C1) |
| Agent Copilot | Deep AI Business MRI product (keep; do not launch in C1) |
| Encoded-path `local-ai-eva/eva-intake.sqlite` | Leftover local sqlite, preserved in `ATLAS_PRESERVATION/05_data/orphan_encoded/`. **Not** a third assessment product. |

## Preservation program (do not modify)

- Primary: `/Volumes/MacMiniPro2TB/ATLAS_PRESERVATION`
- Mirror: `/Users/macminipro/ATLAS_PRESERVATION_MIRROR`
- Bundle SHA-256: `5e901f2321df67af6f698d2656d7df31a2653652bf83158dc96cd385bf60b292`

---

# Rules

1. Do not create a new top-level product without architecture approval.
2. Worktrees are temporary.
3. Every system has one branch of record.
4. Every data domain has one system of record.
5. Integration beats copying.
6. Client-specific implementations should be tenants/configuration unless a real product boundary exists.
7. Similar features do not automatically justify merging different products.
8. No new database when an authoritative system of record already exists.
9. Atlas development happens on `integration/atlas-canonical` unless a later gate names a successor.
10. Do not force-delete dirty worktrees. Do not delete remote `preservation/*` refs. Do not promote canonical to `main` from this index.
11. Client 360 mapping is **POST CORE AUDIT DEFERRED BACKLOG**. Fail closed. Do not invent mappings.
12. Immediate `HVCG-Client-*` membership is Manny only unless a later owner roster says otherwise.
13. Gate 12 (worktree/workspace retirement) is **not started**. Do not execute retirement from this index.
