import json
import logging
import os
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis Caching service for expensive AI insights and analytics.

    Automatically bypasses connection if running in a test environment
    or if Redis is unreachable, falling back gracefully to no-cache behavior.
    """

    def __init__(self):
        self.redis: aioredis.Redis | None = None
        self._disabled = False

    async def get_client(self) -> aioredis.Redis | None:
        if self._disabled or os.environ.get("PYTEST_CURRENT_TEST"):
            return None
        if self.redis is not None:
            return self.redis

        try:
            self.redis = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            # Verify connectivity
            await self.redis.ping()
            logger.info("Connected to Redis cache backend.")
            return self.redis
        except Exception as e:
            logger.warning(
                "Redis cache connection failed (falling back to no-cache): %s", e
            )
            self._disabled = True  # Avoid continuous reconnect attempts on failure
            self.redis = None
            return None

    async def get(self, key: str) -> Any | None:
        client = await self.get_client()
        if not client:
            return None
        try:
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.error("Failed to read from Redis cache for key %s: %s", key, e)
        return None

    async def set(self, key: str, value: Any, expire_seconds: int = 86400) -> bool:
        client = await self.get_client()
        if not client:
            return False
        try:
            await client.set(key, json.dumps(value), ex=expire_seconds)
            return True
        except Exception as e:
            logger.error("Failed to write to Redis cache for key %s: %s", key, e)
        return False

    async def delete(self, key: str) -> bool:
        client = await self.get_client()
        if not client:
            return False
        try:
            await client.delete(key)
            return True
        except Exception as e:
            logger.error("Failed to delete Redis cache key %s: %s", key, e)
        return False


# Global cache service instance
cache_service = CacheService()


async def invalidate_baby_cache(baby_id: int) -> None:
    """Invalidate all cached insights and summaries for a baby when new logs are added/updated."""
    try:
        await cache_service.delete(f"insights:{baby_id}")
        await cache_service.delete(f"weekly_summary:{baby_id}")
        logger.debug("Invalidated cached insights & summary for baby_id=%s", baby_id)
    except Exception as e:
        logger.error("Failed to invalidate cache for baby_id=%s: %s", baby_id, e)
