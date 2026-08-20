# Revenue & Engagement OS

**Train:** `revenue-os`  
**Branch:** `cursor/atlas-revenue-engagement-os`  
**Directive consumed:** `2`  
**Integration SoT:** `773b510` (`cursor/platform-integration-contracts`)

In-memory commercial control plane from offer recommendation through engagement economics. Hub `940a484` and Elite `75d0c59` stay frozen. No production writes, live dispatch, paid ads, or GCC auto-provision.

## Engines

| Module | Responsibility |
| --- | --- |
| `src/revenue_os/catalogs.py` | Service Catalog + Offer Catalog integrity |
| `src/revenue_os/pricing.py` | Pricing rules; observation-only recommendations |
| `src/revenue_os/commercial.py` | Opportunity commercial workspace / operator accept |
| `src/revenue_os/proposals.py` | Proposal engine (`autoSend=false`) |
| `src/revenue_os/documents.py` | MSA/SOW/change-order workflow |
| `src/revenue_os/engagements.py` | Scope, renewals, success-fee/tail, referral economics |
| `src/revenue_os/compatibility.py` | CC-001 / CC-002 / CC-003 adapters |
| `src/revenue_os/journey.py` | Synthetic offer → pricing → proposal → closed-won → engagement |

## Tests

```bash
python3 tests/revenue_os/run_train_suite.py
```

## Gates this checkpoint

- `liveDispatch=false`
- `autoProvisionAccess=false`
- `mutatesPaidAds=false`
- Copilot recommendations remain advisory
- Won ≠ Active Client ≠ GCC tenant
