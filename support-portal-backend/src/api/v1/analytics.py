from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from src.core.dependencies import get_current_user, get_db
from src.models import User, UserRole
from src.services.analytics import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/executive")
def get_executive_dashboard(
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized for executive dashboard")
    return analytics_service.get_executive_dashboard(db, current_user.organization_id, days=days)


@router.get("/manager")
def get_manager_dashboard(
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized for manager dashboard")
    return analytics_service.get_manager_dashboard(db, current_user.organization_id, days=days)


@router.get("/agent")
def get_agent_dashboard(
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_agent_dashboard(
        db, current_user.organization_id, current_user.id, days=days
    )


@router.get("/trends")
def get_trends(
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analytics_service.get_trends(db, current_user.organization_id, days=days)


@router.get("/export", response_class=PlainTextResponse)
def export_analytics(
    type: str = Query(..., description="Type of dashboard to export (executive, manager)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized for exports")
    csv_data = analytics_service.export_csv(db, current_user.organization_id, type)
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analytics_{type}.csv"},
    )
