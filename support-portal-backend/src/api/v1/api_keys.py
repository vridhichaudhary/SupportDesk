import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.core.security import generate_api_key
from src.models import APIKey, User, UserRole

router = APIRouter(prefix="/api-keys", tags=["api_keys"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scopes: List[str] = Field(default=["*"])


class APIKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    scopes: List[str]
    expires_at: Optional[Any]
    last_used_at: Optional[Any]
    created_at: Any
    is_active: bool
    # Only returned upon creation
    plain_key: Optional[str] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=List[APIKeyResponse], summary="List all API keys")
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    keys = (
        db.query(APIKey)
        .filter(APIKey.organization_id == current_user.organization_id, APIKey.is_active)
        .order_by(APIKey.created_at.desc())
        .all()
    )

    return keys


@router.post(
    "",
    response_model=APIKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an API key",
)
def create_api_key(
    data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    plain_key, hashed_key = generate_api_key()
    prefix = plain_key[:12]  # e.g. sd_live_XXXX

    key_record = APIKey(
        organization_id=current_user.organization_id,
        name=data.name,
        prefix=prefix,
        hashed_secret=hashed_key,
        scopes=data.scopes,
        created_by_id=current_user.id,
    )

    db.add(key_record)
    db.commit()
    db.refresh(key_record)

    # Inject plain_key into response once
    response = APIKeyResponse(
        id=key_record.id,
        name=key_record.name,
        prefix=key_record.prefix,
        scopes=key_record.scopes,
        expires_at=key_record.expires_at,
        last_used_at=key_record.last_used_at,
        created_at=key_record.created_at,
        is_active=key_record.is_active,
        plain_key=plain_key,
    )
    return response


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke an API key")
def revoke_api_key(
    key_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    key_record = (
        db.query(APIKey)
        .filter(APIKey.id == key_id, APIKey.organization_id == current_user.organization_id)
        .first()
    )

    if not key_record:
        raise HTTPException(status_code=404, detail="API Key not found")

    key_record.is_active = False
    db.commit()
    return None
