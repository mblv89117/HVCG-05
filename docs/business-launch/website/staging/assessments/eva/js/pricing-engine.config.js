window.HVCG_PRICING_CONFIG = {
  "config_version": "pricing-config-1.0.0",
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "currency": "USD",
  "legacy_block_classes": [
    "HVS_LEGACY_CLIENT",
    "HVS_TRANSITIONING_CLIENT",
    "FORMER_CLIENT"
  ],
  "skus": {
    "SKU-FRA": {
      "name": "Funding Readiness Assessment",
      "category": "Capital Advisory",
      "setup": 0,
      "monthly": null,
      "success_fee_pct": null,
      "timeline_weeks": 1,
      "owner_review_required": false
    },
    "SKU-CAP-CORE": {
      "name": "Capital Advisory \u2014 Core",
      "category": "Capital Advisory",
      "setup": 5000,
      "monthly": 3500,
      "success_fee_pct": null,
      "timeline_weeks": 8,
      "owner_review_required": false
    },
    "SKU-CAP-GROWTH": {
      "name": "Capital Advisory \u2014 Growth",
      "category": "Capital Advisory",
      "setup": 10000,
      "monthly": 7500,
      "success_fee_pct": null,
      "timeline_weeks": 12,
      "owner_review_required": false
    },
    "SKU-CAP-ENT": {
      "name": "Capital Advisory \u2014 Enterprise",
      "category": "Capital Advisory",
      "setup": 20000,
      "monthly": 12500,
      "success_fee_pct": null,
      "timeline_weeks": 16,
      "owner_review_required": true
    },
    "SKU-FCFO": {
      "name": "Fractional CFO",
      "category": "Fractional CFO",
      "setup": null,
      "monthly": null,
      "success_fee_pct": null,
      "timeline_weeks": 12,
      "owner_review_required": true
    },
    "SKU-EXIT": {
      "name": "Exit Readiness Advisory",
      "category": "Exit Readiness",
      "setup": null,
      "monthly": null,
      "success_fee_pct": null,
      "timeline_weeks": 16,
      "owner_review_required": true
    },
    "SKU-ACQ": {
      "name": "Acquisition Advisory",
      "category": "Acquisition Advisory",
      "setup": null,
      "monthly": null,
      "success_fee_pct": null,
      "timeline_weeks": 20,
      "owner_review_required": true
    },
    "SKU-MODEL": {
      "name": "Financial Modeling",
      "category": "Financial Modeling",
      "setup": null,
      "monthly": null,
      "success_fee_pct": null,
      "timeline_weeks": 6,
      "owner_review_required": true
    },
    "SKU-SUCCESS-DEBT": {
      "name": "Debt success fee",
      "category": "Success Fee",
      "setup": null,
      "monthly": null,
      "success_fee_pct": 1.5,
      "timeline_weeks": null,
      "owner_review_required": false
    },
    "SKU-SUCCESS-EQUITY": {
      "name": "Equity success fee",
      "category": "Success Fee",
      "setup": null,
      "monthly": null,
      "success_fee_pct": 3.0,
      "timeline_weeks": null,
      "owner_review_required": false
    }
  },
  "rules": [
    {
      "id": "legacy-block",
      "priority": 1,
      "when": {
        "legacy_guard": "BLOCK"
      },
      "then": {
        "action": "block",
        "reason": "Legacy / transitioning clients use Section A pricing only"
      }
    },
    {
      "id": "exit-path",
      "priority": 10,
      "when": {
        "any_answer_in": {
          "Q1.1": [
            "exit",
            "sale",
            "liquidity"
          ]
        }
      },
      "then": {
        "primary_sku": "SKU-EXIT",
        "secondary_skus": [
          "SKU-MODEL"
        ],
        "confidence_delta": 0.05
      }
    },
    {
      "id": "acquisition-path",
      "priority": 11,
      "when": {
        "any_answer_in": {
          "Q1.1": [
            "acquire",
            "acquisition",
            "buy"
          ]
        }
      },
      "then": {
        "primary_sku": "SKU-ACQ",
        "secondary_skus": [
          "SKU-MODEL"
        ],
        "confidence_delta": 0.05
      }
    },
    {
      "id": "fcfo-path",
      "priority": 12,
      "when": {
        "any_answer_in": {
          "Q1.1": [
            "ops",
            "finance",
            "cfo",
            "control"
          ]
        }
      },
      "then": {
        "primary_sku": "SKU-FCFO",
        "secondary_skus": [
          "SKU-MODEL"
        ],
        "confidence_delta": 0.04
      }
    },
    {
      "id": "enterprise-complexity",
      "priority": 20,
      "when": {
        "all": [
          {
            "revenue_band_in": [
              "1m_3m",
              "3m_10m",
              "10m_plus"
            ]
          },
          {
            "min_fit_score": 70
          }
        ]
      },
      "then": {
        "primary_sku": "SKU-CAP-ENT",
        "secondary_skus": [
          "SKU-SUCCESS-EQUITY"
        ],
        "confidence_delta": 0.08
      }
    },
    {
      "id": "growth-complexity",
      "priority": 21,
      "when": {
        "all": [
          {
            "revenue_band_in": [
              "250_1m",
              "1m_3m"
            ]
          },
          {
            "min_fit_score": 55
          }
        ]
      },
      "then": {
        "primary_sku": "SKU-CAP-GROWTH",
        "secondary_skus": [
          "SKU-SUCCESS-DEBT"
        ],
        "confidence_delta": 0.06
      }
    },
    {
      "id": "core-default-capital",
      "priority": 30,
      "when": {
        "capital_intent": true
      },
      "then": {
        "primary_sku": "SKU-CAP-CORE",
        "secondary_skus": [
          "SKU-FRA"
        ],
        "confidence_delta": 0.04
      }
    },
    {
      "id": "fallback-fra",
      "priority": 100,
      "when": {
        "always": true
      },
      "then": {
        "primary_sku": "SKU-FRA",
        "secondary_skus": [],
        "confidence_delta": 0
      }
    }
  ],
  "confidence": {
    "base": 0.55,
    "max": 0.92,
    "incomplete_penalty": 0.15,
    "owner_review_penalty": 0.1
  },
  "notices": [
    "Estimates are subject to verification of client information.",
    "Final engagement price requires owner approval.",
    "No guarantee of valuation, financing, approval, funding, tax, legal, or performance."
  ]
};
