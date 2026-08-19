# Client Disclosure Language — AI-Assisted Content

**Status:** Required whenever AI-drafted content is shown to or sent to clients, lenders, or investors
**Owner:** AI Governance + product owner of the sending surface
**Assumption:** Client Portal generative AI is not Production-approved; language below applies to email/documents that used AI drafting.

## 1. Principles

- Do not hide AI involvement.
- Do not imply AI content is a formal appraisal, legal opinion, investment advice, or binding offer unless a qualified human explicitly issues that work product under HVCG process.
- Prefer short, plain language.
- Keep disclosure even after human edit if AI materially drafted the content (unless entirely rewritten and Owner waives with audit note).

## 2. Standard internal label (staff UI)

```text
AI-generated draft — verify before use
```

## 3. Standard client-facing disclosure (documents / proposals)

```text
Portions of this document were prepared with AI-assisted drafting and reviewed by HVCG personnel.
Please rely on the final human-approved content. This is not automated advice.
```

## 4. Email disclosure (optional footer when AI drafted)

```text
This message was prepared with AI-assisted drafting and reviewed by a HVCG team member before sending.
```

## 5. Financial recommendation disclaimer (FIN)

```text
Financial figures and commentary are based on available HVCG records at generation time and may be incomplete.
They are for discussion only and are not a formal financial statement, tax, accounting, or investment advice.
A qualified HVCG reviewer must confirm figures before any decision or external commitment.
```

## 6. Enterprise-value / EVA disclaimer (EVA)

```text
Any enterprise-value or valuation range shown with AI assistance is an illustrative estimate only.
It is not a formal appraisal, fairness opinion, or offer of securities.
Do not use it as the sole basis for transaction, lending, or investment decisions.
Verified values, if any, are those explicitly approved by HVCG Capital Advisory / Owner.
```

## 7. Capital advisory boundary disclaimer (CAPITAL)

```text
Capital, lender, and investor materials drafted with AI assistance are preliminary and subject to HVCG Capital Advisory review.
AI outputs do not constitute a financing commitment, investor solicitation, or guarantee of terms.
Only authorized HVCG personnel may issue capital recommendations to external parties.
```

## 8. Portal / future interactive AI (CLIENT) — not Production-approved

If interactive portal AI is ever approved:

```text
Responses may be generated with AI assistance and can be incomplete or incorrect.
For decisions about your engagement, contact your HVCG representative.
Do not submit secrets or unnecessary personal data into this assistant.
```

## 9. Placement rules

| Surface | Disclosure |
|---------|------------|
| Internal AI queue | §2 + metadata line |
| Client PDF/proposal with AI draft | §3 + FIN/EVA/CAPITAL as applicable |
| Client email from AI draft | §4 minimum; add FIN/CAPITAL in body if content warrants |
| Capital package | §3 + §7; §6 if valuation content |
| Finance narrative | §3 + §5 |
| Portal chat | Blocked until release sign-off; then §8 |

## 10. Prohibited client language

Do not say or imply:

- “Guaranteed returns”
- “Certified appraisal by AI”
- “Automatically approved financing”
- “Verified accurate” without HumanVerified status
- That the AI is a licensed attorney, CPA, or broker-dealer
