from fastapi import APIRouter, Query

from ..model import get_model
from ..schemas import ModelResponse

router = APIRouter(tags=["model"])


@router.get("/model", response_model=ModelResponse)
def model_info(dataset: str = Query("iris")) -> ModelResponse:
    """Architecture, weights, biases and normalisation references for a dataset.

    Sent on initial load and when changing datasets. Defaults to 'iris'.
    """
    model_bundle = get_model(dataset)
    return ModelResponse(**model_bundle.describe())
