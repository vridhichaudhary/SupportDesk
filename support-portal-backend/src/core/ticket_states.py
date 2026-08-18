from typing import Set

from src.models import TicketStatus

# The definitive list of valid transitions between ticket states.
# Keys represent the current state, and the set of values are the allowed next states.
VALID_TRANSITIONS: dict[TicketStatus, Set[TicketStatus]] = {
    TicketStatus.NEW: {
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.CANCELLED,
    },
    TicketStatus.OPEN: {
        TicketStatus.ASSIGNED,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.PENDING_INTERNAL,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
    },
    TicketStatus.ASSIGNED: {
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.PENDING_INTERNAL,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
        TicketStatus.OPEN,
    },
    TicketStatus.PENDING_CUSTOMER: {
        TicketStatus.OPEN,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.CANCELLED,
    },
    TicketStatus.PENDING_INTERNAL: {
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
    },
    TicketStatus.RESOLVED: {
        TicketStatus.CLOSED,
        TicketStatus.REOPENED,
    },
    TicketStatus.CLOSED: {
        TicketStatus.REOPENED,
    },
    TicketStatus.REOPENED: {
        TicketStatus.OPEN,
        TicketStatus.ASSIGNED,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
    },
    TicketStatus.CANCELLED: set(),  # Terminal state — no transitions out
}


def is_valid_transition(current_status: TicketStatus, new_status: TicketStatus) -> bool:
    """
    Checks if a transition from current_status to new_status is allowed.
    Returns True if current_status is the same as new_status (no transition).
    """
    if current_status == new_status:
        return True

    allowed_next_states = VALID_TRANSITIONS.get(current_status, set())
    return new_status in allowed_next_states
