from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. Fails fast at import if any required var is missing."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Runtime
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)
    APP_LOG_LEVEL: str = Field(default="INFO")

    # Database
    DATABASE_URL: str

    # Redis (Upstash)
    REDIS_URL: str

    # Clerk
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWKS_URL: str

    # Google Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash-native-audio-preview-12-2025"
    GEMINI_VOICE_NAME: str = "Aoede"
    GEMINI_LANGUAGE: str = "ar-EG"

    # Supabase Storage
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # CORS — NoDecode disables pydantic-settings' default JSON parsing so the
    # validator below sees the raw string value and can split on commas.
    CORS_ALLOW_ORIGINS: Annotated[list[str], NoDecode] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",  # Vite dev server (apps/web)
            "http://localhost:5174",  # Vite dev server (apps/admin)
            "http://localhost:8081",  # Expo dev server (apps/mobile)
        ]
    )

    @field_validator("CORS_ALLOW_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: object) -> object:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v


settings = Settings()  # type: ignore[call-arg]
