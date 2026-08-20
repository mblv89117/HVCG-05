#!/usr/bin/env python3
"""Idempotent replay tests for commercial documents and engagements."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.compatibility import envelope  # noqa: E402
from revenue_os.documents import DocumentWorkflow  # noqa: E402
from revenue_os.engagements import EngagementService  # noqa: E402
from revenue_os.store import IdempotentStore  # noqa: E402


class IdempotencyTests(unittest.TestCase):
    def test_store_return_existing(self) -> None:
        store = IdempotentStore()
        a = store.put("k1", {"n": 1}, collision="return-existing")
        b = store.put("k1", {"n": 2}, collision="return-existing")
        self.assertTrue(a["created"])
        self.assertTrue(b["replayed"])
        self.assertEqual(b["item"]["n"], 1)

    def test_document_and_engagement_keys(self) -> None:
        store = IdempotentStore()
        docs = DocumentWorkflow(store)
        docs.create(
            document_id="sow-1",
            document_type="SOW",
            opportunity_id="opp-77",
            client_code="NORTH01",
            proposal_id="prop-77",
            title="SOW",
        )
        replay = docs.create(
            document_id="sow-1",
            document_type="SOW",
            opportunity_id="opp-77",
            client_code="NORTH01",
            proposal_id="prop-77",
            title="SOW rewritten",
        )
        self.assertTrue(replay["replayed"])
        self.assertEqual(replay["document"]["title"], "SOW")

        env = envelope(
            key="engagement|opp-77",
            source="atlas",
            dest="atlas",
            entity="engagement",
            operation="create",
            version="engagement-created.v1",
            correlation="idemp-1",
            event_id="evt-1",
            entity_id="eng-77",
        )
        eng = EngagementService(store)
        first = eng.create_from_closed_won(
            engagement_id="eng-77",
            opportunity_id="opp-77",
            client_code="NORTH01",
            sku="SKU-CAP-CORE",
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            scope_summary="original",
            setup_fee=10000,
            retainer=None,
            term_months=None,
            success_fee_applicable=True,
            envelope=env,
        )
        second = eng.create_from_closed_won(
            engagement_id="eng-dup",
            opportunity_id="opp-77",
            client_code="NORTH01",
            sku="OTHER",
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            scope_summary="duplicate",
            setup_fee=1,
            retainer=None,
            term_months=None,
            success_fee_applicable=True,
            envelope=env,
        )
        self.assertTrue(first["created"])
        self.assertTrue(second["replayed"])
        self.assertEqual(second["engagement"]["engagementId"], "eng-77")
        self.assertEqual(second["idempotencyKey"], "engagement|opp-77")


if __name__ == "__main__":
    unittest.main()
