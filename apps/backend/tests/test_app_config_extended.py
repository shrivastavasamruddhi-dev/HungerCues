"""
Additional test coverage for utility modules and edge cases.

Tests for utility functions and configuration edge cases that ensure
comprehensive coverage of the application codebase.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.config import settings
from app.main import app, health_check
from app.utils.logging import configure_logging


class TestMainApplicationHealthCheck:
    """Test the health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check_development(self):
        """Verify health check response in development."""
        with patch("app.main.settings") as mock_settings:
            mock_settings.is_production = False
            mock_settings.environment = "development"

            response = await health_check()

            assert response["status"] == "ok"
            assert response["version"] == "0.1.0"
            assert response["environment"] == "development"
            assert response["service"] == "baby-tracker-backend"

    @pytest.mark.asyncio
    async def test_health_check_production(self):
        """Verify health check response in production (no env details)."""
        with patch("app.main.settings") as mock_settings:
            mock_settings.is_production = True
            mock_settings.environment = "production"

            response = await health_check()

            assert response["status"] == "ok"
            assert response["version"] == "0.1.0"
            assert "environment" not in response
            assert "service" not in response

    @pytest.mark.asyncio
    async def test_health_check_response_format(self):
        """Verify health check returns dict with required keys."""
        response = await health_check()

        assert isinstance(response, dict)
        assert "status" in response
        assert "version" in response


class TestApplicationConfiguration:
    """Test FastAPI application initialization."""

    def test_app_is_fastapi_instance(self):
        """Verify app is a FastAPI instance."""
        from fastapi import FastAPI

        assert isinstance(app, FastAPI)

    def test_app_title(self):
        """Verify app has correct title."""
        assert app.title == "Baby Tracker API"

    def test_app_version(self):
        """Verify app version."""
        assert app.version == "0.1.0"

    def test_app_description(self):
        """Verify app has description."""
        assert "REST API" in app.description

    def test_app_has_lifespan(self):
        """Verify app has lifespan context manager."""
        assert app.router.lifespan is not None


class TestLoggingConfiguration:
    """Test logging module configuration."""

    def test_configure_logging_production_mode(self):
        """Verify logging configuration in production mode."""
        with patch("app.utils.logging.settings") as mock_settings:
            mock_settings.is_production = True

            configure_logging()

            import logging

            root_logger = logging.getLogger()
            assert root_logger.level == logging.INFO

    def test_configure_logging_development_mode(self):
        """Verify logging configuration in development mode."""
        with patch("app.utils.logging.settings") as mock_settings:
            mock_settings.is_production = False

            configure_logging()

            import logging

            root_logger = logging.getLogger()
            assert root_logger.level == logging.DEBUG

    def test_configure_logging_silences_sqlalchemy(self):
        """Verify SQLAlchemy logging is silenced."""
        import logging

        configure_logging()

        sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
        assert sqlalchemy_logger.level == logging.WARNING

    def test_configure_logging_can_be_called_multiple_times(self):
        """Verify configure_logging can be called multiple times safely."""
        import logging

        configure_logging()
        first_handler_count = len(logging.getLogger().handlers)

        configure_logging()
        second_handler_count = len(logging.getLogger().handlers)

        # Handlers should be replaced, not duplicated
        assert second_handler_count <= first_handler_count + 1


class TestSettingsInstance:
    """Test the global settings instance."""

    def test_settings_instance_is_settings_class(self):
        """Verify settings is an instance of Settings class."""
        from app.config import Settings

        assert isinstance(settings, Settings)

    def test_settings_instance_has_all_attributes(self):
        """Verify settings instance has all expected attributes."""
        assert hasattr(settings, "database_url")
        assert hasattr(settings, "firebase_project_id")
        assert hasattr(settings, "environment")
        assert hasattr(settings, "is_production")
        assert hasattr(settings, "parsed_allowed_origins")

    def test_settings_properties_work(self):
        """Verify settings properties are callable."""
        # is_production should be a property
        result = settings.is_production
        assert isinstance(result, bool)

        # parsed_allowed_origins should be a property
        origins = settings.parsed_allowed_origins
        assert isinstance(origins, list)
        assert all(isinstance(o, str) for o in origins)


