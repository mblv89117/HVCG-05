"""Synthetic journeys A/B/C — machine-verifiable, no production side effects."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "integrations"))

from harness.journeys import replay_write, run_journey_a, run_journey_b, run_journey_c  # noqa: E402
from harness.synthetic_bus import SyntheticBus  # noqa: E402


class SyntheticJourneyTests(unittest.TestCase):
    def test_journey_a_end_to_end(self):
        result = run_journey_a()
        self.assertEqual(result["journey"], "A")
        self.assertEqual(result["counts"]["lead"], 1)
        self.assertEqual(result["counts"]["client"], 1)
        self.assertEqual(result["counts"]["opportunity"], 1)
        self.assertEqual(result["counts"]["engagement"], 1)
        self.assertEqual(result["counts"]["booking"], 1)
        self.assertEqual(result["counts"]["icp"], 1)
        self.assertEqual(result["counts"]["outbound"], 1)
        self.assertEqual(result["counts"]["gcc_handoff"], 1)
        self.assertEqual(result["results"]["lead"], "accepted")
        self.assertEqual(result["clientCode"], "ACME01")
        booking = result["bus"].store["booking|mtg-book-syn-1"]["payload"]
        self.assertEqual(booking["bookingId"], "mtg-book-syn-1")
        self.assertEqual(booking["status"], "confirmed")
        self.assertNotIn("liveDispatch", booking)
        icp = result["bus"].store["icp|icp.hvcg.v1"]["payload"]
        self.assertEqual(icp["version"], "icp.hvcg.v1")
        self.assertTrue(icp["exclusions"]["sensitivePersonalTraits"])
        outbound = result["bus"].store["outbound|msg-syn-1"]["payload"]
        self.assertEqual(outbound["mode"], "dry_run_record_only")
        self.assertFalse(outbound["dispatched"])

    def test_journey_a_replay_does_not_duplicate(self):
        result = run_journey_a()
        bus: SyntheticBus = result["bus"]
        again = replay_write(
            bus,
            "360|360-lead-001",
            "lead",
            {"id": "atlas-lead-100", "dup": True},
        )
        self.assertEqual(again.outcome, "duplicate")
        self.assertFalse(again.created)
        gcc_again = replay_write(bus, "gcc-activate|ACME01|activate", "gcc_handoff", {"id": "should-not-create"})
        self.assertEqual(gcc_again.outcome, "duplicate")
        booking_again = replay_write(bus, "booking|mtg-book-syn-1", "booking", {"id": "should-not-create"})
        self.assertEqual(booking_again.outcome, "duplicate")
        outbound_again = replay_write(bus, "outbound|msg-syn-1", "outbound", {"id": "should-not-create"})
        self.assertEqual(outbound_again.outcome, "duplicate")
        self.assertEqual(bus.count("lead"), 1)
        self.assertEqual(bus.count("gcc_handoff"), 1)
        self.assertEqual(bus.count("opportunity"), 1)
        self.assertEqual(bus.count("engagement"), 1)
        self.assertEqual(bus.count("booking"), 1)
        self.assertEqual(bus.count("icp"), 1)
        self.assertEqual(bus.count("outbound"), 1)

    def test_journey_b_copilot_to_engagement(self):
        result = run_journey_b()
        self.assertEqual(result["counts"]["lead"], 1)
        self.assertEqual(result["counts"]["engagement"], 1)
        replay = replay_write(result["bus"], "copilot|mri-501", "lead", {"id": "atlas-lead-501"})
        self.assertEqual(replay.outcome, "duplicate")
        self.assertEqual(result["bus"].count("lead"), 1)

    def test_journey_c_gcc_signal_to_learning(self):
        result = run_journey_c()
        self.assertEqual(result["counts"]["gcc_signal"], 1)
        self.assertEqual(result["counts"]["learning"], 1)
        self.assertEqual(result["counts"]["opportunity"], 1)
        self.assertEqual(result["counts"]["experiment"], 1)
        self.assertEqual(result["counts"]["optimization"], 1)
        # Ensure GCC org id was not used as ClientCode in store payload
        sig = result["bus"].store["gcc-signal|sig-900"]["payload"]
        self.assertEqual(sig["clientCode"], "ACME01")
        self.assertNotEqual(sig["gccOrganizationId"], sig["clientCode"])
        opt = result["bus"].store["optimize|dec-exp-cmp-gtm-001-v2"]["payload"]
        self.assertEqual(opt["decision"], "hold_for_owner")
        self.assertFalse(opt["mutatesPaidAds"])
        replay = replay_write(
            result["bus"],
            "optimize|dec-exp-cmp-gtm-001-v2",
            "optimization",
            {"id": "should-not-create"},
        )
        self.assertEqual(replay.outcome, "duplicate")
        self.assertEqual(result["bus"].count("optimization"), 1)


if __name__ == "__main__":
    unittest.main()
