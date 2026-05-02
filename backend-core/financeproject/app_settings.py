from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


class AppSettings(BaseSettings):
    """Configuration loaded from the environment and optional `backend-core/.env`."""

    model_config = SettingsConfigDict(
        env_file=_BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    SECRET_KEY: str | None = None

    DB_NAME: str | None = None
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_HOST: str | None = None
    DB_PORT: str | None = None

    JWT_ACCESS_TOKEN_LIFETIME_MINUTES: int = 60
    JWT_REFRESH_TOKEN_LIFETIME_HOURS: int = 48


APP_SETTINGS = AppSettings()
