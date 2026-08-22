# HVS + HVCG Account Connection Inventory

Owner-facing checklist for **High Value Solution LLC** and **High Value Capital Group LLC** multi-account discovery and integration.

**Legend:** `yes` · `no` · `partial` · `n/a` · `—` (not yet assessed)

**App registration note:** Atlas Integration Hub (Dev) is registered in the HVCG Entra tenant. Use Connections Center to add additional accounts without replacing existing connections.

**Last updated:** 2026-07-20

---

## Status columns (all sections)

| Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|

---

## 1. Microsoft tenants

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG Entra tenant (`highvaluecapitalgroup.com`) | yes | yes | no | yes (granted for Hub app) | partial | partial | partial | Graph delta sync on mail (400 BadRequest) | Fix mail sync strategy; add next mailbox |
| HVS Entra tenant (domain TBD — Manny to list) | — | no | yes | TBD | no | no | no | Not connected | **Owner:** confirm HVS tenant domain / whether separate tenant exists |
| Legacy / personal Microsoft tenant (if any) | — | no | yes | TBD | no | no | no | Not inventoried | List any non-HVCG Microsoft logins Manny uses for business |

---

## 2. Microsoft user mailboxes

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Manuel Barela — HVCG user mailbox | yes | **yes** | no | no (delegated) | yes | partial | partial | Mail delta tracking unsupported | Run discovery; add **next** mailbox (see OWNER_MULTI_ACCOUNT_SEQUENCE.md) |
| HVS primary user mailbox (email TBD) | — | no | yes | TBD | no | no | no | Not connected | Connect via **Add Microsoft account** with entity = HVS |
| Additional HVCG user mailboxes (list TBD) | — | no | yes | no | no | no | no | Not inventoried | Manny: list all HVCG @ addresses used for business |
| Additional HVS user mailboxes (list TBD) | — | no | yes | TBD | no | no | no | Not inventoried | Manny: list all HVS @ addresses |

---

## 3. Microsoft shared mailboxes

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG shared mailboxes (e.g. info@, ops@ — list TBD) | — | no | yes | may need `Directory.Read.All` | no | no | no | Not connected | **Add shared mailbox** in Connections Center; grant Full Access in Exchange admin |
| HVS shared mailboxes (list TBD) | — | no | yes | TBD | no | no | no | Not inventoried | List shared mailbox SMTP addresses |

---

## 4. Microsoft aliases

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG SMTP aliases on Manuel Barela mailbox | partial | partial | no | no | no | no | no | Aliases ride primary connection | Document alias list in Entra / Exchange |
| HVS aliases (list TBD) | — | no | yes | TBD | no | no | no | Not inventoried | List alias addresses per mailbox |

---

## 5. SharePoint sites

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG SharePoint hub / team sites | partial | partial | no | no (`Sites.Read.All`) | partial | — | — | Depends on connected mailbox | Run **Run discovery** on HVCG Microsoft connection |
| HVS SharePoint sites (if separate tenant) | — | no | yes | TBD | no | no | no | Not connected | Connect HVS Microsoft account first |

---

## 6. OneDrive accounts

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Manuel Barela OneDrive (HVCG) | partial | partial | no | no (`Files.Read.All`) | partial | — | — | Via primary Microsoft connection | Run discovery after mailbox validation |
| Other HVCG / HVS OneDrive (list TBD) | — | no | yes | no | no | no | no | Not inventoried | Connect each user's Microsoft account |

---

## 7. Teams resources

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG Teams channels / chats | — | no | yes | may need Teams scopes (future) | no | no | no | Teams not in v1 Hub scopes | Defer until mail + SharePoint stable |
| HVS Teams (if any) | — | no | yes | TBD | no | no | no | Not inventoried | List Teams used for HVS vs HVCG |

---

## 8. Google accounts

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG Google accounts (list TBD) | — | no | **yes** | OAuth consent screen | no | no | no | Not connected | Complete Google Cloud OAuth setup; connect one-by-one |
| HVS Google accounts (list TBD) | — | no | **yes** | OAuth consent screen | no | no | no | Not connected | Manny: list Gmail addresses used for HVS business |
| Personal Gmail used for business (legacy) | — | no | **yes** | user consent | no | no | no | Not inventoried | Mark entity = legacy when connecting |

---

## 9. Google Workspace tenants

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| HVCG Google Workspace (domain TBD) | — | no | **yes** | Workspace admin if Internal app | no | no | no | Not connected | Confirm whether HVCG uses Workspace vs consumer Gmail |
| HVS Google Workspace (domain TBD) | — | no | **yes** | TBD | no | no | no | Not connected | Manny: list HVS Google domain if any |

---

## 10. Gmail aliases and delegated accounts

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Gmail aliases (list TBD) | — | no | **yes** | user consent | no | no | no | Not inventoried | Document aliases per primary Google account |
| Delegated Gmail access (list TBD) | — | no | **yes** | delegate must authorize | no | no | no | Not inventoried | Connect delegate's primary account |

---

## 11. Google Drives and Shared Drives

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| My Drive (per connected Google account) | — | no | **yes** | no | no | no | no | Requires Google OAuth | Connect Google account first |
| Shared Drives (list TBD) | — | no | **yes** | no | no | no | no | Not inventoried | List Shared Drive names after first Google connect |

---

