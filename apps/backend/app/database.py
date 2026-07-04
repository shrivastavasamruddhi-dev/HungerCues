import logging
import os
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# Determine database URL dynamically to isolate tests from active development database
db_url = settings.database_url
if os.environ.get("PYTEST_CURRENT_TEST"):
    db_url = "sqlite+aiosqlite:///./test_baby_tracker.db"

# Default engine and sessionmaker
engine = create_async_engine(
    db_url,
    echo=settings.environment == "development",
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    # Use dynamic sessionmaker in case it was re-created during startup
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def verify_and_setup_db() -> None:
    """
    Verify database connectivity and initialise schema.

    Production (PostgreSQL):
      - Verifies the connection is reachable.
      - Does NOT call create_all — schema is owned by Alembic migrations.
        Run `alembic upgrade head` before starting the app in production.

    Development / Test (SQLite):
      - Falls back to a local SQLite file if PostgreSQL is unreachable.
      - Calls create_all for zero-config local development.
    """
    global engine, async_session
    use_sqlite = False

    if "postgresql" in db_url:
        try:
            logger.info("Verifying PostgreSQL connection...")
            temp_engine = create_async_engine(
                db_url,
                connect_args={"timeout": 3},
            )
            async with temp_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await temp_engine.dispose()
            logger.info("PostgreSQL connection verified.")
        except Exception as e:
            if settings.is_production:
                # In production, SQLite is never acceptable — fail fast so the
                # container restarter can surface the misconfiguration clearly.
                raise RuntimeError(
                    f"FATAL: PostgreSQL is unreachable in production. "
                    f"Refusing SQLite fallback. Error: {e}"
                ) from e
            logger.warning(
                "PostgreSQL unavailable: %s — falling back to SQLite (dev/test only).",
                e,
            )
            use_sqlite = True

    if use_sqlite or "sqlite" in db_url:
        db_name = (
            "test_baby_tracker.db"
            if os.environ.get("PYTEST_CURRENT_TEST")
            else "baby_tracker.db"
        )
        fallback_url = f"sqlite+aiosqlite:///./{db_name}"
        engine = create_async_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=settings.environment == "development",
        )
        async_session = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        logger.info("Using SQLite for local dev/test: %s", fallback_url)

        # Dev/test only: auto-create tables so local setup needs no migrations
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safely apply additive SQLite-only schema patches
            for stmt in [
                "ALTER TABLE feedings ADD COLUMN breast_side VARCHAR(20)",
                *[
                    f"ALTER TABLE {t} ADD COLUMN deleted_at DATETIME"
                    for t in [
                        "feedings",
                        "sleep_sessions",
                        "diaper_changes",
                        "growth_records",
                    ]
                ],
            ]:
                try:
                    await conn.execute(text(stmt))
                except Exception:
                    pass  # Column already exists — safe to ignore
        logger.info("SQLite schema initialised (create_all).")

    else:
        # PostgreSQL: schema is managed entirely by Alembic.
        # In production the CD pipeline runs `alembic upgrade head` before
        # starting the container. We only re-bind the sessionmaker here.
        async_session = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        logger.info(
            "PostgreSQL ready. Schema managed by Alembic — "
            "ensure `alembic upgrade head` was run before startup."
        )
