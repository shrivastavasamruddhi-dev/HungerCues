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
    """Verify the database connection. Fallback to SQLite if Postgres is unavailable."""
    global engine, async_session
    sqlite_fallback = False

    if "postgresql" in db_url:
        try:
            logger.info("Attempting to connect to PostgreSQL...")
            # Create a temporary connection to verify
            temp_engine = create_async_engine(
                db_url,
                connect_args={"timeout": 3},  # short timeout for quick fallback
            )
            async with temp_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await temp_engine.dispose()
            logger.info("PostgreSQL connection verified successfully.")
        except Exception as e:
            logger.warning(
                f"PostgreSQL connection failed: {e}. Falling back to SQLite..."
            )
            sqlite_fallback = True

    if sqlite_fallback or "sqlite" in db_url:
        db_name = "test_baby_tracker.db" if os.environ.get("PYTEST_CURRENT_TEST") else "baby_tracker.db"
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
        logger.info(f"Database engine set to SQLite: {fallback_url}")

    # Auto-create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safely attempt to add breast_side column to feedings table in case of an existing DB
        try:
            await conn.execute(text("ALTER TABLE feedings ADD COLUMN breast_side VARCHAR(20)"))
        except Exception:
            pass
        # Safely attempt to add deleted_at columns for soft deletion
        for table in ["feedings", "sleep_sessions", "diaper_changes", "growth_records"]:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN deleted_at DATETIME"))
            except Exception:
                pass
    logger.info("Database schema initialized (tables created).")


