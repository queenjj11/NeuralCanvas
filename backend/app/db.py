"""SQLite persistence for inference history (PRD 8.5).

Parameterised queries only. The table is capped at `history_max_rows`; the
oldest rows are trimmed on insert so the demo database stays small.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at       TEXT    NOT NULL,
  features_json    TEXT    NOT NULL,
  prediction       TEXT    NOT NULL,
  class_index      INTEGER NOT NULL,
  confidence       REAL    NOT NULL,
  probabilities    TEXT    NOT NULL,
  activations_json TEXT    NOT NULL,
  compute_ms       REAL    NOT NULL,
  model_version    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_predictions_created
  ON predictions (created_at DESC);
"""


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    path = Path(get_settings().database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def insert_prediction(
    *,
    created_at: str,
    features: list[float],
    prediction: str,
    class_index: int,
    confidence: float,
    probabilities: list[float],
    layers: list[dict[str, Any]],
    compute_ms: float,
    model_version: str,
) -> int:
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO predictions (
              created_at, features_json, prediction, class_index, confidence,
              probabilities, activations_json, compute_ms, model_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                json.dumps(features),
                prediction,
                class_index,
                confidence,
                json.dumps(probabilities),
                json.dumps(layers),
                compute_ms,
                model_version,
            ),
        )
        new_id = int(cur.lastrowid)
        conn.execute(
            """
            DELETE FROM predictions
            WHERE id NOT IN (
              SELECT id FROM predictions ORDER BY id DESC LIMIT ?
            )
            """,
            (get_settings().history_max_rows,),
        )
        return new_id


def list_predictions(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, features_json, prediction, class_index,
                   confidence, compute_ms, model_version
            FROM predictions
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "timestamp": r["created_at"],
            "features": json.loads(r["features_json"]),
            "prediction": r["prediction"],
            "class_index": r["class_index"],
            "confidence": r["confidence"],
            "compute_ms": r["compute_ms"],
            "model_version": r["model_version"],
        }
        for r in rows
    ]


def get_prediction(prediction_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM predictions WHERE id = ?", (prediction_id,)
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "timestamp": row["created_at"],
        "features": json.loads(row["features_json"]),
        "prediction": row["prediction"],
        "class_index": row["class_index"],
        "confidence": row["confidence"],
        "probabilities": json.loads(row["probabilities"]),
        "layers": json.loads(row["activations_json"]),
        "compute_ms": row["compute_ms"],
        "model_version": row["model_version"],
    }


def clear_predictions() -> None:
    with connect() as conn:
        conn.execute("DELETE FROM predictions")


def count_predictions() -> int:
    with connect() as conn:
        return int(conn.execute("SELECT COUNT(*) AS c FROM predictions").fetchone()["c"])
