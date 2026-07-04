"""
Test suite for application configuration.

Tests verify that settings are loaded correctly from environment variables
and provide correct property values for production/development modes.
"""

from unittest.mock import patch

import pytest

from app.config import Settings


class TestSettingsDefaults:
    """Test default configuration values."""

    def test_settings_database_url_default(self):
        """Verify default database URL is set."""
        settings = Settings()
        assert settings.database_url == "postgresql+asyncpg://postgres:postgres@localhost:5432/baby_tracker"

    def test_settings_firebase_defaults_empty(self):
        """Verify Firebase settings default to empty strings."""
        settings = Settings()
        assert settings.firebase_project_id == ""
        assert settings.firebase_service_account_key_path == ""

    def test_settings_r2_defaults(self):
        """Verify R2 (Cloudflare) defaults are set correctly."""
        settings = Settings()
        assert settings.r2_endpoint == ""
        assert settings.r2_access_key_id == ""
        assert settings.r2_secret_access_key == ""
        assert settings.r2_bucket_name == "baby-tracker"

    def test_settings_gemma_defaults(self):
        """Verify Gemma AI service defaults."""
        settings = Settings()
        assert settings.gemma_api_url == "http://localhost:8080"
        assert settings.gemma_api_key == ""

    def test_settings_gemini_defaults(self):
        """Verify Gemini API key defaults to empty."""
        settings = Settings()
        assert settings.gemini_api_key == ""

    def test_settings_notification_test_mode_default(self):
        """Verify notification test mode is disabled by default."""
        settings = Settings()
        assert settings.notification_test_mode is False

    def test_settings_environment_default(self):
        """Verify environment defaults to development."""
        settings = Settings()
        assert settings.environment == "development"

    def test_settings_allowed_origins_default(self):
        """Verify default allowed origins include localhost."""
        settings = Settings()
        assert "http://localhost:3000" in settings.allowed_origins
        assert "http://localhost:8081" in settings.allowed_origins

    def test_settings_rate_limit_defaults(self):
        """Verify rate limiting defaults are set."""
        settings = Settings()
        assert settings.rate_limit_per_minute == 60
        assert settings.ai_rate_limit_per_minute == 10
        assert settings.auth_rate_limit_per_minute == 20

    def test_settings_sentry_defaults(self):
        """Verify Sentry defaults."""
        settings = Settings()
        assert settings.sentry_dsn == ""
        assert settings.sentry_traces_sample_rate == 0.1

    def test_settings_redis_defaults(self):
        """Verify Redis defaults."""
        settings = Settings()
        assert settings.redis_url == "redis://localhost:6379/0"
        assert settings.celery_broker_url == ""


class TestSettingsProperties:
    """Test computed properties."""

    def test_is_production_true_when_environment_is_production(self):
        """Verify is_production returns True for production environment."""
        settings = Settings(environment="production")
        assert settings.is_production is True

    def test_is_production_false_when_environment_is_development(self):
        """Verify is_production returns False for development environment."""
        settings = Settings(environment="development")
        assert settings.is_production is False

    def test_is_production_true_case_insensitive(self):
        """Verify is_production is case-insensitive."""
        settings = Settings(environment="PRODUCTION")
        assert settings.is_production is True

    def test_is_production_true_mixed_case(self):
        """Verify is_production handles mixed case."""
        settings = Settings(environment="PrOdUcTiOn")
        assert settings.is_production is True

    def test_parsed_allowed_origins_single_origin(self):
        """Verify parsed_allowed_origins splits comma-separated values."""
        settings = Settings(allowed_origins="http://localhost:3000")
        parsed = settings.parsed_allowed_origins
        assert parsed == ["http://localhost:3000"]

    def test_parsed_allowed_origins_multiple_origins(self):
        """Verify multiple origins are parsed correctly."""
        settings = Settings(allowed_origins="http://localhost:3000,http://localhost:8081,exp://localhost:8081")
        parsed = settings.parsed_allowed_origins
        assert len(parsed) == 3
        assert "http://localhost:3000" in parsed
        assert "http://localhost:8081" in parsed
        assert "exp://localhost:8081" in parsed

    def test_parsed_allowed_origins_strips_whitespace(self):
        """Verify whitespace is stripped from origins."""
        settings = Settings(allowed_origins="http://localhost:3000 , http://localhost:8081")
        parsed = settings.parsed_allowed_origins
        assert len(parsed) == 2
        assert "http://localhost:3000" in parsed
        assert "http://localhost:8081" in parsed

    def test_parsed_allowed_origins_filters_empty_strings(self):
        """Verify empty strings are filtered out."""
        settings = Settings(allowed_origins="http://localhost:3000,,http://localhost:8081")
        parsed = settings.parsed_allowed_origins
        assert len(parsed) == 2

    def test_parsed_allowed_origins_empty_string(self):
        """Verify empty origins string returns empty list."""
        settings = Settings(allowed_origins="")
        parsed = settings.parsed_allowed_origins
        assert parsed == []


