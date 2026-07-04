import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import verify_and_setup_db
from app.dependencies.auth import initialize_firebase_app
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.security import RequestIDMiddleware, SecurityHeadersMiddleware
from app.routers.v1 import router as v1_router
from app.utils.logging import configure_logging

# Configure logging before anything else
configure_logging()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sentry initialisation — only when DSN is configured (i.e. production/staging)
# ---------------------------------------------------------------------------
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        # Scrub sensitive fields from payloads before sending to Sentry
        send_default_pii=False,
    )
    logger.info("Sentry initialised (environment=%s)", settings.environment)


# ---------------------------------------------------------------------------
# Application lifespan — startup / shutdown hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Initialise Firebase and verify DB connectivity on startup.

    Note: Push notification scheduling is handled by Celery Beat
    (celery-beat service in docker-compose.prod.yml). The old asyncio
    background task has been removed to prevent double-scheduling.
    """
    initialize_firebase_app()
    await verify_and_setup_db()
    yield


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Baby Tracker API",
    description="REST API for the Baby Tracker application",
    version="0.1.0",
    lifespan=lifespan,
    # Hide interactive docs in production — they expose the full API surface
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# ---------------------------------------------------------------------------
# Rate limiter — must be set on the app state before routes are registered
# ---------------------------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Middleware — applied in reverse order (last added = outermost)
# ---------------------------------------------------------------------------

# 1. Request ID — attach UUID to every request for tracing (outermost)
app.add_middleware(RequestIDMiddleware)

# 2. Security headers — added to every response
app.add_middleware(SecurityHeadersMiddleware)

# 3. CORS — allow only explicitly configured origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=(["*"] if not settings.is_production else settings.parsed_allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(v1_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Prometheus metrics — exposes /metrics endpoint for Prometheus scraping
# ---------------------------------------------------------------------------
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
).instrument(app).expose(app, include_in_schema=False)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for load balancers and monitoring tools.

    Returns basic service status, version, and current environment.
    Does NOT expose internal details in production.
    """
    payload: dict = {"status": "ok", "version": "0.1.0"}
    if not settings.is_production:
        payload["environment"] = settings.environment
        payload["service"] = "baby-tracker-backend"
    return payload
