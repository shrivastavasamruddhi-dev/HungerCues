"""
Structured JSON logging configuration for Baby Tracker.

Call `configure_logging()` once at application startup (in main.py lifespan)
to replace the default Python logging format with structured JSON output.

In production, these JSON logs can be shipped to any log aggregator
(ELK, Loki, CloudWatch, etc.) without additional parsing configuration.
"""

import logging
import sys

from pythonjsonlogger import jsonlogger

from app.config import settings


def configure_logging() -> None:
    """
    Configure application-wide structured JSON logging.

    In development: human-readable format with colours (standard logging).
    In production: JSON format suitable for log aggregators.
    """
    root_logger = logging.getLogger()

    if settings.is_production:
        # JSON formatter — one log entry per line, machine-parseable
        handler = logging.StreamHandler(sys.stdout)
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
        handler.setFormatter(formatter)
        root_logger.handlers = [handler]
        root_logger.setLevel(logging.INFO)

        # Silence noisy libraries in production
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    else:
        # Development: standard coloured output
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        )
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
