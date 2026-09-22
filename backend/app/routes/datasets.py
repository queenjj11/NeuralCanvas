from typing import Any
from fastapi import APIRouter, Query

from ..dataset_registry import get_registry
from ..model import get_model
from ..schemas import DatasetMeta

router = APIRouter(tags=["datasets"])


@router.get("/datasets", response_model=list[DatasetMeta])
def list_datasets() -> list[DatasetMeta]:
    """Returns list of all available classification datasets."""
    return [DatasetMeta(**d) for d in get_registry().get_datasets_list()]


@router.get("/samples")
def dataset_samples(dataset: str = Query("digits")) -> list[dict[str, Any]]:
    """Returns sample presets / digit samples for the given dataset."""
    model_bundle = get_model(dataset)
    return model_bundle.describe().get("sample_presets", [])
