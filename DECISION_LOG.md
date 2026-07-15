# DECISION LOG

Architecture and product decisions. Format: Context → Options → Decision → Consequences.

---

### D001 — System of record for V1 operational data
- **Date:** 2026-07-14
- **Context:** Need relational-ish PM/CRM data without unnecessary premium spend.
- **Options:** (A) SharePoint Lists (B) Dataverse (C) Azure SQL
- **Decision:** **A — SharePoint Lists**
- **Consequences:** Lookups + denormalized keys; monitor list thresholds; path to Dataverse in V2 if needed.

### D002 — Avoid premium Power Platform licensing in V1
- **Date:** 2026-07-14
- **Context:** Budget predictability.
- **Decision:** Standard connectors only; document any premium exception in OWNER_ACTIONS and licensing.
- **Consequences:** No Dataverse, Power Pages, or premium connector flows in V1 packages.

### D003 — Primary UI = Power Apps canvas on Lists
- **Date:** 2026-07-14
- **Decision:** Canvas app `HVCG_ProjectCommandCenter`
- **Consequences:** App formulas documented for rebuild if `.msapp` binary not exported from this environment.

### D004 — Client document isolation pattern
- **Date:** 2026-07-14
- **Options:** (A) Library per client on shared site (B) Site per client (C) Folder ACL only in one library
- **Decision:** **A — Library per client** on `HVCG-Clients`
- **Consequences:** Stronger than single-library folders; simpler than site-per-client.

### D005 — Task system of record
- **Date:** 2026-07-14
- **Options:** Planner vs Lists
- **Decision:** **Lists (`HVCG_Tasks`)** as SOR; optional Planner board later for personal view only
- **Consequences:** Uniform reporting with projects/docs.

### D006 — Executive notification policy
- **Date:** 2026-07-14
- **Decision:** Implement explicit escalation rules (brief §14); no routine task spam to Manny
- **Consequences:** `RequiresExecutiveAttention` flag + flow.

### D007 — Client portal
- **Date:** 2026-07-14
- **Decision:** Defer Power Pages; V1 uses email + secure sharing links
- **Consequences:** Client dashboard requirements moved to BACKLOG.

### D008 — Currency and timezone
- **Date:** 2026-07-14
- **Decision:** USD; America/Los_Angeles
- **Consequences:** Config constants in `config/hvcg.config.json`

### D009 — Provisioning approach
- **Date:** 2026-07-14
- **Decision:** PnP PowerShell templates + JSON list schemas in repo; Graph app with certificate preferred
- **Consequences:** Owner must consent app registration (owner action).

### D011 — Elevate product to HVCG OS (pre-deploy)
- **Date:** 2026-07-14
- **Context:** Owner requested operating system scope (CRM, capital, finance, AI queues, ops hub, portal prep, Copilot, enterprise BI) without removing V1 PM core.
- **Decision:** Extend SharePoint list architecture to **67 lists**; keep Lists as SOR; portal/AI execution gated; Docs ARCHITECTURE_REVIEW / SCALABILITY / TECHNICAL_DEBT / VERSION2_ROADMAP published.
- **Consequences:** Richer Dev deploy; canvas app must use screen-scoped data sources; monitor list thresholds.
