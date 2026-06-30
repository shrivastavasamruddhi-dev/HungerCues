from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/baby_tracker"

    # Firebase
    firebase_project_id: str = ""
    firebase_service_account_key_path: str = ""

    # Cloudflare R2
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "baby-tracker"

    # Gemma AI Service
    gemma_api_url: str = "http://localhost:8080"
    gemma_api_key: str = ""

    # Gemini AI Service
    gemini_api_key: str = ""

    # Notification Scheduler
    notification_test_mode: bool = False

    # App
    environment: str = "development"

    # Security — CORS
    # Comma-separated list of allowed origins, e.g.:
    # "https://app.example.com,https://www.example.com"
    # Defaults to localhost for development.
    allowed_origins: str = "http://localhost:3000,http://localhost:8081,exp://localhost:8081"

    # Security — Rate Limiting
    rate_limit_per_minute: int = 60          # General API rate limit
    ai_rate_limit_per_minute: int = 10       # Stricter limit for AI endpoints
    auth_rate_limit_per_minute: int = 20     # Limit for auth endpoints

    # Observability — Sentry
    sentry_dsn: str = ""                     # Set in production via env var
    sentry_traces_sample_rate: float = 0.1  # 10% of transactions traced

    # Redis + Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = ""  # Falls back to redis_url if empty

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def parsed_allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
