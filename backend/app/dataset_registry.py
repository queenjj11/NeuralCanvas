"""Registry for multi-dataset support in NeuralCanvas backend."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .model import ModelBundle

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"

DATASETS_CONFIG: list[dict[str, Any]] = [
    {
        "id": "iris",
        "name": "Iris Classification",
        "description": "Botanical classification of Iris flowers into Setosa, Versicolor, and Virginica.",
        "architecture": [4, 6, 4, 3],
        "task": "classification",
    },
    {
        "id": "wine",
        "name": "Wine Classification",
        "description": "Chemical analysis of wines grown in the same region in Italy derived from three cultivars.",
        "architecture": [13, 16, 10, 3],
        "task": "classification",
    },
    {
        "id": "digits",
        "name": "Digits Classification",
        "description": "Handwritten optical digit recognition (0-9) using 8 PCA components.",
        "architecture": [8, 16, 12, 10],
        "task": "classification",
    },
    {
        "id": "moons",
        "name": "Two-Moons Classification",
        "description": "Synthetic 2D dataset forming two interleaving crescent moon shapes.",
        "architecture": [2, 8, 8, 2],
        "task": "classification",
    },
    {
        "id": "circles",
        "name": "Concentric Circles",
        "description": "Synthetic 2D dataset containing a small circle inside a larger circle.",
        "architecture": [2, 8, 8, 2],
        "task": "classification",
    },
]


class DatasetRegistry:
    def __init__(self, base_artifacts_dir: str | Path = ARTIFACTS_DIR) -> None:
        self.base_dir = Path(base_artifacts_dir)
        self._bundles: dict[str, ModelBundle] = {}

    def get_datasets_list(self) -> list[dict[str, Any]]:
        return DATASETS_CONFIG

    def get_bundle(self, dataset_id: str = "iris") -> ModelBundle:
        dataset_id = dataset_id.lower().strip()
        valid_ids = [d["id"] for d in DATASETS_CONFIG]
        if dataset_id not in valid_ids:
            dataset_id = "iris"  # fallback default

        if dataset_id not in self._bundles:
            from .model import ModelBundle

            # Directory: artifacts/{dataset_id} or fallback to artifacts root
            target_dir = self.base_dir / dataset_id
            if not target_dir.exists():
                target_dir = self.base_dir

            self._bundles[dataset_id] = ModelBundle(target_dir)

        return self._bundles[dataset_id]


_registry: DatasetRegistry | None = None


def get_registry() -> DatasetRegistry:
    global _registry
    if _registry is None:
        _registry = DatasetRegistry()
    return _registry
