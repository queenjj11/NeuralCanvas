"""Pydantic v2 request/response contracts."""

from __future__ import annotations

import math
from typing import Annotated, Any

from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str


class FeatureMeta(BaseModel):
    name: str
    unit: str
    min: float
    max: float
    mean: float
    std: float


class DatasetMeta(BaseModel):
    id: str
    name: str
    description: str
    architecture: list[int]
    task: str


class ModelResponse(BaseModel):
    dataset_id: str = "iris"
    name: str
    model_version: str
    architecture: list[int]
    activations: list[str]
    parameters: int
    test_accuracy: float
    classes: list[str]
    features: list[FeatureMeta]
    weights: list[list[list[float]]]
    biases: list[list[float]]
    activation_norm: dict[str, list[float]]
    max_abs_weight: float
    sample_presets: list[dict[str, Any]] = []


class PredictRequest(BaseModel):
    dataset: str = "iris"
    features: Annotated[list[float], Field(min_length=1, max_length=64)]

    @field_validator("features")
    @classmethod
    def finite_and_in_range(cls, v: list[float]) -> list[float]:
        from .config import get_settings

        s = get_settings()
        for i, value in enumerate(v):
            if not math.isfinite(value):
                raise ValueError(f"feature {i} must be a finite number")
            # For 4-feature input (Iris), enforce strict feature_hard_min/max
            if len(v) <= 4 and not (s.feature_hard_min <= value <= s.feature_hard_max):
                raise ValueError(
                    f"feature {i} must be between {s.feature_hard_min} "
                    f"and {s.feature_hard_max}"
                )
        return v


class Layer(BaseModel):
    name: str
    pre_activations: list[float] | None = None
    activations: list[float]


class PredictResponse(BaseModel):
    id: int
    timestamp: str
    prediction: str
    class_index: int
    confidence: float
    probabilities: list[float]
    features: list[float]
    layers: list[Layer]
    compute_ms: float
    model_version: str


class HistoryItem(BaseModel):
    id: int
    timestamp: str
    features: list[float]
    prediction: str
    class_index: int
    confidence: float
    compute_ms: float
    model_version: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
