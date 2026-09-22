from fastapi import APIRouter

from ..config import get_settings
from ..model import get_model, is_loaded
from ..schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    loaded = is_loaded()
    if not loaded:
        try:
            get_model()
            loaded = True
        except Exception:  # noqa: BLE001 - health must never raise
            loaded = False
    return HealthResponse(
        status="ok" if loaded else "degraded",
        model_loaded=loaded,
        version=get_settings().app_version,
    )
