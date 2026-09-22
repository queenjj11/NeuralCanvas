from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from .. import db
from ..config import get_settings
from ..model import get_model
from ..schemas import PredictRequest, PredictResponse
from ..rate_limit import limiter

router = APIRouter(tags=["inference"])


@router.post("/predict", response_model=PredictResponse)
@limiter.limit(get_settings().rate_limit_predict)
def predict(request: Request, payload: PredictRequest) -> PredictResponse:
    dataset_id = payload.dataset or "iris"
    model = get_model(dataset_id)

    expected = model.architecture[0]
    num_given = len(payload.features)

    # For Digits: raw 64 pixels or 8 PCA components are both valid inputs!
    if dataset_id == "digits" and (num_given == 64 or num_given == 8):
        pass
    elif num_given != expected:
        raise HTTPException(
            status_code=422,
            detail=f"expected {expected} features, received {num_given}",
        )

    result = model.forward(payload.features)
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )

    new_id = db.insert_prediction(
        created_at=timestamp,
        features=payload.features,
        prediction=result["prediction"],
        class_index=result["class_index"],
        confidence=result["confidence"],
        probabilities=result["probabilities"],
        layers=result["layers"],
        compute_ms=result["compute_ms"],
        model_version=result["model_version"],
    )

    return PredictResponse(
        id=new_id,
        timestamp=timestamp,
        features=payload.features,
        **{
            k: result[k]
            for k in (
                "prediction",
                "class_index",
                "confidence",
                "probabilities",
                "layers",
                "compute_ms",
                "model_version",
            )
        },
    )
