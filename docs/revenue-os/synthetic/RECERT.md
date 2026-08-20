# Synthetic commercial journey recert — directive 7

**SHA:** `e9b3be8c58a3ea20f8d73806c9dbd6258cec8c56`
**Journey:** `REVOS-SYN-20260820-01`
**Command:** `python3 tests/revenue_os/run_synthetic_recert.py`
**Also:** `python3 -m unittest tests.revenue_os.test_synthetic_journey -v` → OK
**Result:** PASS
**Captured:** 2026-08-20T14:52:20Z

Existing engine only — catalogs/pricing/proposal/MSA-SOW/engagement were not rebuilt.
Live Graph / live dispatch / paid ads / GCC auto-provision remain false.
Won does not auto-activate a Client.

## Stage evidence

- Service/Offer catalog: {'serviceLines': 7, 'offers': 13} (expect 7 lines / 13 offers)
- Pricing rules: observationOnly=True
- Opportunity commercial config: offer=SKU-CAP-CORE
- Proposal: status=ACCEPTED sendBlocked=True
- Closed won: wonActivatesClient=False
- Engagement: id=eng-revos-001 replay=True successFee=EARNED referralPayoutAllowed=False

## Gates (all must be false)

- `liveDispatch` = `False`
- `autoSendProposal` = `False`
- `autoSendDocument` = `False`
- `autoProvisionAccess` = `False`
- `mutatesPaidAds` = `False`
- `autoQualifyLead` = `False`
- `legacyAutoReprice` = `False`
- `autonomousReferralPayout` = `False`
- `productionWrites` = `False`
- `liveGraphWrites` = `False`
- `copilotHasCommercialAuthority` = `False`
- `wonActivatesClient` = `False`
- `wonCreatesGccTenant` = `False`

## Check matrix

- catalogServiceLines: PASS
- catalogOffers: PASS
- pricingObservationOnly: PASS
- proposalSendBlocked: PASS
- proposalAccepted: PASS
- engagementCreated: PASS
- engagementReplay: PASS
- wonActivatesClientFalse: PASS
- liveDispatchFalse: PASS
- liveGraphWritesFalse: PASS
- mutatesPaidAdsFalse: PASS
- autoProvisionAccessFalse: PASS
- noUnsafeGates: PASS
