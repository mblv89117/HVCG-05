#!/usr/bin/env python3
"""Dev SharePoint adapter tests: fixture-only, fail-closed, idempotent replay."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.compatibility import envelope  # noqa: E402
from revenue_os.gates import (  # noqa: E402
    AUTO_PROVISION_ACCESS,
    LIVE_DISPATCH,
    LIVE_GRAPH_WRITES,
    PRODUCTION_WRITES,
)
from revenue_os.sharepoint_adapters import (  # noqa: E402
    LIST_ENGAGEMENTS,
    LIST_PROPOSALS,
    frozen_column_names,
    list_candidates,
    persist_engagement_candidate,
    persist_proposal_candidate,
)
from revenue_os.store import IdempotentStore  # noqa: E402

ACME_PROPOSAL = {
    "contractVersion": "proposal-context.v1",
    "proposalId": "prop-revos-001",
    "opportunityId": "opp-revos-001",
    "clientCode": "ACME01",
    "offerSku": "OFF-CAP-PKG",
    "status": "draft",
    "autoSend": False,
}


def _engagement_event(
    *,
    opportunity_id: str = "opp-revos-001",
    client_code: str = "ACME01",
    engagement_id: str = "eng-revos-001",
) -> dict:
    key = f"engagement|{opportunity_id}"
    return {
        "contractVersion": "engagement-created.v1",
        "engagementId": engagement_id,
        "clientCode": client_code,
        "opportunityId": opportunity_id,
        "sku": "SKU-CAP-CORE",
        "startsOn": "2026-08-20",
        "envelope": envelope(
            key=key,
            source="atlas",
            dest="atlas",
            entity="engagement",
            operation="create",
            version="engagement-created.v1",
            correlation="sp-adapter-1",
            event_id=f"evt-{engagement_id}",
            entity_id=engagement_id,
        ),
    }


class SharePointAdapterTests(unittest.TestCase):
    def test_proposal_fixture_replay_is_idempotent(self) -> None:
        store = IdempotentStore()
        first = persist_proposal_candidate(ACME_PROPOSAL, store=store)
        second = persist_proposal_candidate(
            {**ACME_PROPOSAL, "status": "accepted"},
            store=store,
        )
        self.assertTrue(first["ok"])
        self.assertTrue(first["created"])
        self.assertTrue(second["replayed"])
        self.assertFalse(second["created"])
        self.assertEqual(second["candidate"]["fields"]["ProposalStatus"], "Draft")
        self.assertEqual(len(list_candidates(store, LIST_PROPOSALS)), 1)
        self.assertFalse(first["liveGraphWrite"])
        self.assertEqual(first["mode"], "fixture")
        self.assertTrue(set(first["candidate"]["fields"]).issubset(frozen_column_names(LIST_PROPOSALS)))
        self.assertNotIn("ClientCode", first["candidate"]["fields"])

    def test_engagement_fixture_replay_uses_sot_key(self) -> None:
        store = IdempotentStore()
        first = persist_engagement_candidate(_engagement_event(), store=store)
        second = persist_engagement_candidate(
            _engagement_event(engagement_id="eng-dup"),
            store=store,
        )
        self.assertTrue(first["ok"])
        self.assertTrue(second["replayed"])
        self.assertEqual(second["idempotencyKey"], "engagement|opp-revos-001")
        self.assertEqual(second["candidate"]["fields"]["Title"], "eng-revos-001")
        self.assertEqual(second["candidate"]["fields"]["ClientCode"], "ACME01")
        self.assertEqual(second["candidate"]["fields"]["EngagementType"], "Capital Advisory")
        self.assertEqual(len(list_candidates(store, LIST_ENGAGEMENTS)), 1)
        self.assertTrue(set(first["candidate"]["fields"]).issubset(frozen_column_names(LIST_ENGAGEMENTS)))

    def test_unmatched_opportunity_fail_closed(self) -> None:
        store = IdempotentStore()
        proposal = persist_proposal_candidate(
            {
                **ACME_PROPOSAL,
                "proposalId": "prop-accg-x",
                "opportunityId": "opp-accg-expansion-001",
                "clientCode": "ACME01",
            },
            store=store,
        )
        engagement = persist_engagement_candidate(
            _engagement_event(opportunity_id="opp-accg-expansion-001", client_code="ACME01"),
            store=store,
        )
        self.assertFalse(proposal["ok"])
        self.assertFalse(engagement["ok"])
        self.assertIsNone(proposal["candidate"])
        self.assertIsNone(engagement["candidate"])
        self.assertRegex(proposal["errors"][0], "Fail closed")
        self.assertEqual(list_candidates(store, LIST_PROPOSALS), [])
        self.assertEqual(list_candidates(store, LIST_ENGAGEMENTS), [])
        dumped = str(proposal) + str(engagement)
        self.assertNotIn('"floorPrice": 10000', dumped)
        self.assertNotIn('"listPrice": 35000', dumped)

    def test_accg01_mismatch_fail_closed(self) -> None:
        store = IdempotentStore()
        proposal = persist_proposal_candidate(
            {**ACME_PROPOSAL, "clientCode": "ACCG01"},
            store=store,
        )
        engagement = persist_engagement_candidate(
            _engagement_event(client_code="ACCG01"),
            store=store,
        )
        self.assertFalse(proposal["ok"])
        self.assertFalse(engagement["ok"])
        self.assertTrue(any("ACCG01" in err for err in proposal["errors"]))
        self.assertTrue(any("ACCG01" in err for err in engagement["errors"]))
        self.assertEqual(list_candidates(store, LIST_PROPOSALS), [])
        self.assertEqual(list_candidates(store, LIST_ENGAGEMENTS), [])
        self.assertNotIn("ACCG01", str(store.list_prefix("sp-candidate|")))

    def test_live_graph_default_off(self) -> None:
        store = IdempotentStore()
        refused = persist_proposal_candidate(ACME_PROPOSAL, store=store, live_graph=True)
        self.assertFalse(refused["ok"])
        self.assertRegex(refused["errors"][0], "default-off")
        self.assertEqual(list_candidates(store, LIST_PROPOSALS), [])
        self.assertFalse(LIVE_GRAPH_WRITES)
        self.assertFalse(PRODUCTION_WRITES)
        self.assertFalse(LIVE_DISPATCH)
        self.assertFalse(AUTO_PROVISION_ACCESS)


if __name__ == "__main__":
    unittest.main()
