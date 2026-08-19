# CTA_FLOWS (staging)

**As of:** 2026-07-15  
**Staging testing:** Approved · **Public publish:** Not approved  

| CTA | From | To | Staging behavior | Production later |
|-----|------|----|------------------|------------------|
| Start EVA | Home / Services | `assessments/eva.html` | Local form → JSON + band estimate | Form→Automate→Dev CRM |
| Contact | Nav / EVA | `contact.html` | Local capture only | Form→Dev Lead |
| Book appointment | Utility nav | `book-appointment.html` | Spec + placeholder | Bookings / Form |
| View pricing | Nav | `pricing.html` | Canonical HVCG rates | Same + owner approval note |
| Proposal path | Funnel page | `funnels/proposal.html` | Explains unsent generator | Owner-approved send |
| Secure upload | Footer | `secure-upload.html` | Placeholder | Guest link needs BL-C1 |

**Legacy guard:** EVA/contact forms require prospect checkbox — never rewrite existing-client pricing (ACCG locked).
