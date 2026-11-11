import secrets
import uuid
from typing import Any, List

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from src.core.authorization import require_any_permission, require_permission
from src.core.dependencies import get_db
from src.models import User, WebhookDelivery, WebhookEndpoint

logger = structlog.get_logger()
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# ─── Schemas ──────────────────────────────────────────────────────────────────


class WebhookEndpointCreate(BaseModel):
    url: HttpUrl
    description: str = Field(None, max_length=255)
    subscribed_events: List[str] = Field(default=[])


class WebhookEndpointResponse(BaseModel):
    id: uuid.UUID
    url: str
    description: str | None
    subscribed_events: List[str]
    is_active: bool
    created_at: Any
    # Note: hmac_secret is strictly excluded from list and detail responses


class WebhookEndpointCreateResponse(WebhookEndpointResponse):
    hmac_secret: str  # Plaintext secret shown ONLY ONCE on creation or secret rotation


class WebhookDeliveryResponse(BaseModel):
    id: uuid.UUID
    event_id: str
    event_type: str
    delivery_status: str
    status_code: int | None
    retry_count: int
    next_retry_at: Any | None
    created_at: Any


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=List[WebhookEndpointResponse], summary="List webhook endpoints")
def list_webhook_endpoints(
    actor: User = require_any_permission("manage_settings", "manage_api_keys"),
    db: Session = Depends(get_db),
):
    endpoints = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.organization_id == actor.organization_id,
            WebhookEndpoint.is_active,
        )
        .order_by(WebhookEndpoint.created_at.desc())
        .all()
    )

    return endpoints


@router.get(
    "/{endpoint_id}", response_model=WebhookEndpointResponse, summary="Get webhook endpoint details"
)
def get_webhook_endpoint(
    endpoint_id: uuid.UUID,
    actor: User = require_any_permission("manage_settings", "manage_api_keys"),
    db: Session = Depends(get_db),
):
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == actor.organization_id,
            WebhookEndpoint.is_active,
        )
        .first()
    )
    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook Endpoint not found")

    return endpoint


@router.post(
    "",
    response_model=WebhookEndpointCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a webhook endpoint (secret returned once)",
)
def create_webhook_endpoint(
    data: WebhookEndpointCreate,
    actor: User = require_permission("manage_settings"),
    db: Session = Depends(get_db),
):
    secret = "whsec_" + secrets.token_hex(24)

    endpoint = WebhookEndpoint(
        organization_id=actor.organization_id,
        url=str(data.url),
        description=data.description,
        subscribed_events=data.subscribed_events,
        hmac_secret=secret,
    )

    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)

    logger.info(
        "Webhook endpoint created",
        endpoint_id=str(endpoint.id),
        url=str(data.url),
        actor_id=str(actor.id),
    )

    return endpoint


@router.post(
    "/{endpoint_id}/rotate-secret",
    response_model=WebhookEndpointCreateResponse,
    summary="Rotate webhook endpoint HMAC secret (new secret returned once)",
)
def rotate_webhook_secret(
    endpoint_id: uuid.UUID,
    actor: User = require_permission("manage_settings"),
    db: Session = Depends(get_db),
):
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == actor.organization_id,
            WebhookEndpoint.is_active,
        )
        .first()
    )

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook Endpoint not found")

    new_secret = "whsec_" + secrets.token_hex(24)
    endpoint.hmac_secret = new_secret  # type: ignore[assignment]
    db.commit()
    db.refresh(endpoint)

    logger.info(
        "Webhook endpoint secret rotated",
        endpoint_id=str(endpoint.id),
        actor_id=str(actor.id),
    )

    return endpoint


@router.delete(
    "/{endpoint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete (deactivate) a webhook endpoint",
)
def delete_webhook_endpoint(
    endpoint_id: uuid.UUID,
    actor: User = require_permission("manage_settings"),
    db: Session = Depends(get_db),
):
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == actor.organization_id,
            WebhookEndpoint.is_active,
        )
        .first()
    )

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook Endpoint not found")

    endpoint.is_active = False  # type: ignore[assignment]
    db.commit()

    logger.info(
        "Webhook endpoint deactivated",
        endpoint_id=str(endpoint_id),
        actor_id=str(actor.id),
    )
    return None


@router.get(
    "/{endpoint_id}/deliveries",
    response_model=List[WebhookDeliveryResponse],
    summary="List webhook deliveries for an endpoint",
)
def list_webhook_deliveries(
    endpoint_id: uuid.UUID,
    limit: int = 50,
    actor: User = require_any_permission("manage_settings", "manage_api_keys"),
    db: Session = Depends(get_db),
):
    # Verify ownership
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == actor.organization_id,
            WebhookEndpoint.is_active,
        )
        .first()
    )

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook Endpoint not found")

    deliveries = (
        db.query(WebhookDelivery)
        .filter(WebhookDelivery.endpoint_id == endpoint_id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(limit)
        .all()
    )

    return deliveries
