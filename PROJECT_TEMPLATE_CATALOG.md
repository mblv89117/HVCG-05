# PROJECT TEMPLATE CATALOG — HVCG OS

Templates live in `templates/projects/*.json` (**21** templates).

## Delivery / advisory (original 18)

| Key | Name |
|-----|------|
| general-client-onboarding | General Client Onboarding |
| enterprise-value-assessment | Enterprise Value Assessment |
| capital-readiness-assessment | Capital Readiness Assessment |
| debt-capital-raise | Debt Capital Raise |
| equity-capital-raise | Equity Capital Raise |
| sba-loan-package | SBA Loan Package |
| commercial-real-estate-financing | Commercial Real Estate Financing |
| private-credit-package | Private Credit Package |
| fractional-cfo-engagement | Fractional CFO Engagement |
| cash-flow-forecasting | Cash-Flow Forecasting |
| financial-model-development | Financial Model Development |
| investor-presentation | Investor Presentation |
| lender-package | Lender Package |
| business-launch | Business Launch |
| operational-improvement | Operational Improvement |
| data-room-preparation | Data-Room Preparation |
| retainer-renewal | Retainer Renewal |
| engagement-closeout | Engagement Closeout |

## Capital OS additions

| Key | Name | Pairs with |
|-----|------|------------|
| equipment-financing | Equipment Financing | CapitalType Equipment Financing |
| working-capital | Working Capital Facility | CapitalType Working Capital |
| investor-outreach | Investor Outreach Campaign | InvestorOutreach list |

Instantiate via `HVCG_CreateProjectFromTemplate` / `New-HVCGProjectFromTemplate.ps1`. Maintain `HVCG_CapitalOpportunities.FundingStatus` alongside project health.
