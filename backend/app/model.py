"""Model loading, forward pass with activation capture, and model metadata."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np


class ModelBundle:
    def __init__(self, artifacts_dir: str | Path) -> None:
        artifacts = Path(artifacts_dir)
        bundle = joblib.load(artifacts / "model.joblib")
        self.scaler = bundle["scaler"]
        self.clf = bundle["clf"]
        self.pca = bundle.get("pca")
        self.meta: dict[str, Any] = json.loads(
            (artifacts / "model_weights.json").read_text()
        )

        self.coefs = [np.asarray(W, dtype=np.float64) for W in self.clf.coefs_]
        self.biases = [np.asarray(b, dtype=np.float64) for b in self.clf.intercepts_]

        self.parameters = int(
            sum(W.size for W in self.coefs) + sum(b.size for b in self.biases)
        )
        self.architecture = [self.coefs[0].shape[0]] + [W.shape[1] for W in self.coefs]
        self.classes: list[str] = self.meta["classes"]
        self.model_version: str = self.meta["model_version"]
        self.max_abs_weight = float(max(np.abs(W).max() for W in self.coefs))
        self.dataset_id: str = self.meta.get("dataset_id", "iris")

    def forward(self, x_raw: list[float]) -> dict[str, Any]:
        """Standardise, propagate, and capture every intermediate layer."""
        started = time.perf_counter()

        arr_raw = np.asarray(x_raw, dtype=np.float64)

        # Handle PCA transformation if input is 64 raw pixels (e.g. Digits dataset)
        if self.pca is not None and arr_raw.shape[0] == 64:
            arr_pca = self.pca.transform([arr_raw])[0]
            x_input = arr_pca
        else:
            x_input = arr_raw

        x = self.scaler.transform([x_input])[0]
        layers: list[dict[str, Any]] = [
            {"name": "input", "pre_activations": None, "activations": x.tolist()}
        ]

        a = x
        n = len(self.coefs)
        for i, (W, b) in enumerate(zip(self.coefs, self.biases)):
            z = a @ W + b
            if i < n - 1:
                a = np.maximum(z, 0.0)
                name = f"hidden_{i + 1}"
            else:
                name = "output"
                out_act = getattr(self.clf, "out_activation_", "softmax")
                if out_act == "logistic":
                    a = 1.0 / (1.0 + np.exp(-z))
                    if len(a) == 1:
                        a = np.array([1.0 - a[0], a[0]])
                else:
                    e = np.exp(z - z.max())
                    a = e / e.sum()
            layers.append(
                {
                    "name": name,
                    "pre_activations": z.tolist(),
                    "activations": a.tolist(),
                }
            )

        compute_ms = (time.perf_counter() - started) * 1000.0
        probabilities = a
        class_index = int(np.argmax(probabilities))

        return {
            "layers": layers,
            "probabilities": probabilities.tolist(),
            "class_index": class_index,
            "prediction": self.classes[class_index],
            "confidence": float(probabilities[class_index]),
            "compute_ms": round(compute_ms, 4),
            "model_version": self.model_version,
            "dataset_id": self.dataset_id,
        }

    def describe(self) -> dict[str, Any]:
        """Payload for GET /api/model."""
        return {
            "dataset_id": self.dataset_id,
            "name": self.meta["name"],
            "model_version": self.model_version,
            "architecture": self.architecture,
            "activations": self.meta["activations"],
            "parameters": self.parameters,
            "test_accuracy": self.meta["test_accuracy"],
            "classes": self.classes,
            "features": self.meta["features"],
            "weights": [W.tolist() for W in self.coefs],
            "biases": [b.tolist() for b in self.biases],
            "activation_norm": self.meta["activation_norm"],
            "max_abs_weight": self.max_abs_weight,
            "sample_presets": self.meta.get("sample_presets", []),
        }


def get_model(dataset_id: str = "iris") -> ModelBundle:
    from .dataset_registry import get_registry

    return get_registry().get_bundle(dataset_id)


def is_loaded(dataset_id: str = "iris") -> bool:
    try:
        get_model(dataset_id)
        return True
    except Exception:
        return False
