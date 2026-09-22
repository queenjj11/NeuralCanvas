"""Environment-driven configuration (PRD 8.6)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_version: str = "1.0.0"
    frontend_origin: str = "http://localhost:3000"
    database_path: str = str(BASE_DIR / "artifacts" / "neuralcanvas.db")
    artifacts_dir: str = str(BASE_DIR / "artifacts")
    log_level: str = "INFO"
    rate_limit_predict: str = "30/minute"
    history_max_rows: int = 500
    # Hard limits for any feature value, in cm (PRD FR-2).
    feature_hard_min: float = 0.0
    feature_hard_max: float = 10.0

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
