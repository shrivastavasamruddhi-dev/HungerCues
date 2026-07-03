"""
Shared pytest fixtures for the Baby Tracker backend test suite.

Provides:
  - db_setup      : module-scoped DB init + teardown
  - db_session    : per-test AsyncSession
  - async_client  : httpx AsyncClient using ASGITransport (no live server needed)

All tests automatically get the Firebase auth override applied.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
import app.database as db_module
from app.dependencies.auth import get_current_firebase_uid


# ---------------------------------------------------------------------------
# Firebase auth override — replaces the real token check in all tests
# ---------------------------------------------------------------------------
async def _mock_firebase_uid() -> str:
    return "mock-user-uid"


app.dependency_overrides[get_current_firebase_uid] = _mock_firebase_uid


# ---------------------------------------------------------------------------
# DB lifecycle — module-scoped so tables are only created / dropped once
# per test module that imports these fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="module", autouse=True)
async def db_setup():
    """Create all tables before the module runs; drop them after."""
    await db_module.verify_and_setup_db()
    async with db_module.engine.begin() as conn:
        await conn.run_sync(db_module.Base.metadata.create_all)
    yield
    async with db_module.engine.begin() as conn:
        await conn.run_sync(db_module.Base.metadata.drop_all)


# ---------------------------------------------------------------------------
# Per-test DB session
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def db_session():
    """Yield an AsyncSession for direct ORM operations in tests."""
    async for session in db_module.get_db():
        yield session


# ---------------------------------------------------------------------------
# Async HTTP client (httpx + ASGITransport)
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def async_client():
    """
    Yield an httpx AsyncClient that talks to the FastAPI app in-process.

    Usage::

        async def test_health(async_client):
            resp = await async_client.get("/health")
            assert resp.status_code == 200
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