## 12. GitHub accounts and organizations

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Manny personal GitHub | — | no | **yes** | GitHub App install | no | no | no | Not connected | Create/install Atlas GitHub App |
| HVCG GitHub org(s) (list TBD) | — | no | **yes** | org owner approval | no | no | no | Not connected | **Add GitHub organization** after Microsoft + Google |
| HVS GitHub org(s) (list TBD) | — | no | **yes** | org owner approval | no | no | no | Not connected | List org slugs for installation |

---

## 13. GitHub repositories

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Project Atlas / HVCG repos (list TBD) | partial | no | **yes** | repo selection in App | no | no | no | Not connected | Select repos during GitHub App install |
| HVS repos (list TBD) | — | no | **yes** | TBD | no | no | no | Not inventoried | Enumerate after org install |

---

## 14. Accounting systems (QuickBooks, etc.)

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| QuickBooks Online — HVCG | — | no | yes | Intuit OAuth | no | no | no | Scaffold only | Defer to Phase 5 (see sequence doc) |
| QuickBooks Online — HVS | — | no | yes | TBD | no | no | no | Scaffold only | Confirm which entity uses QBO |
| Other accounting (Xero, etc.) | — | no | yes | TBD | no | no | no | Not inventoried | List systems Manny uses |

---

## 15. Payment systems (Mercury, Square, Cash App)

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Mercury — HVCG | — | no | yes | API keys / OAuth TBD | no | no | no | Scaffold only | Defer to Phase 5 |
| Mercury — HVS | — | no | yes | TBD | no | no | no | Scaffold only | Confirm account ownership |
| Square | — | no | yes | TBD | no | no | no | Not inventoried | List if used for either entity |
| Cash App Business | — | no | yes | TBD | no | no | no | Not inventoried | List if used |

---

## 16. Electronic-signature (DocuSign)

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| DocuSign — HVCG | — | no | yes | DocuSign admin | no | no | no | Not connected | Defer; list envelope retention needs |
| DocuSign — HVS | — | no | yes | TBD | no | no | no | Not connected | Confirm separate DocuSign account |

---

## 17. Cloud-storage (Dropbox, Box)

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Dropbox — business | — | no | yes | user / team admin | no | no | no | Scaffold only | Use **Add storage** when enabled |
| Box — business | — | no | yes | TBD | no | no | no | Scaffold only | List if used |

---

## 18. Local and external-drive storage

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Project Atlas monorepo | **yes** | n/a | n/a | n/a | n/a | n/a | n/a | Local git source | Path: `/Volumes/MacMiniPro2TB/HVCG Project Management System` |
| Atlas integration release worktree | **yes** | n/a | n/a | n/a | n/a | n/a | n/a | Active dev branch | Path: `…/HVCG Project Management System/.worktrees/atlas-integration-release` |
| Cursor agent worktrees (other) | partial | n/a | n/a | n/a | n/a | n/a | n/a | Enumerate as needed | List additional `.worktrees/*` paths Manny uses |
| Mac external volumes (list TBD) | partial | n/a | n/a | n/a | n/a | n/a | n/a | Not indexed | Manny: list mounted drives with business files |
| USB / archive drives (list TBD) | — | n/a | n/a | n/a | n/a | n/a | n/a | Offline | Document when connected for one-time ingest |

---

## 19. Website and domain systems (GoDaddy, hosting)

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| `highvaluecapitalgroup.com` DNS / GoDaddy | partial | no | yes | GoDaddy login | no | no | no | Not connected | Manny: confirm registrar login; defer API |
| HVS domain(s) TBD | — | no | yes | TBD | no | no | no | Not inventoried | List HVS domains and hosting provider |
| Web hosting / CDN (list TBD) | — | no | yes | TBD | no | no | no | Not inventoried | Document hosting accounts |

---

## 20. Other discovered systems

| Item | Discovered | Connected | Auth required | Admin consent required | Sync enabled | Validation passed | Data imported | Error/blocker | Next required action |
|------|------------|-----------|---------------|------------------------|--------------|-------------------|---------------|---------------|----------------------|
| Plaid (banking — Elite OS) | partial | partial | yes | Plaid Link | partial | — | — | Separate from Integration Hub | Continue via Banking Connections page |
| Microsoft Elite OS SPA login | yes | yes | no | Entra app (public client) | n/a | n/a | n/a | Distinct from Hub confidential client | Keep `VITE_ENTRA_CLIENT_ID` aligned |
| Atlas Integration Hub API (local :8790) | yes | yes | no | n/a | yes | partial | partial | Dev only | Deploy to staging when ready |
| *(Add row)* | — | — | — | — | — | — | — | — | Manny / agent: append as discovered |

---

## Domain placeholders — Manny please complete

| Entity | Primary email domain | Secondary domains / aliases | Tenant notes |
|--------|---------------------|------------------------------|--------------|
| **HVCG** | `highvaluecapitalgroup.com` | *(list)* | Connected: Manuel Barela mailbox |
| **HVS** | *(list)* | *(list)* | Separate tenant? Y/N |
| **Legacy** | *(list)* | *(list)* | Pre-rebrand addresses |

---

## Quick reference — current state (2026-07-20)

- **Connected:** Manuel Barela / HVCG Entra user mailbox via Atlas Integration Hub (Dev)
- **Auth required next:** Google, GitHub, additional Microsoft mailboxes
- **Owner sequence:** See [OWNER_MULTI_ACCOUNT_SEQUENCE.md](./OWNER_MULTI_ACCOUNT_SEQUENCE.md)
