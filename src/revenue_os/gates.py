"""Hard gates for Revenue OS. Synthetic journeys must keep these false."""

from __future__ import annotations

from typing import Final

LIVE_DISPATCH: Final[bool] = False
AUTO_SEND_PROPOSAL: Final[bool] = False
AUTO_SEND_DOCUMENT: Final[bool] = False
AUTO_PROVISION_ACCESS: Final[bool] = False
MUTATES_PAID_ADS: Final[bool] = False
AUTO_QUALIFY_LEAD: Final[bool] = False
LEGACY_AUTO_REPRICE: Final[bool] = False
AUTONOMOUS_REFERRAL_PAYOUT: Final[bool] = False
PRODUCTION_WRITES: Final[bool] = False
LIVE_GRAPH_WRITES: Final[bool] = False
COPILOT_HAS_COMMERCIAL_AUTHORITY: Final[bool] = False
WON_ACTIVATES_CLIENT: Final[bool] = False
WON_CREATES_GCC_TENANT: Final[bool] = False

GATES: dict[str, bool] = {
    "liveDispatch": LIVE_DISPATCH,
    "autoSendProposal": AUTO_SEND_PROPOSAL,
    "autoSendDocument": AUTO_SEND_DOCUMENT,
    "autoProvisionAccess": AUTO_PROVISION_ACCESS,
    "mutatesPaidAds": MUTATES_PAID_ADS,
    "autoQualifyLead": AUTO_QUALIFY_LEAD,
    "legacyAutoReprice": LEGACY_AUTO_REPRICE,
    "autonomousReferralPayout": AUTONOMOUS_REFERRAL_PAYOUT,
    "productionWrites": PRODUCTION_WRITES,
    "liveGraphWrites": LIVE_GRAPH_WRITES,
    "copilotHasCommercialAuthority": COPILOT_HAS_COMMERCIAL_AUTHORITY,
    "wonActivatesClient": WON_ACTIVATES_CLIENT,
    "wonCreatesGccTenant": WON_CREATES_GCC_TENANT,
}


def assert_synthetic_safe() -> dict[str, bool]:
    """Return gate snapshot. Raises if any production-side-effect gate is on."""
    unsafe = [name for name, value in GATES.items() if value]
    if unsafe:
        raise RuntimeError(f"Revenue OS production-side-effect gates enabled: {unsafe}")
    return dict(GATES)
