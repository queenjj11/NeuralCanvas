"""Train all 5 dataset MLPs deterministically and emit deployment artifacts.

Run: python train.py

Produces:
  artifacts/iris/    (4 -> 6 -> 4 -> 3)
  artifacts/wine/    (13 -> 16 -> 10 -> 3)
  artifacts/digits/  (8 -> 16 -> 12 -> 10, PCA 64->8)
  artifacts/moons/   (2 -> 8 -> 8 -> 2)
  artifacts/circles/ (2 -> 8 -> 8 -> 2)
  artifacts/          (Iris fallback)
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.decomposition import PCA
from sklearn.datasets import load_digits, load_iris, load_wine, make_circles, make_moons
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

ARTIFACTS = Path(__file__).parent / "artifacts"
RANDOM_STATE = 42


def hidden_activations(clf: MLPClassifier, X_std: np.ndarray) -> list[np.ndarray]:
    """ReLU activations for every hidden layer, shape (n_samples, n_units)."""
    out: list[np.ndarray] = []
    a = X_std
    for i, (W, b) in enumerate(zip(clf.coefs_, clf.intercepts_)):
        z = a @ W + b
        if i < len(clf.coefs_) - 1:
            a = np.maximum(z, 0.0)
            out.append(a)
        else:
            break
    return out


def model_version(coefs: list[np.ndarray], intercepts: list[np.ndarray]) -> str:
    h = hashlib.sha256()
    for arr in list(coefs) + list(intercepts):
        h.update(np.ascontiguousarray(np.asarray(arr, dtype=np.float64)).tobytes())
    return h.hexdigest()[:7]


def train_dataset(
    dataset_id: str,
    name: str,
    description: str,
    X: np.ndarray,
    y: np.ndarray,
    hidden_layer_sizes: tuple[int, ...],
    class_labels: list[str],
    feature_meta: list[tuple[str, str]],
    pca_transform: bool = False,
    sample_presets: list[dict[str, Any]] | None = None,
    force_multiclass: bool = False,
) -> dict[str, Any]:
    dest_dir = ARTIFACTS / dataset_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    pca = None
    if pca_transform:
        # For Digits: 64 pixels -> 8 PCA components
        pca = PCA(n_components=8, random_state=RANDOM_STATE)
        X_pca = pca.fit_transform(X)
        X_used = X_pca
    else:
        X_used = X

    if force_multiclass and len(class_labels) == 2:
        y_fit = np.eye(2)[y]
    else:
        y_fit = y

    X_train, X_test, y_train, y_test = train_test_split(
        X_used, y_fit, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    scaler = StandardScaler().fit(X_train)
    X_train_std = scaler.transform(X_train)
    X_test_std = scaler.transform(X_test)

    clf = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation="relu",
        solver="adam",
        max_iter=2500,
        random_state=RANDOM_STATE,
    ).fit(X_train_std, y_train)

    train_accuracy = float(clf.score(X_train_std, y_train))
    test_accuracy = float(clf.score(X_test_std, y_test))

    architecture = [X_used.shape[1]] + list(hidden_layer_sizes) + [len(class_labels)]
    parameters = int(
        sum(np.asarray(W).size for W in clf.coefs_)
        + sum(np.asarray(b).size for b in clf.intercepts_)
    )

    # Reference maxima for stable display normalisation.
    acts = hidden_activations(clf, X_train_std)
    activation_norm = {}
    for i, layer_acts in enumerate(acts):
        p95 = np.percentile(layer_acts, 95, axis=0)
        activation_norm[f"hidden_{i + 1}"] = [
            float(max(v, 1e-3)) for v in np.round(p95, 4)
        ]

    features_info = []
    for i, (fname, unit) in enumerate(feature_meta):
        features_info.append({
            "name": fname,
            "unit": unit,
            "min": float(round(X_used[:, i].min(), 3)),
            "max": float(round(X_used[:, i].max(), 3)),
            "mean": float(round(scaler.mean_[i], 4)),
            "std": float(round(scaler.scale_[i], 4)),
        })

    payload = {
        "dataset_id": dataset_id,
        "name": name,
        "description": description,
        "model_version": model_version(clf.coefs_, clf.intercepts_),
        "architecture": architecture,
        "activations": ["relu"] * len(hidden_layer_sizes) + ["softmax"],
        "parameters": parameters,
        "train_accuracy": round(train_accuracy, 4),
        "test_accuracy": round(test_accuracy, 4),
        "classes": class_labels,
        "features": features_info,
        "weights": [np.asarray(W).tolist() for W in clf.coefs_],
        "biases": [np.asarray(b).tolist() for b in clf.intercepts_],
        "activation_norm": activation_norm,
        "sample_presets": sample_presets or [],
    }

    joblib_data = {"scaler": scaler, "clf": clf}
    if pca is not None:
        joblib_data["pca"] = pca

    joblib.dump(joblib_data, dest_dir / "model.joblib")
    (dest_dir / "model_weights.json").write_text(json.dumps(payload, indent=2))

    # Also save as root fallback if dataset_id is iris
    if dataset_id == "iris":
        joblib.dump(joblib_data, ARTIFACTS / "model.joblib")
        (ARTIFACTS / "model_weights.json").write_text(json.dumps(payload, indent=2))

    print(f"[{dataset_id.upper()}] {name}")
    print(f"  architecture   {' -> '.join(map(str, architecture))}")
    print(f"  parameters     {parameters}")
    print(f"  train acc      {train_accuracy:.4f}")
    print(f"  test acc       {test_accuracy:.4f}")
    print(f"  model_version  {payload['model_version']}")
    print(f"  artifacts      {dest_dir}\n")

    return payload


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    # 1. IRIS (4 -> 6 -> 4 -> 3)
    iris = load_iris()
    train_dataset(
        dataset_id="iris",
        name="Iris Classification",
        description="Botanical classification of Iris flowers into Setosa, Versicolor, and Virginica.",
        X=iris.data,
        y=iris.target,
        hidden_layer_sizes=(6, 4),
        class_labels=["Iris-setosa", "Iris-versicolor", "Iris-virginica"],
        feature_meta=[
            ("Sepal length", "cm"),
            ("Sepal width", "cm"),
            ("Petal length", "cm"),
            ("Petal width", "cm"),
        ],
        sample_presets=[
            {"label": "Setosa", "values": [5.1, 3.5, 1.4, 0.2]},
            {"label": "Versicolor", "values": [6.4, 3.2, 4.5, 1.5]},
            {"label": "Virginica", "values": [6.3, 3.3, 6.0, 2.5]},
        ],
    )

    # 2. WINE (13 -> 16 -> 10 -> 3)
    wine = load_wine()
    wine_feature_names = [
        "Alcohol", "Malic acid", "Ash", "Alcalinity of ash", "Magnesium",
        "Total phenols", "Flavanoids", "Nonflavanoid phenols", "Proanthocyanins",
        "Color intensity", "Hue", "OD280/OD315", "Proline"
    ]
    wine_presets = []
    for c in range(3):
        idx = np.where(wine.target == c)[0][0]
        wine_presets.append({
            "label": f"Class {c + 1}",
            "values": [round(float(v), 2) for v in wine.data[idx]],
        })

    train_dataset(
        dataset_id="wine",
        name="Wine Classification",
        description="Chemical analysis of wines grown in the same region in Italy derived from three cultivars.",
        X=wine.data,
        y=wine.target,
        hidden_layer_sizes=(16, 10),
        class_labels=["Class 1", "Class 2", "Class 3"],
        feature_meta=[(f, "unit") for f in wine_feature_names],
        sample_presets=wine_presets,
    )

    # 3. DIGITS (8 -> 16 -> 12 -> 10) PCA 64->8
    digits = load_digits()
    pca = PCA(n_components=8, random_state=RANDOM_STATE)
    X_digits_pca = pca.fit_transform(digits.data)

    digit_samples = []
    for digit in range(10):
        idx = np.where(digits.target == digit)[0][0]
        raw_px = digits.data[idx].tolist()
        pca_feat = [round(float(v), 3) for v in X_digits_pca[idx]]
        digit_samples.append({
            "digit": digit,
            "raw_features": raw_px,
            "pca_features": pca_feat,
        })

    train_dataset(
        dataset_id="digits",
        name="Digits Classification",
        description="Handwritten optical digit recognition (0-9) using 8 PCA components.",
        X=digits.data,
        y=digits.target,
        hidden_layer_sizes=(16, 12),
        class_labels=[str(i) for i in range(10)],
        feature_meta=[(f"PCA {i + 1}", "comp") for i in range(8)],
        pca_transform=True,
        sample_presets=digit_samples,
    )

    # 4. TWO MOONS (2 -> 8 -> 8 -> 2)
    X_moons, y_moons = make_moons(n_samples=300, noise=0.2, random_state=RANDOM_STATE)
    moon_a_idx = np.where(y_moons == 0)[0][0]
    moon_b_idx = np.where(y_moons == 1)[0][0]
    moons_presets = [
        {"label": "Moon A", "values": [round(float(v), 3) for v in X_moons[moon_a_idx]]},
        {"label": "Moon B", "values": [round(float(v), 3) for v in X_moons[moon_b_idx]]},
    ]

    train_dataset(
        dataset_id="moons",
        name="Two-Moons Classification",
        description="Synthetic 2D dataset forming two interleaving crescent moon shapes.",
        X=X_moons,
        y=y_moons,
        hidden_layer_sizes=(8, 8),
        class_labels=["Moon A", "Moon B"],
        feature_meta=[("X", "coord"), ("Y", "coord")],
        sample_presets=moons_presets,
        force_multiclass=True,
    )

    # 5. CONCENTRIC CIRCLES (2 -> 8 -> 8 -> 2)
    X_circles, y_circles = make_circles(n_samples=300, noise=0.1, factor=0.5, random_state=RANDOM_STATE)
    inner_idx = np.where(y_circles == 1)[0][0]
    outer_idx = np.where(y_circles == 0)[0][0]
    circles_presets = [
        {"label": "Inner Circle", "values": [round(float(v), 3) for v in X_circles[inner_idx]]},
        {"label": "Outer Circle", "values": [round(float(v), 3) for v in X_circles[outer_idx]]},
    ]

    train_dataset(
        dataset_id="circles",
        name="Concentric Circles",
        description="Synthetic 2D dataset containing a small circle inside a larger circle.",
        X=X_circles,
        y=y_circles,
        hidden_layer_sizes=(8, 8),
        class_labels=["Inner Circle", "Outer Circle"],
        feature_meta=[("X", "coord"), ("Y", "coord")],
        sample_presets=circles_presets,
        force_multiclass=True,
    )


if __name__ == "__main__":
    main()
