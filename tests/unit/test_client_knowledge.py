#!/usr/bin/env python3
"""Client knowledge classification and write-guard tests."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from knowledge.ledger import LEDGER_COLUMNS, rows_to_markdown
from knowledge.roster import (
    build_canonical_roster,
    classify_entity,
    may_write_client,
)


def test_accg_write_guard() -> None:
    assert may_write_client("ACCG01") is False
    assert may_write_client("ACCG01", approved_accg_window=True) is True
    assert may_write_client("SYN01") is False
    assert may_write_client("SYN01", approved_accg_window=True) is False
    assert may_write_client(None) is False
    assert may_write_client("HFD01") is True


def test_known_entity_boundaries() -> None:
    hart = classify_entity("Hart Family Dental")
    assert hart["client_code"] == "HFD01"
    assert hart["classification"] == "CONFIRMED"

    kava = classify_entity("That's Kava LLC")
    assert kava["client_code"] == "KAVA01"
    assert kava["classification"] == "CONFIRMED"

    loanspark = classify_entity("LoanSpark")
    assert loanspark["classification"] == "NOT_A_CLIENT"
    assert loanspark["client_code"] is None

    gnieski = classify_entity("Ryan Gnieski / Best Day Of My Life")
    assert gnieski["classification"] == "STALE_OR_UNCERTAIN"
    assert gnieski["client_code"] is None

    syn = classify_entity("SYNTHETIC QA — Atlas Capital Operations")
    assert syn["classification"] == "SYNTHETIC_QA"
    assert syn["client_code"] == "SYN01"

    falk = classify_entity("Irwin Falk")
    assert falk["classification"] == "PROPOSED"
    assert falk["client_code"] is None


def test_roster_does_not_invent_financials() -> None:
    rows = build_canonical_roster(live_hub_codes=("SYN01",))
    codes = {r.client_code for r in rows}
    assert "HFD01" in codes
    assert "ACCG01" in codes
    assert "SYN01" in codes
    syn = next(r for r in rows if r.client_code == "SYN01")
    assert syn.classified == "SYNTHETIC_QA"
    assert syn.write_allowed is False
    accg = next(r for r in rows if r.client_code == "ACCG01")
    assert accg.write_allowed is False
    text = " ".join(r.exceptions + r.blocker for r in rows).lower()
    assert "invent" not in text or "do not invent" in text
    for r in rows:
        assert r.classified
        assert r.operationalized in {"YES", "NO"}


def test_ledger_columns() -> None:
    md = rows_to_markdown(build_canonical_roster())
    for col in LEDGER_COLUMNS:
        assert col in md


if __name__ == "__main__":
    test_accg_write_guard()
    test_known_entity_boundaries()
    test_roster_does_not_invent_financials()
    test_ledger_columns()
    print("test_client_knowledge: ok")
