# Appointment Booking Funnel — Staging Spec

**Page:** `/book-appointment` · `staging/book-appointment.html`  
**Legacy slug:** `/book-strategy-call` → redirect  
**As of:** 2026-07-15

---

## Purpose

Convert **qualified** prospects to a discovery / strategy call. Prefer EVA + Capital Readiness complete before booking.

---

## Mechanisms (Layer A)

| Option | Technology | CRM target |
|--------|------------|------------|
| Primary | Microsoft Bookings (if tenant-enabled) | `HVCG_DiscoveryCalls` |
| Fallback | Request form + manual confirm | Same list |

**Staging:** HTML placeholder — no live calendar embed.

---

## Form fields (request fallback)

| Field | Required |
|-------|----------|
| Name | Yes |
| Email | Yes |
| Company | Yes |
| EVA completed? | Yes/No |
| Readiness completed? | Yes/No |
| Capital intent summary | Yes |
| Preferred times (3 slots) | Yes |
| Reason if skipping assessments | If applicable |

---

## Routing logic

| State | UX |
|-------|-----|
| EVA + Readiness done | Full booking / fast-track confirm |
| EVA only | Book with prompt to complete Readiness |
| Neither | Soft gate: "Start EVA" primary; allow exception with reason |
| Disqualified | Redirect messaging to FAQ / Resources |

---

## Power Automate (Dev)

```
Booking submitted
  → Create HVCG_DiscoveryCalls row
  → Link Lead ID if exists
  → Notify internal owner (draft — no external auto-confirm until approved)
```

---

## Copy requirements

- Title: Book Appointment (or Book a Strategy Call — same page)  
- State preference for completed assessments  
- No SLA guarantee unless owner approves  
- Link Disclaimer

---

## CTA placement

Primary utility nav on all marketing pages. Secondary on Pricing, Process, FAQ, assessment thank-you screens.

---

## Metrics

| Event | When |
|-------|------|
| `strategy_call_requested` | Form submit / booking created |
| `strategy_call_scheduled` | Internal confirm |

---

## Related

`CONVERSION_PATH.md` · `staging/funnels/EVA.md` · `staging/funnels/PROPOSAL.md` · `book-appointment.html`
