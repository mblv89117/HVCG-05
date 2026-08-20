#!/usr/bin/env python3
"""MSA/SOW workflow and document schema tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.documents import DocumentWorkflow  # noqa: E402
from revenue_os.schemas import assert_valid  # noqa: E402


class DocumentTests(unittest.TestCase):
    def test_msa_sow_replay_and_wet_ink(self) -> None:
        wf = DocumentWorkflow()
        first = wf.create(
            document_id="msa-1",
            document_type="MSA",
            opportunity_id="opp-1",
            client_code="ACME01",
            proposal_id="prop-1",
            title="MSA",
        )
        replay = wf.create(
            document_id="msa-1",
            document_type="MSA",
            opportunity_id="opp-1",
            client_code="ACME01",
            proposal_id="prop-1",
            title="MSA",
        )
        self.assertTrue(first["created"])
        self.assertTrue(replay["replayed"])
        self.assertFalse(replay["created"])
        wf.transition(first["document"], "INTERNAL_REVIEW", actor="a")
        approved = wf.transition(wf.get("MSA", "opp-1", "msa-1"), "APPROVED_TO_SEND", actor="o")
        self.assertEqual(approved["errors"], [])
        blocked = wf.transition(approved["document"], "SENT", actor="a")
        self.assertTrue(blocked["errors"])
        signed = wf.execute_wet_ink(approved["document"], actor="o", signature_evidence="binder-1")
        self.assertEqual(signed["document"]["status"], "SIGNED")
        activated = wf.activate(signed["document"], actor="o")
        self.assertEqual(activated["document"]["status"], "ACTIVATED")
        assert_valid("commercial-document.v1.json", wf.to_contract(activated["document"]))


if __name__ == "__main__":
    unittest.main()
