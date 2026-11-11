import json
from typing import List, Literal, Optional

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application details
    PROJECT_NAME: str = "SupportDesk AI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    SECRET_KEY: str = Field(
        default="supportdesk-super-secret-jwt-key-2026",
        min_length=32,
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"),
    )
    FRONTEND_URL: str = Field(default="http://localhost:3000")

    # AI Config
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = Field(
        default="gemini-2.5-flash", description="Supported Gemini model identifier"
    )
    GEMINI_EMBEDDING_MODEL: str = Field(
        default="models/gemini-embedding-001", description="Gemini embedding model identifier"
    )

    # CORS
    BACKEND_CORS_ORIGINS: str | List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://localhost:8000",
        ],
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "ALLOWED_ORIGINS", "CORS_ORIGINS"),
    )
    CORS_ORIGIN_REGEX: Optional[str] = Field(
        default=None,
        description="Optional regex for allowed CORS origins (e.g. for scoped Vercel preview deployments)",
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5433/supportdesk"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK: bool = Field(
        default=False,
        description="Allow process-local in-memory nonce fallback strictly in development/testing. Hard-disabled in production.",
    )

    # Observability
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of requests traced
    ENABLE_METRICS: bool = True  # Expose /metrics endpoint

    # Security
    ALLOWED_HOSTS: str | List[str] = Field(default=["*"])
    MAX_REQUEST_SIZE_MB: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == "supportdesk-super-secret-jwt-key-2026":
                raise ValueError("SECRET_KEY must be changed in production")
            if "localhost" in self.DATABASE_URL:
                raise ValueError(
                    "DATABASE_URL must point to a production database in production environment"
                )
            if "localhost" in self.FRONTEND_URL:
                raise ValueError(
                    "FRONTEND_URL must point to a production frontend in production environment"
                )
            if "localhost" in self.REDIS_URL or "127.0.0.1" in self.REDIS_URL:
                raise ValueError(
                    "REDIS_URL must point to a production Redis instance in production environment"
                )
            if self.ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK:
                raise ValueError(
                    "ALLOW_IN_MEMORY_OAUTH_NONCE_FALLBACK cannot be enabled in production"
                )

        # Always trust FRONTEND_URL for CORS, even if BACKEND_CORS_ORIGINS
        # wasn't (re)configured after FRONTEND_URL was set — this is what
        # actually blocked login/signup in production: BACKEND_CORS_ORIGINS
        # still only listed the localhost defaults.
        if self.FRONTEND_URL not in self.BACKEND_CORS_ORIGINS:
            self.BACKEND_CORS_ORIGINS = [*self.BACKEND_CORS_ORIGINS, self.FRONTEND_URL]
        return self


settings = Settings()
