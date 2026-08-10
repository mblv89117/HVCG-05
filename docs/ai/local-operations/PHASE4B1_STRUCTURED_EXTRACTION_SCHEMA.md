# Phase 4B-1 Structured Extraction Schema

All fields are **drafts**. Prefer page / source references when available.

## Field object

```ts
{
  key: string;
  value: string | number | boolean | null;
  confidence: number;
  sourcePage: number | null;
  sourceKind: 'embedded' | 'ocr' | 'model_inference';
  notes?: string; // e.g. "Draft extraction — not authoritative"
}
```

## Target keys (where applicable)

client/company · title · document/effective/expiration dates · parties · addresses · contacts · amounts · payment terms · interest rate · loan amount · maturity/renewal · deadlines · obligations · deliverables · signatures/initials present|missing · page count · missing-page indicators · exhibits · governing law · confidentiality · termination · default · document status

## Package aggregates

Also returns `dates[]`, `amounts[]`, `deadlines[]`, `obligations[]`, signature review, missing-page review — all non-authoritative heuristics.
