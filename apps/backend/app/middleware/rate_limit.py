"""
Rate limiting setup for the Baby Tracker API using slowapi.

Exports:
- `limiter`: The global Limiter instance to attach to the FastAPI app.
- `rate_limit_exceeded_handler`: The 429 exception handler to register on the app.
- Convenience limit decorators for general, AI, and auth endpoints.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings

# Use Redis for rate limit state tracking in production to coordinate
# limits across replicas and persist state across restarts.
# Fall back to in-memory ("memory://") for local development and tests.
storage_uri = settings.redis_url if settings.is_production else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    storage_uri=storage_uri,
)


rate_limit_exceeded_handler = _rate_limit_exceeded_handler

# Pre-built limit strings — use these as decorators on route functions.
GENERAL_LIMIT = f"{settings.rate_limit_per_minute}/minute"
AI_LIMIT = f"{settings.ai_rate_limit_per_minute}/minute"
AUTH_LIMIT = f"{settings.auth_rate_limit_per_minute}/minute"

__all__ = [
    "limiter",
    "rate_limit_exceeded_handler",
    "RateLimitExceeded",
    "GENERAL_LIMIT",
    "AI_LIMIT",
    "AUTH_LIMIT",
]
