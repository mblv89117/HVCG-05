# SECURITY_PLAN

**Brand:** High Value Capital Group LLC  
**Environment:** Staging / Development only  
**As of:** 2026-07-15  
**Aligns with:** Platform recommendation, portal/data-room direction, `OWNER_DECISIONS` (BL-C1 deny-by-default)

## Security objectives (staging)

1. Keep the marketing/assessment site on **Dev** with **least privilege**.  
2. Capture leads into **Dev SharePoint lists** only — **never Production**.  
3. Collect minimal PII for funnel qualification.  
4. **No external client/guest invites** without `BL-C1`.  
5. No publish, DNS, or paid security products required for this plan.

---

## Trust boundaries

```
Anonymous / Entra-auth visitor (policy TBD)
  → SharePoint Communication Site (Dev)
  → Microsoft Forms (EVA / Readiness / Contact)
  → Power Automate (Dev connections)
  → HVCG_* lists (Dev site)
  → (Later) Bookings / calendar — internal

Forbidden without approval:
  → Prod lists / Prod site
  → Guest sharing to real clients
  → Public DNS / anonymous internet if site is internal-only
```

---

## Access model

| Surface | Staging access | Notes |
|---------|----------------|-------|
| Marketing pages | Prefer **org-only** or restricted Dev visitors until launch gate | Avoid accidental public indexing |
| Forms | Link from site; responses to owner/group mailbox or list | Limit edit rights on Forms |
| Automate flows | Dev connection refs; service account or maker with least privilege | No Prod connections |
| Secure Upload | Stub: queue “request link” internally | **No** guest link until BL-C1 |
| Client Portal page | Placeholder only | No auth UI / no password collection |
| Case Studies | Static placeholder | No document libraries with client files |

---

## Data classification on forms

| Field type | Class | Handling |
|------------|-------|----------|
| Name, work email, company, role | PII / business contact | Store in Dev Lead list; minimize retention copies |
| Revenue / capital bands | Sensitive business | Bands preferred over exact figures |
| Open-text “challenge” | Potentially sensitive | Discourage secrets/passwords in helper text |
| Uploaded financials | High | Only via approved secure channel later — not public form file upload in P0 |

**Helper text:** “Do not submit passwords, full SSNs, or bank login credentials.”

---

## Controls checklist

| Control | Staging requirement |
|---------|---------------------|
| Environment separation | Dev site + Dev lists only |
| Auth | Entra; review anonymous access before any broader share |
| Sharing | Default: members only; no “anyone with the link” for libraries |
| Guest invites | Blocked pending BL-C1 |
| Secrets in site | None (no API keys in pages) |
| Flow logging | Retain enough to debug; no secrets in run notes |
| Encryption | Tenant HTTPS / M365 defaults |
| DLP | Follow tenant DLP if present; don’t weaken for marketing |
| Backup | Rely on existing M365/Dev practices; no new backup purchase |
| Vulnerability scanning SaaS | Not required for SP pages staging; defer paid tools |

---

## Threats & mitigations

| Threat | Mitigation |
|--------|------------|
| Lead data written to Prod | Connection refs pinned to Dev; peer review flows |
| Public enumeration of Dev site | Org-only permissions; noindex; no DNS |
| Phishing via fake portal login | No login UI on Client Portal placeholder |
| Sensitive docs via open form | No file upload on public Forms in P0; Secure Upload stub only |
| Over-collection | Banded questions; content plan field list |
| Accidental client naming on Case Studies | Placeholder copy locked in CONTENT_PLAN |
| Analytics recording PII | Clarity off by default; mask if enabled (`ANALYTICS_PLAN.md`) |

---

## Secure Upload (staging procedure)

1. Visitor submits **request** (name, email, purpose) — not files.  
2. Internal ops reviews.  
3. If approved later (`BL-C1`), issue time-bound library link per portal standards.  
4. Until then: on-page message that uploads are not live.

---

## Incident response (lightweight)

| Step | Action |
|------|--------|
| Suspected Prod write | Stop flow; notify master-pm + integration; do not “fix forward” |
| Suspected external share | Revoke link; notify owner; log in incident note |
| Form spam | Close form / add org auth; purge junk from Dev list |

---

## Pre-public hardening (future — not now)

- Legal review Privacy/Terms/Disclaimer  
- Anonymous access decision documented  
- WAF/CDN only if platform changes (owner + spend approval)  
- Penetration test — only if moving off SP to custom public host  

## Forbidden without approval

Paid security appliances · DNS · public anonymous launch · client guest invites · storing credentials in lists or messages.
