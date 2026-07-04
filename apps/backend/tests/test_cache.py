import pytest

from app.services.cache import cache_service, invalidate_baby_cache


@pytest.mark.asyncio
async def test_cache_disabled_by_default_in_tests():
    """Verify that the cache service bypasses Redis in tests (PYTEST_CURRENT_TEST is set)."""
    # get_client checks PYTEST_CURRENT_TEST dynamically, so it must return None
    client = await cache_service.get_client()
    assert client is None


@pytest.mark.asyncio
async def test_cache_operations_fallback_gracefully():
    """Verify cache read/write operations return safe fallback values without raising errors when disabled."""
    assert await cache_service.get("some_key") is None
    assert await cache_service.set("some_key", "some_value") is False
    assert await cache_service.delete("some_key") is False


@pytest.mark.asyncio
async def test_invalidate_baby_cache_runs_without_raising():
    """Verify that calling the cache invalidation helper executes cleanly without raising any errors."""
    # Should complete without raising any exceptions
    await invalidate_baby_cache(123)