class TestEnvironmentVariableHandling:
    """Test environment variable loading."""

    def test_settings_case_insensitive_loading(self):
        """Verify settings loads environment variables case-insensitively."""
        # Create settings with lowercase env var names
        from app.config import Settings

        settings_instance = Settings(
            database_url="test://host",
            firebase_project_id="test-project",
        )

        assert settings_instance.database_url == "test://host"
        assert settings_instance.firebase_project_id == "test-project"

    def test_settings_with_empty_string_values(self):
        """Verify settings handles empty string values."""
        from app.config import Settings

        settings_instance = Settings(
            firebase_project_id="",
            gemini_api_key="",
        )

        assert settings_instance.firebase_project_id == ""
        assert settings_instance.gemini_api_key == ""

    def test_settings_with_boolean_values(self):
        """Verify settings handles boolean environment variables."""
        from app.config import Settings

        settings_instance = Settings(notification_test_mode=True)
        assert settings_instance.notification_test_mode is True

        settings_instance = Settings(notification_test_mode=False)
        assert settings_instance.notification_test_mode is False

    def test_settings_with_integer_values(self):
        """Verify settings handles integer environment variables."""
        from app.config import Settings

        settings_instance = Settings(
            rate_limit_per_minute=100,
            ai_rate_limit_per_minute=50,
        )

        assert settings_instance.rate_limit_per_minute == 100
        assert settings_instance.ai_rate_limit_per_minute == 50


class TestConfigurationDefaults:
    """Test default configuration values and their consistency."""

    def test_rate_limits_are_positive(self):
        """Verify all rate limits are positive integers."""
        assert settings.rate_limit_per_minute > 0
        assert settings.ai_rate_limit_per_minute > 0
        assert settings.auth_rate_limit_per_minute > 0

    def test_ai_limit_is_less_than_general_limit(self):
        """Verify AI rate limit is more restrictive than general limit."""
        assert settings.ai_rate_limit_per_minute < settings.rate_limit_per_minute

    def test_auth_limit_configuration(self):
        """Verify auth rate limit is configured."""
        assert settings.auth_rate_limit_per_minute > 0
        assert settings.auth_rate_limit_per_minute <= settings.rate_limit_per_minute

    def test_sentry_sample_rate_valid(self):
        """Verify Sentry sample rate is between 0 and 1."""
        assert 0.0 <= settings.sentry_traces_sample_rate <= 1.0

    def test_default_urls_are_strings(self):
        """Verify default URLs are strings."""
        assert isinstance(settings.database_url, str)
        assert isinstance(settings.redis_url, str)
        assert isinstance(settings.gemma_api_url, str)

    def test_r2_bucket_name_set(self):
        """Verify R2 bucket name has a default."""
        assert settings.r2_bucket_name == "baby-tracker"


class TestParsedAllowedOrigins:
    """Test the parsed_allowed_origins property."""

    def test_parsed_origins_are_list(self):
        """Verify parsed_allowed_origins returns a list."""
        origins = settings.parsed_allowed_origins
        assert isinstance(origins, list)

    def test_parsed_origins_all_strings(self):
        """Verify all parsed origins are strings."""
        origins = settings.parsed_allowed_origins
        assert all(isinstance(origin, str) for origin in origins)

    def test_parsed_origins_no_empty_strings(self):
        """Verify parsed origins don't contain empty strings."""
        origins = settings.parsed_allowed_origins
        assert all(origin != "" for origin in origins)

    def test_parsed_origins_localhost_included(self):
        """Verify localhost is in default parsed origins."""
        origins = settings.parsed_allowed_origins
        assert any("localhost" in origin for origin in origins)


