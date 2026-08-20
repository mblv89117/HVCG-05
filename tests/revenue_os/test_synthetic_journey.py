#!/usr/bin/env python3
"""Synthetic commercial journey — required before BUILD_COMPLETE / SYNTHETIC_CERTIFIED."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.journey import run_synthetic_commercial_journey  # noqa: E402


class SyntheticJourneyTests(unittest.TestCase):
    def test_offer_to_engagement(self) -> None:
        report = run_synthetic_commercial_journey()
        self.assertTrue(report["ok"])
        self.assertFalse(report["liveDispatch"])
        self.assertFalse(report["autoProvisionAccess"])
        self.assertFalse(report["mutatesPaidAds"])
        self.assertTrue(report["proposalSendBlocked"])
        self.assertTrue(report["documentSendBlocked"])
        self.assertTrue(report["msaReplay"])
        self.assertTrue(report["engagementReplay"])
        self.assertTrue(report["gccReplay"])
        self.assertEqual(report["proposalStatus"], "ACCEPTED")
        self.assertEqual(report["successFeeState"], "EARNED")
        self.assertTrue(report["successFeeEarnedNeCollected"])
        self.assertEqual(report["referralState"], "PAYABLE")
        self.assertFalse(report["referralPayoutAllowed"])
        self.assertFalse(report["copilotPromoted"])
        self.assertFalse(report["learningMutatesPaidAds"])
        self.assertFalse(report["gccAutoProvision"])
        self.assertFalse(report["wonActivatesClient"])
        self.assertEqual(report["catalog"]["serviceLines"], 7)
        self.assertEqual(report["catalog"]["offers"], 13)


if __name__ == "__main__":
    unittest.main()
