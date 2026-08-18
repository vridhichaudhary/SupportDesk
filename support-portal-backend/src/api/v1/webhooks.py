import secrets
import uuid
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.models import User, UserRole, WebhookDelivery, WebhookEndpoint

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
    hmac_secret: str  # Shown for configuration


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


@router.get("", response_model=List[WebhookEndpointResponse])
def list_webhook_endpoints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    endpoints = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.organization_id == current_user.organization_id,
            WebhookEndpoint.is_active,
        )
        .order_by(WebhookEndpoint.created_at.desc())
        .all()
    )

    return endpoints


@router.post("", response_model=WebhookEndpointResponse, status_code=status.HTTP_201_CREATED)
def create_webhook_endpoint(
    data: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    secret = "whsec_" + secrets.token_hex(24)

    endpoint = WebhookEndpoint(
        organization_id=current_user.organization_id,
        url=str(data.url),
        description=data.description,
        subscribed_events=data.subscribed_events,
        hmac_secret=secret,
    )

    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)

    return endpoint


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook_endpoint(
    endpoint_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook Endpoint not found")

    endpoint.is_active = False
    db.commit()
    return None


@router.get("/{endpoint_id}/deliveries", response_model=List[WebhookDeliveryResponse])
def list_webhook_deliveries(
    endpoint_id: uuid.UUID,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify ownership
    endpoint = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == current_user.organization_id,
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
