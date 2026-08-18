from datetime import datetime, timezone

import structlog

from src.core.celery_app import celery_app
from src.core.database import SessionLocal
from src.models import AnalyticsSnapshot, Organization
from src.services.analytics import analytics_service

logger = structlog.get_logger()


@celery_app.task
def aggregate_daily_analytics_task():
    """
    Nightly job: Calculates aggregate metrics for the day and saves to AnalyticsSnapshot.
    """
    logger.info("Starting daily analytics aggregation")
    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        for org in orgs:
            # Reusing the service for the 1 day scope
            exec_data = analytics_service.get_executive_dashboard(db, org.id, days=1)

            snapshot = AnalyticsSnapshot(
                organization_id=org.id,
                date=today,
                total_tickets=exec_data["total_tickets"],
                open_tickets=exec_data["open_tickets"],
                resolved_tickets=exec_data["resolved_tickets"],
                avg_resolution_time_minutes=int(exec_data["avg_resolution_time_hours"] * 60),
                sla_compliance_percent=exec_data["sla_compliance_percent"],
                ai_resolution_rate_percent=exec_data["ai_resolution_rate_percent"],
            )

            # Upsert logic (delete existing if rerun)
            db.query(AnalyticsSnapshot).filter(
                AnalyticsSnapshot.organization_id == org.id, AnalyticsSnapshot.date == today
            ).delete()

            db.add(snapshot)

        db.commit()
        logger.info("Daily analytics aggregation complete", orgs_processed=len(orgs))
    except Exception as e:
        logger.error("Failed to aggregate daily analytics", error=str(e))
        db.rollback()
    finally:
        db.close()


@celery_app.task
def refresh_dashboard_cache_task():
    """
    Periodic job: Refreshes expensive dashboard calculations and stores in DashboardCache.
    (Placeholder for materialized views cache pattern).
    """
    logger.info("Refreshing dashboard caches")
    pass
