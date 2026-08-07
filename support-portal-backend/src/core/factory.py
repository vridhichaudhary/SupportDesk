import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api.v1 import agents, auth, customers, departments, documents, health, knowledge, organizations, rbac, teams, tickets, users, ai, routing, automation, analytics, api_keys, webhooks, integrations
from src.api import health as root_health
import sentry_sdk
from prometheus_client import make_asgi_app, CollectorRegistry, CONTENT_TYPE_LATEST, generate_latest, REGISTRY
from starlette.responses import Response
from src.core.config import settings
from src.core.exceptions import SupportDeskException
from src.core.logging import setup_logging
from src.core.responses import ErrorDetail, ErrorResponse
from src.middlewares.request_id import RequestIDMiddleware

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging(log_level="INFO")
    logger.info("Application starting up", env=settings.ENVIRONMENT)

    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        )
        logger.info("Sentry initialized")
        
    yield
    # Shutdown
    logger.info("Application shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="**SupportDesk AI** — An AI-powered Customer Support Operating System for modern businesses.",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
        openapi_tags=[
            {"name": "System", "description": "Health checks and infrastructure endpoints."},
            {
                "name": "Organizations",
                "description": "Organization management and multi-tenant configuration.",
            },
            {"name": "Authentication", "description": "Authentication and session management."},
            {"name": "Users", "description": "User profiles and settings."},
            {"name": "Departments", "description": "Organizational department management."},
            {"name": "Teams", "description": "Team management, member assignments, and capacity tracking."},
            {"name": "Agents", "description": "Agent profiles, skills, availability, presence, and working hours."},
            {
                "name": "Roles & Permissions",
                "description": "Enterprise RBAC — role management, permission assignment, and authorization matrix.",
            },
            {"name": "Tickets", "description": "Customer support ticket lifecycle. (Coming soon)"},
            {
                "name": "Knowledge",
                "description": "Knowledge base articles and AI search. (Coming soon)",
            },
            {
                "name": "AI",
                "description": "AI-powered reply suggestions and summaries. (Coming soon)",
            },
            {"name": "Analytics", "description": "Reports and performance metrics. (Coming soon)"},
            {"name": "Workflow", "description": "Automation and trigger management. (Coming soon)"},
            {"name": "Settings", "description": "Global platform settings. (Coming soon)"},
        ],
    )

    # Middlewares
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    if settings.ENABLE_METRICS:
        # Mount native prometheus metrics ASGI app at /metrics
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)

    # Global Exception Handlers
    @app.exception_handler(SupportDeskException)
    async def custom_exception_handler(request: Request, exc: SupportDeskException):
        logger.error(
            "Business exception occurred",
            code=exc.code,
            error_message=exc.message,
            status_code=exc.status_code,
            details=exc.details,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=ErrorDetail(code=exc.code, message=exc.message, details=exc.details)
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="INTERNAL_SERVER_ERROR", message="An unexpected error occurred."
                )
            ).model_dump(),
        )

    # Static Files Mount for Avatars
    os.makedirs("static/uploads/avatars", exist_ok=True)
    app.mount("/static", StaticFiles(directory="static"), name="static")

    # Root-level health probes (no /api/v1 prefix)
    # Used by: Render health check, Kubernetes probes, Docker, uptime monitors
    app.include_router(root_health.router)

    # Versioned API routers
    app.include_router(health.router, prefix=settings.API_V1_STR)
    app.include_router(organizations.router, prefix=settings.API_V1_STR)
    app.include_router(auth.router, prefix=settings.API_V1_STR)
    app.include_router(users.router, prefix=settings.API_V1_STR)
    app.include_router(rbac.router, prefix=settings.API_V1_STR)
    app.include_router(departments.router, prefix=settings.API_V1_STR)
    app.include_router(teams.router, prefix=settings.API_V1_STR)
    app.include_router(customers.router, prefix=settings.API_V1_STR)
    app.include_router(tickets.router, prefix=settings.API_V1_STR)
    app.include_router(agents.router, prefix=settings.API_V1_STR)
    app.include_router(knowledge.router, prefix=settings.API_V1_STR)
    app.include_router(documents.router, prefix=settings.API_V1_STR)
    app.include_router(ai.router, prefix=settings.API_V1_STR)
    app.include_router(routing.router, prefix=settings.API_V1_STR)
    app.include_router(automation.router, prefix=settings.API_V1_STR)
    app.include_router(analytics.router, prefix=settings.API_V1_STR)
    app.include_router(api_keys.router, prefix=settings.API_V1_STR)
    app.include_router(webhooks.router, prefix=settings.API_V1_STR)
    app.include_router(integrations.router, prefix=settings.API_V1_STR)

    return app
