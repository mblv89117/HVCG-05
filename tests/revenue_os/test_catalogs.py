#!/usr/bin/env python3
"""Service Catalog and Offer Catalog tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.catalogs import (  # noqa: E402
    catalog_integrity,
    get_offer,
    get_service_line,
    list_offers,
    list_service_lines,
    recommend_offer,
)


class CatalogTests(unittest.TestCase):
    def test_service_catalog_has_seven_lines(self) -> None:
        lines = list_service_lines(active_only=False)
        self.assertEqual(len(lines), 7)
        self.assertIsNotNone(get_service_line("SL-CAPITAL"))
        self.assertFalse(get_service_line("SL-OWNER")["public"])

    def test_offer_catalog_has_thirteen_offers(self) -> None:
        offers = list_offers(active_only=False, include_restricted=True)
        self.assertEqual(len(offers), 13)
        self.assertIsNotNone(get_offer("OFF-CAP-PKG"))
        public = {o["offerCode"] for o in list_offers(public_only=True)}
        self.assertNotIn("OFF-OWNER-SUPPORT", public)

    def test_catalog_integrity(self) -> None:
        report = catalog_integrity()
        self.assertTrue(report["ok"], report["errors"])
        self.assertIn("No offer without a price", report["rule"])

    def test_decision_engine_ready_for_financing(self) -> None:
        rule = recommend_offer("Ready for financing")
        self.assertIsNotNone(rule)
        self.assertEqual(rule["offerCode"], "OFF-CAP-PKG")


if __name__ == "__main__":
    unittest.main()
