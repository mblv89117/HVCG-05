"""Atlas Revenue & Engagement OS — commercial control plane (Dev/synthetic).

Consumes Integration SoT @ 773b510. Does not write Atlas production, thaw
frozen Hub/Elite, or auto-provision GCC entitlements.
"""

from .gates import GATES, LIVE_DISPATCH

__all__ = ["GATES", "LIVE_DISPATCH", "__version__"]

__version__ = "0.2.0"
