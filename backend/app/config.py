from pydantic_settings import BaseSettings
from sqlalchemy import URL


class Settings(BaseSettings):
    # Database, in order of precedence:
    #   DB_URL set   → used as is (e.g. an external PostgreSQL)
    #   DB_HOST set  → PostgreSQL from DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (set by docker-compose.yml)
    #   neither      → SQLite in ./dev.db (local development)
    db_url: str = ""
    db_host: str = ""
    db_port: int = 5432
    db_user: str = "healthhabitstarter"
    db_password: str = ""
    db_name: str = "healthhabitstarter"
    environment: str = "development"
    tz: str = "UTC"  # IANA time zone of the user, read from TZ
    # Development only: freeze the clock at this ISO 8601 time (e.g. 2026-10-14T17:30:00Z).
    # Used for reproducible screenshots (frontend/scripts/docs-screenshots.mjs).
    fake_now: str = ""
    gemini_api_key: str = ""  # optional: without it, AI features are disabled (docs/gemini.md)
    gemini_model: str = "gemini-3.5-flash-lite"
    # Health data source: auto | google | demo | none (see app/health_providers)
    health_provider: str = "auto"
    google_health_client_id: str = ""
    google_health_client_secret: str = ""
    google_health_refresh_token: str = ""

    @property
    def database_url(self) -> str:
        if self.db_url:
            return self.db_url
        if self.db_host:
            return URL.create(
                "postgresql",
                username=self.db_user,
                password=self.db_password,  # escaped by SQLAlchemy, any characters are fine
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
            ).render_as_string(hide_password=False)
        return "sqlite:///./dev.db"

    model_config = {"env_file": ".env", "env_prefix": ""}


settings = Settings()
