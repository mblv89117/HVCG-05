# EVA Input Schema (Phase 5A)

Required acknowledgments: `consent.consentAcknowledgment=true`, `consent.syntheticTestAcknowledgment=true`.

## Company

`legalCompanyName` (required), `dba`, `industry`, `website`, `address`, `yearsInBusiness`, `numberOfEmployees`

## Contact

`firstName`, `lastName`, `email` (required), `title`, `phone`

## Financial

`annualRevenue`, `grossProfit`, `ebitdaOrNetIncome`, `outstandingDebt`, `monthlyDebtPayments`, `availableCash`, `accountsReceivable`, `accountsPayable` (numeric or null)

## Business profile

`ownershipStructure`, `keyPersonDependency`, `recurringRevenue`, `customerConcentration`, `operationalMaturity`, `financialReportingQuality`, `managementDepth`, `growthGoals`, `desiredCapital`, `intendedUseOfFunds`, `primaryBusinessChallenges`

## Assessment

`salesAndMarketing`, `operations`, `finance`, `leadership`, `technology`, `risk`, `growthReadiness`, `enterpriseValueReadiness`

## Consent / source

`consentAcknowledgment`, `referralSource`, `utmSource`, `utmMedium`, `utmCampaign`, `submissionSource`, `syntheticTestAcknowledgment`

## Envelope

Optional `idempotencyKey`, `scenarioLabel`. Max payload ~200KB. Injection/spam heuristics reject `ignore previous`, `system prompt`, `<script`, `rm -rf`.

Canonical TypeScript: `packages/atlas-integration-core/src/local-ai/evaIntake.ts` (`EvaSubmissionPayload`).
