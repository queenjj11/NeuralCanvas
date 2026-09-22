from fastapi import APIRouter, HTTPException, Query, Response

from .. import db
from ..schemas import HistoryItem, PredictResponse

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryItem])
def list_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[HistoryItem]:
    """Recent inferences. Activations are omitted to keep the payload small."""
    return [HistoryItem(**row) for row in db.list_predictions(limit, offset)]


@router.get("/history/{prediction_id}", response_model=PredictResponse)
def get_history_item(prediction_id: int) -> PredictResponse:
    """Full stored payload, including layers, so the scene can replay it."""
    row = db.get_prediction(prediction_id)
    if row is None:
        raise HTTPException(status_code=404, detail="inference not found")
    return PredictResponse(**row)


@router.delete("/history", status_code=204)
def clear_history() -> Response:
    db.clear_predictions()
    return Response(status_code=204)
