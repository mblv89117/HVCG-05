"""UAT-FIND-001 — Elite Clients → New Prospect discoverability (navigation contract).

Asserts the Owner-facing click path exists in source (no hidden-URL-only workflow).
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

BA_ROOT = Path(__file__).resolve().parents[3]
ELITE = BA_ROOT / "apps" / "atlas-elite-os" / "src"


class IntakeNavDiscoverabilityTests(unittest.TestCase):
    def test_clients_page_exposes_new_prospect_primary(self) -> None:
        page = (ELITE / "pages" / "LiveClientsPage.tsx").read_text(encoding="utf-8")
        self.assertIn('to="/clients/intake"', page)
        self.assertIn("New Prospect", page)
        self.assertIn('appearance="primary"', page)
        # Empty-state CTA must also expose New Prospect (Owner empty Client 360 case)
        self.assertGreaterEqual(page.count("New Prospect"), 2)

    def test_intake_route_precedes_dynamic_client_route(self) -> None:
        app = (ELITE / "App.tsx").read_text(encoding="utf-8")
        intake_idx = app.find('path="clients/intake"')
        dynamic_idx = app.find('path="clients/:workspaceId"')
        self.assertGreater(intake_idx, 0)
        self.assertGreater(dynamic_idx, 0)
        self.assertLess(intake_idx, dynamic_idx, "clients/intake must be registered before clients/:workspaceId")
        self.assertTrue(
            ("workspaceId === 'intake'" in app) or ('workspaceId === "intake"' in app),
            "ClientDetailRoute must refuse to treat 'intake' as a client id",
        )

    def test_intake_workbench_exists_and_returns_to_clients(self) -> None:
        wb = (ELITE / "pages" / "ClientIntakeWorkbench.tsx").read_text(encoding="utf-8")
        self.assertIn("Create prospect", wb)
        self.assertIn('to="/clients"', wb)
        self.assertIn("Back to Clients", wb)

    def test_canonical_elite_satisfies_nav_contract(self) -> None:
        """Intake workbench must live in canonical Elite, not a sibling worktree."""
        self.assertTrue(ELITE.exists())
        self.assertTrue((ELITE / "pages" / "ClientIntakeWorkbench.tsx").exists())


if __name__ == "__main__":
    unittest.main()
