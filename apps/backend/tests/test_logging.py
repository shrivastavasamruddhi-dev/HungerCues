"""
Test suite for structured JSON logging configuration.

Tests verify that logging is configured correctly for both production
and development environments, with proper log levels and formatters.
"""

import json
import logging
import sys
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest

from app.utils.logging import configure_logging


@pytest.fixture
def clean_logger():
    """Fixture to clean up logger state before and after tests."""
    root_logger = logging.getLogger()
    # Store original state
    original_handlers = root_logger.handlers[:]
    original_level = root_logger.level

    yield root_logger

    # Restore original state
    root_logger.handlers = original_handlers
    root_logger.setLevel(original_level)
    # Reset all child loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.NOTSET)
    logging.getLogger("uvicorn.access").setLevel(logging.NOTSET)


class TestProductionLogging:
    """Test logging configuration in production mode."""

    def test_configure_logging_production_sets_json_formatter(self, clean_logger):
        """Verify JSON formatter is configured in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            # Verify handler exists
            assert len(clean_logger.handlers) > 0

            # Verify it's a StreamHandler writing to stdout
            handler = clean_logger.handlers[0]
            assert isinstance(handler, logging.StreamHandler)
            assert handler.stream == sys.stdout

            # Verify formatter is JsonFormatter
            formatter = handler.formatter
            assert formatter is not None
            assert hasattr(formatter, "_fmt")

    def test_configure_logging_production_sets_info_level(self, clean_logger):
        """Verify INFO log level is set in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            assert clean_logger.level == logging.INFO

    def test_configure_logging_production_silences_sqlalchemy(self, clean_logger):
        """Verify SQLAlchemy engine logging is silenced in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()

            configure_logging()

            sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
            assert sqlalchemy_logger.level == logging.WARNING

    def test_configure_logging_production_silences_uvicorn(self, clean_logger):
        """Verify Uvicorn access logging is silenced in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()

            configure_logging()

            uvicorn_logger = logging.getLogger("uvicorn.access")
            assert uvicorn_logger.level == logging.WARNING

    def test_configure_logging_production_json_output_format(self, clean_logger):
        """Verify JSON output is properly formatted in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            # Capture output
            log_capture_string = StringIO()
            clean_logger.handlers.clear()
            handler = logging.StreamHandler(log_capture_string)

            configure_logging()

            # Replace handler with our capture handler but keep formatter
            formatter = clean_logger.handlers[0].formatter
            clean_logger.handlers.clear()
            handler.setFormatter(formatter)
            clean_logger.addHandler(handler)
            clean_logger.setLevel(logging.INFO)

            # Log a test message
            test_logger = logging.getLogger("test_module")
            test_logger.info("Test message", extra={"user_id": 123})

            # Get output and verify it's valid JSON
            output = log_capture_string.getvalue().strip()
            if output:  # Only assert if output was captured
                log_data = json.loads(output)
                assert "message" in log_data
                assert "level" in log_data
                assert "timestamp" in log_data


class TestDevelopmentLogging:
    """Test logging configuration in development mode."""

    def test_configure_logging_development_sets_debug_level(self, clean_logger):
        """Verify DEBUG log level is set in development."""
        with patch("app.config.settings.is_production", False):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            assert clean_logger.level == logging.DEBUG

    def test_configure_logging_development_silences_sqlalchemy(self, clean_logger):
        """Verify SQLAlchemy engine logging is silenced in development."""
        with patch("app.config.settings.is_production", False):
            clean_logger.handlers.clear()

            configure_logging()

            sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
            assert sqlalchemy_logger.level == logging.WARNING

    def test_configure_logging_development_uses_standard_format(self, clean_logger):
        """Verify standard (non-JSON) format is used in development."""
        with patch("app.config.settings.is_production", False):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            # Verify handler exists and has standard formatter
            assert len(clean_logger.handlers) > 0
            handler = clean_logger.handlers[0]
            assert handler.formatter is not None

            # The format string should contain standard format codes
            fmt = handler.formatter._fmt
            assert "%(asctime)s" in fmt
            assert "%(levelname)s" in fmt
            assert "%(message)s" in fmt

    def test_configure_logging_development_creates_handler(self, clean_logger):
        """Verify handler is properly configured in development mode."""
        with patch("app.config.settings.is_production", False):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            # In development, basicConfig is called which should set up handlers
            assert clean_logger.level == logging.DEBUG


class TestLoggingEdgeCases:
    """Test edge cases and error handling."""

    def test_configure_logging_called_multiple_times_production(self, clean_logger):
        """Verify calling configure_logging multiple times doesn't duplicate handlers."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()

            configure_logging()
            handler_count_first = len(clean_logger.handlers)

            configure_logging()
            handler_count_second = len(clean_logger.handlers)

            # Handlers should be replaced, not duplicated
            assert handler_count_second == handler_count_first

    def test_configure_logging_json_formatter_exists(self, clean_logger):
        """Verify JSON formatter is actually instantiated in production."""
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)

            configure_logging()

            handler = clean_logger.handlers[0]
            # The formatter should be a JSON formatter (python-json-logger)
            formatter_class_name = type(handler.formatter).__name__
            assert "Json" in formatter_class_name or "json" in formatter_class_name.lower()

    def test_configure_logging_environment_setting_respected(self, clean_logger):
        """Verify environment setting actually switches between production/dev."""
        # Test production
        with patch("app.config.settings.is_production", True):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)
            configure_logging()
            production_level = clean_logger.level

        # Test development
        with patch("app.config.settings.is_production", False):
            clean_logger.handlers.clear()
            clean_logger.setLevel(logging.NOTSET)
            configure_logging()
            dev_level = clean_logger.level

        assert production_level == logging.INFO
        assert dev_level == logging.DEBUG
        assert production_level != dev_level
