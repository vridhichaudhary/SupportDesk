"""
Presence Engine
===============
Redis-backed real-time agent status tracker for SupportDesk AI.

Key operations:
- heartbeat(user_id, org_id, status, device_info)   — called by frontend every 30s
- get_status(user_id)                                — returns current AgentStatus + metadata
- set_status(user_id, org_id, status)                — explicit status change (away, break…)
- clear(user_id)                                     — logout / force-offline
- get_org_presence(org_id, user_ids)                 — bulk fetch for team rosters

All keys are namespaced per tenant for isolation.
TTL: 90 seconds (3× heartbeat interval). Agent is OFFLINE if key expires.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import redis as redis_lib
import structlog

from src.models import AgentStatus

logger = structlog.get_logger()

_HEARTBEAT_TTL = 90  # seconds — 3× expected heartbeat interval (30s)
_PREFIX = "presence"


def _key(user_id: uuid.UUID) -> str:
    return f"{_PREFIX}:{user_id}"


def _serialize(
    status: AgentStatus,
    org_id: uuid.UUID,
    device_info: Optional[str] = None,
    expected_return: Optional[datetime] = None,
) -> str:
    return json.dumps(
        {
            "status": status.value,
            "org_id": str(org_id),
            "device_info": device_info,
            "since": datetime.now(timezone.utc).isoformat(),
            "expected_return": expected_return.isoformat() if expected_return else None,
        }
    )


def _deserialize(raw: str) -> Dict:
    try:
        return json.loads(raw)
    except Exception:
        return {}


class PresenceEngine:
    """
    Stateless service — every method accepts a redis_client so it integrates
    cleanly with FastAPI dependency injection without holding a persistent connection.
    """

    def heartbeat(
        self,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        status: AgentStatus = AgentStatus.AVAILABLE,
        device_info: Optional[str] = None,
    ) -> None:
        """
        Called by the frontend every ~30 seconds.
        Refreshes the TTL and status. Creates the key if absent.
        """
        try:
            key = _key(user_id)
            existing_raw = redis_client.get(key)
            if existing_raw:
                existing = _deserialize(existing_raw)
                # Preserve the current status if it's a meaningful absence status
                current = existing.get("status", AgentStatus.AVAILABLE.value)
                if current in {
                    AgentStatus.AWAY.value,
                    AgentStatus.BREAK.value,
                    AgentStatus.MEETING.value,
                    AgentStatus.TRAINING.value,
                }:
                    status = AgentStatus(current)

            payload = _serialize(status, org_id, device_info)
            redis_client.setex(_key(user_id), _HEARTBEAT_TTL, payload)
            logger.debug("Presence heartbeat", user_id=str(user_id), status=status.value)
        except Exception as exc:
            logger.warning("Presence heartbeat failed", user_id=str(user_id), error=str(exc))

    def set_status(
        self,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
        org_id: uuid.UUID,
        status: AgentStatus,
        expected_return: Optional[datetime] = None,
    ) -> None:
        """
        Explicit status change (e.g. agent goes on break, vacation, etc.).
        Resets TTL so the status persists until the next heartbeat or explicit change.
        """
        try:
            ttl = _HEARTBEAT_TTL
            # Long-lived statuses should survive without a heartbeat
            if status in {
                AgentStatus.VACATION,
                AgentStatus.SICK_LEAVE,
                AgentStatus.TRAINING,
            }:
                ttl = 86400 * 7  # 7 days

            payload = _serialize(status, org_id, expected_return=expected_return)
            redis_client.setex(_key(user_id), ttl, payload)
            logger.info(
                "Presence status set",
                user_id=str(user_id),
                status=status.value,
            )
        except Exception as exc:
            logger.warning("Presence set_status failed", user_id=str(user_id), error=str(exc))

    def get_status(
        self,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
    ) -> Dict:
        """
        Returns the agent's presence data.
        Returns OFFLINE if no key found (TTL expired or never set).
        """
        try:
            raw = redis_client.get(_key(user_id))
            if raw:
                data = _deserialize(raw)
                data["is_online"] = True
                return data
        except Exception as exc:
            logger.warning("Presence get_status failed", user_id=str(user_id), error=str(exc))
        return {
            "status": AgentStatus.OFFLINE.value,
            "is_online": False,
            "since": None,
            "device_info": None,
            "expected_return": None,
        }

    def get_org_presence(
        self,
        redis_client: redis_lib.Redis,
        user_ids: List[uuid.UUID],
    ) -> Dict[str, Dict]:
        """
        Bulk fetch presence data for a list of agent user IDs.
        Returns a mapping of str(user_id) → presence dict.
        """
        if not user_ids:
            return {}

        keys = [_key(uid) for uid in user_ids]
        try:
            values = redis_client.mget(keys)
        except Exception as exc:
            logger.warning("Presence bulk fetch failed", error=str(exc))
            values = [None] * len(user_ids)

        result: Dict[str, Dict] = {}
        for uid, raw in zip(user_ids, values, strict=False):
            if raw:
                data = _deserialize(raw)
                data["is_online"] = True
            else:
                data = {
                    "status": AgentStatus.OFFLINE.value,
                    "is_online": False,
                    "since": None,
                    "device_info": None,
                    "expected_return": None,
                }
            result[str(uid)] = data

        return result

    def clear(
        self,
        redis_client: redis_lib.Redis,
        user_id: uuid.UUID,
    ) -> None:
        """Force agent offline — called on logout or account deactivation."""
        try:
            redis_client.delete(_key(user_id))
            logger.info("Presence cleared (offline)", user_id=str(user_id))
        except Exception as exc:
            logger.warning("Presence clear failed", user_id=str(user_id), error=str(exc))


# Singleton — import everywhere that needs presence resolution
presence_engine = PresenceEngine()
