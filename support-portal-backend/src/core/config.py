from typing import List, Literal, Optional
import json

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application details
    PROJECT_NAME: str = "SupportDesk AI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    SECRET_KEY: str = Field(default="supportdesk-super-secret-jwt-key-2026", min_length=32)
    FRONTEND_URL: str = Field(default="http://localhost:3000")

    # CORS
    BACKEND_CORS_ORIGINS: str | List[str] = Field(default=["http://localhost:3000", "http://localhost:8000"])

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5433/supportdesk"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:16379/0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

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
                raise ValueError("DATABASE_URL must point to a production database in production environment")
            if "localhost" in self.FRONTEND_URL:
                raise ValueError("FRONTEND_URL must point to a production frontend in production environment")
        return self


settings = Settings()
