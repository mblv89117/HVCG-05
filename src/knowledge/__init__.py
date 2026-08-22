"""Client knowledge operationalization — metadata into existing Atlas lists."""

from .roster import (
    ACCG_WRITE_CODES,
    CLASSIFICATIONS,
    QUEUE_STATES,
    SYNTHETIC_QA_CODES,
    STAFF_NOT_CLIENT_CODES,
    build_canonical_roster,
    classify_entity,
    may_write_client,
)

__all__ = [
    "ACCG_WRITE_CODES",
    "CLASSIFICATIONS",
    "QUEUE_STATES",
    "SYNTHETIC_QA_CODES",
    "STAFF_NOT_CLIENT_CODES",
    "build_canonical_roster",
    "classify_entity",
    "may_write_client",
]