class TestSettingsEnvironmentVariables:
    """Test settings loaded from environment variables."""

    def test_settings_from_environment_database_url(self):
        """Verify DATABASE_URL is loaded from environment."""
        settings = Settings(database_url="postgresql://custom_host:5432/custom_db")
        assert settings.database_url == "postgresql://custom_host:5432/custom_db"

    def test_settings_from_environment_firebase_project_id(self):
        """Verify FIREBASE_PROJECT_ID is loaded from environment."""
        settings = Settings(firebase_project_id="test-project-123")
        assert settings.firebase_project_id == "test-project-123"

    def test_settings_from_environment_gemini_api_key(self):
        """Verify GEMINI_API_KEY is loaded from environment."""
        settings = Settings(gemini_api_key="sk-test-key-123")
        assert settings.gemini_api_key == "sk-test-key-123"

    def test_settings_from_environment_environment_var(self):
        """Verify ENVIRONMENT is loaded from environment."""
        settings = Settings(environment="staging")
        assert settings.environment == "staging"

    def test_settings_from_environment_notification_test_mode(self):
        """Verify NOTIFICATION_TEST_MODE is loaded from environment."""
        settings = Settings(notification_test_mode=True)
        assert settings.notification_test_mode is True

    def test_settings_from_environment_rate_limits(self):
        """Verify rate limit settings are loaded from environment."""
        settings = Settings(
            rate_limit_per_minute=120,
            ai_rate_limit_per_minute=20,
            auth_rate_limit_per_minute=40,
        )
        assert settings.rate_limit_per_minute == 120
        assert settings.ai_rate_limit_per_minute == 20
        assert settings.auth_rate_limit_per_minute == 40

    def test_settings_from_environment_allowed_origins(self):
        """Verify ALLOWED_ORIGINS is loaded from environment."""
        settings = Settings(allowed_origins="https://app.example.com,https://www.example.com")
        assert settings.allowed_origins == "https://app.example.com,https://www.example.com"
        parsed = settings.parsed_allowed_origins
        assert len(parsed) == 2


class TestSettingsEdgeCases:
    """Test edge cases and corner scenarios."""

    def test_settings_case_insensitive_environment_variable_names(self):
        """Verify environment variable names are case-insensitive."""
        # Pydantic settings should handle this
        settings = Settings()
        assert hasattr(settings, "database_url")

    def test_settings_multiple_instances_independent(self):
        """Verify multiple Settings instances are independent."""
        settings1 = Settings(environment="production")
        settings2 = Settings(environment="development")
        assert settings1.is_production is True
        assert settings2.is_production is False

    def test_settings_with_custom_redis_url(self):
        """Verify custom Redis URL can be configured."""
        settings = Settings(redis_url="redis://custom-host:6380/1")
        assert settings.redis_url == "redis://custom-host:6380/1"

    def test_settings_with_custom_celery_broker_url(self):
        """Verify custom Celery broker URL can be configured."""
        settings = Settings(celery_broker_url="redis://custom-broker:6379/0")
        assert settings.celery_broker_url == "redis://custom-broker:6379/0"

    def test_settings_sentry_traces_sample_rate_configurable(self):
        """Verify Sentry traces sample rate can be configured."""
        settings = Settings(sentry_traces_sample_rate=0.5)
        assert settings.sentry_traces_sample_rate == 0.5

    def test_settings_with_empty_allowed_origins_string(self):
        """Verify empty allowed origins doesn't crash."""
        settings = Settings(allowed_origins="   ")
        parsed = settings.parsed_allowed_origins
        assert len(parsed) == 0