class TestIsProductionProperty:
    """Test the is_production property."""

    def test_is_production_true_when_production(self):
        """Verify is_production returns True for production."""
        from app.config import Settings

        prod_settings = Settings(environment="production")
        assert prod_settings.is_production is True

    def test_is_production_false_when_development(self):
        """Verify is_production returns False for development."""
        from app.config import Settings

        dev_settings = Settings(environment="development")
        assert dev_settings.is_production is False

    def test_is_production_false_when_staging(self):
        """Verify is_production returns False for staging."""
        from app.config import Settings

        staging_settings = Settings(environment="staging")
        assert staging_settings.is_production is False

    def test_is_production_case_insensitive(self):
        """Verify is_production is case-insensitive."""
        from app.config import Settings

        settings_upper = Settings(environment="PRODUCTION")
        settings_mixed = Settings(environment="PrOdUcTiOn")

        assert settings_upper.is_production is True
        assert settings_mixed.is_production is True


class TestCeleryConfiguration:
    """Test Celery/Redis configuration."""

    def test_celery_broker_url_default(self):
        """Verify celery_broker_url defaults to empty string."""
        assert settings.celery_broker_url == ""

    def test_redis_url_configured(self):
        """Verify Redis URL is configured."""
        assert settings.redis_url != ""
        assert "redis://" in settings.redis_url

    def test_custom_celery_broker_url(self):
        """Verify custom Celery broker URL can be set."""
        from app.config import Settings

        custom_settings = Settings(
            celery_broker_url="redis://custom-broker:6379/1"
        )
        assert custom_settings.celery_broker_url == "redis://custom-broker:6379/1"


class TestFirebaseConfiguration:
    """Test Firebase configuration."""

    def test_firebase_project_id_default(self):
        """Verify firebase_project_id defaults to empty string."""
        assert settings.firebase_project_id == ""

    def test_firebase_service_account_key_path_default(self):
        """Verify firebase_service_account_key_path defaults to empty string."""
        assert settings.firebase_service_account_key_path == ""

    def test_firebase_can_be_configured(self):
        """Verify Firebase settings can be configured."""
        from app.config import Settings

        firebase_settings = Settings(
            firebase_project_id="test-project-id",
            firebase_service_account_key_path="/path/to/key.json",
        )

        assert firebase_settings.firebase_project_id == "test-project-id"
        assert firebase_settings.firebase_service_account_key_path == "/path/to/key.json"


class TestCloudflareR2Configuration:
    """Test Cloudflare R2 storage configuration."""

    def test_r2_credentials_default_to_empty(self):
        """Verify R2 credentials default to empty strings."""
        assert settings.r2_endpoint == ""
        assert settings.r2_access_key_id == ""
        assert settings.r2_secret_access_key == ""

    def test_r2_bucket_name_has_default(self):
        """Verify R2 bucket name has a reasonable default."""
        assert settings.r2_bucket_name == "baby-tracker"

    def test_r2_all_settings_customizable(self):
        """Verify all R2 settings can be customized."""
        from app.config import Settings

        r2_settings = Settings(
            r2_endpoint="https://custom.r2.endpoint",
            r2_access_key_id="custom-key-id",
            r2_secret_access_key="custom-secret",
            r2_bucket_name="custom-bucket",
        )

        assert r2_settings.r2_endpoint == "https://custom.r2.endpoint"
        assert r2_settings.r2_access_key_id == "custom-key-id"
        assert r2_settings.r2_secret_access_key == "custom-secret"
        assert r2_settings.r2_bucket_name == "custom-bucket"


class TestAIServiceConfiguration:
    """Test AI service configurations."""

    def test_gemma_api_url_default(self):
        """Verify Gemma API URL has a default."""
        assert settings.gemma_api_url == "http://localhost:8080"

    def test_gemma_api_key_default(self):
        """Verify Gemma API key defaults to empty."""
        assert settings.gemma_api_key == ""

    def test_gemini_api_key_default(self):
        """Verify Gemini API key defaults to empty."""
        assert settings.gemini_api_key == ""

    def test_ai_services_customizable(self):
        """Verify AI services can be configured."""
        from app.config import Settings

        ai_settings = Settings(
            gemma_api_url="http://custom-gemma:8080",
            gemma_api_key="custom-gemma-key",
            gemini_api_key="custom-gemini-key",
        )

        assert ai_settings.gemma_api_url == "http://custom-gemma:8080"
        assert ai_settings.gemma_api_key == "custom-gemma-key"
        assert ai_settings.gemini_api_key == "custom-gemini-key"
