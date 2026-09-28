from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ============================================================
    # Application
    # ============================================================
    APP_NAME: str = "PortSynAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ============================================================
    # Database
    # ============================================================
    DATABASE_URL: str

    # ============================================================
    # JWT / Authentication
    # ============================================================
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ============================================================
    # File Storage
    # ============================================================
    STORAGE_DIR: str = "storage"

    # Maximum allowed inspection image upload size in MB
    MAX_UPLOAD_IMAGE_MB: int = 10

    # ============================================================
    # CORS
    # ============================================================
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # ============================================================
    # Pydantic Settings Configuration
    # ============================================================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()