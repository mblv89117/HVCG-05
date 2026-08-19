#!/usr/bin/env python3
"""Minimal Node-free check: validate schema-shaped fixture from Sprint 2 sample."""
import json
import sys
from pathlib import Path

REQUIRED = {
    "sessionId",
    "submittedAt",
    "source",
    "leadSourceDetail",
    "contact",
    "company",
    "consent",
    "eva",
}
CONTACT = {"firstName", "lastName", "name", "email", "phone", "role", "isDecisionMaker"}
COMPANY = {
    "legalName",
    "revenueBand",
    "revenueBandLabel",
    "books",
    "booksLabel",
    "capital",
    "capitalLabel",
    "timeline",
    "timelineLabel",
    "challenge",
    "valueDriverThemes",
}
EVA = {
    "variant",
    "composite_score_proxy",
    "band",
    "confidence_index",
    "flags",
    "recommended_sku",
    "package_label",
    "proposed_price",
    "rate_card_version",
    "owner_approval_required",
    "legacy_guard",
}

# Sample schema-only payload mirroring UI output
sample = {
    "sessionId": "sprint2-schema-check",
    "submittedAt": "2026-07-16T20:00:00Z",
    "source": "Website-EVA",
    "leadSourceDetail": "eva-experience-v2|dev-staging",
    "contact": {
        "firstName": "Alex",
        "lastName": "Rivera",
        "name": "Alex Rivera",
        "email": "alex@example.com",
        "phone": "+1-555-0100",
        "role": "Owner / CEO",
        "isDecisionMaker": True,
    },
    "company": {
        "legalName": "Northridge Manufacturing LLC",
        "revenueBand": "3",
        "revenueBandLabel": "$500k–$1.5M",
        "books": "3",
        "booksLabel": "Monthly close",
        "capital": "debt",
        "capitalLabel": "Debt",
        "timeline": "3",
        "timelineLabel": "30–90 days",
        "challenge": "Need working-capital facility before peak season.",
        "valueDriverThemes": ["Working capital / cash conversion"],
    },
    "consent": {
        "hvcgProspect": True,
        "notLegacyEngagementChange": True,
        "disclaimerAccepted": True,
    },
    "eva": {
        "variant": "EVA-FREE",
        "composite_score_proxy": 72,
        "band": "B",
        "confidence_index": 0.85,
        "flags": [],
        "recommended_sku": "SKU-CAP-CORE",
        "package_label": "Capital Advisory — Core (estimate)",
        "proposed_price": {"setup": 5000, "monthly": 3500},
        "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
        "owner_approval_required": True,
        "legacy_guard": "PASS",
    },
}

assert set(sample) == REQUIRED, set(sample) ^ REQUIRED
assert CONTACT <= set(sample["contact"])
assert COMPANY <= set(sample["company"])
assert EVA <= set(sample["eva"])
assert sample["source"] == "Website-EVA"
assert sample["eva"]["owner_approval_required"] is True

out = Path(__file__).resolve().parent / "fixtures" / "eva_experience_schema_sample.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(sample, indent=2) + "\n")
print("SCHEMA_OK", out)
sys.exit(0)
