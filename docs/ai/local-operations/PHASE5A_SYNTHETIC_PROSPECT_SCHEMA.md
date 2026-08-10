# Synthetic Prospect Schema (Phase 5A)

```json
{
  "prospectId": "uuid",
  "companyId": "uuid",
  "contactId": "uuid",
  "submissionId": "uuid",
  "source": "Enterprise Value Assessment",
  "status": "EVA Submitted",
  "recommendedOwner": "Manny",
  "activeClient": false,
  "synthetic": true
}
```

Statuses after Manny decision: Qualified | Needs More Information | Not a Fit | Hold | Duplicate | Archived.  
`activeClient` is always `false` in Phase 5A.
