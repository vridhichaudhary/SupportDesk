import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.dependencies import get_db, get_current_user
from src.models import User, UserRole, Integration

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class IntegrationCreate(BaseModel):
    provider: str
    config_json: dict


class IntegrationResponse(BaseModel):
    id: uuid.UUID
    provider: str
    is_active: bool
    config_json: dict
    created_at: Any


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[IntegrationResponse])
def list_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    integrations = db.query(Integration).filter(
        Integration.organization_id == current_user.organization_id
    ).all()
    return integrations


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
def configure_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    integration = db.query(Integration).filter(
        Integration.organization_id == current_user.organization_id,
        Integration.provider == data.provider
    ).first()
    
    if integration:
        integration.config_json = data.config_json
        integration.is_active = True
    else:
        integration = Integration(
            organization_id=current_user.organization_id,
            provider=data.provider,
            config_json=data.config_json,
            is_active=True
        )
        db.add(integration)
        
    db.commit()
    db.refresh(integration)
    return integration


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_integration(
    integration_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.organization_id == current_user.organization_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    db.delete(integration)
    db.commit()
    return None
