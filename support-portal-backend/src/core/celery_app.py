import os

import sentry_sdk
from celery import Celery
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        integrations=[CeleryIntegration()],
    )

# Check if we're running tests to avoid starting up a real worker against a broken Redis during CI
is_testing = os.getenv("TESTING", "0") == "1"

# We use the same Redis instance as RBAC caching, but use db=1 for Celery to isolate it
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/1")

# Initialize Celery
celery_app = Celery(
    "supportdesk_pipeline",
    broker=redis_url,
    backend=redis_url,
    include=[
        "src.workers.document_tasks",
        "src.workers.routing_tasks",
        "src.workers.analytics_tasks",
        "src.workers.webhook_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max processing
)

if is_testing:
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
