# Phase 4B-1 Document Classification Schema

Draft-only. `mannyReviewRequired` is always `true`.

## Types

`agreement` · `proposal` · `invoice` · `bank_statement` · `tax_document` · `financial_statement` · `insurance_document` · `identification_document` · `lease` · `purchase_agreement` · `lender_request` · `client_intake` · `meeting_notes` · `correspondence` · `marketing_asset` · `operating_document` · `unknown`

## Result shape

```ts
{
  proposedType: DocumentClassification;
  confidence: number; // 0–1 heuristic
  alternatives: Array<{ type; confidence }>;
  evidence: string[];
  mannyReviewRequired: true;
}
```

## Routing hint

Deep types (agreements, leases, purchase agreements, financing-like lender docs, tax): **Deep Analysis** profile.  
Routine invoice / bank statement / operating / correspondence: **Fast Operations** profile.
