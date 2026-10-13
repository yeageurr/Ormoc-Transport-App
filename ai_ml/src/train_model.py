"""Train and evaluate the ETA regressor from real trip-progress snapshots."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, median_absolute_error

try:
    from .features import (
        GROUP_COLUMN,
        MODEL_FEATURE_COLUMNS,
        SCHEMA_VERSION,
        TARGET_COLUMN,
        build_features,
        validate_training_frame,
    )
except ImportError:  # Support ``python src/train_model.py`` from ai_ml/.
    from features import (
        GROUP_COLUMN,
        MODEL_FEATURE_COLUMNS,
        SCHEMA_VERSION,
        TARGET_COLUMN,
        build_features,
        validate_training_frame,
    )

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "trips_export.csv"
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "eta_model.joblib"
MIN_TRIPS = 30
MIN_SNAPSHOTS = 200


def train(data_path: Path, model_path: Path) -> dict[str, object]:
    try:
        raw = pd.read_csv(data_path)
    except pd.errors.EmptyDataError as error:
        raise ValueError(f"No ETA training rows found in {data_path}") from error
    if raw.empty:
        raise ValueError(f"No ETA training rows found in {data_path}")

    prepared = validate_training_frame(raw)
    trip_groups = raw[GROUP_COLUMN].astype(str)
    unique_trips = trip_groups.nunique()
    if unique_trips < MIN_TRIPS:
        raise ValueError(
            f"Need at least {MIN_TRIPS} distinct trips before training; found {unique_trips}."
        )
    if len(prepared) < MIN_SNAPSHOTS:
        raise ValueError(
            f"Need at least {MIN_SNAPSHOTS} valid progress snapshots; found {len(prepared)}."
        )

    x = build_features(raw)
    y = prepared[TARGET_COLUMN]
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_indices, validation_indices = next(splitter.split(x, y, groups=trip_groups))

    estimator = HistGradientBoostingRegressor(
        loss="absolute_error",
        learning_rate=0.06,
        max_iter=250,
        max_leaf_nodes=15,
        l2_regularization=1.0,
        random_state=42,
    )
    estimator.fit(x.iloc[train_indices], y.iloc[train_indices])
    validation_prediction = estimator.predict(x.iloc[validation_indices]).clip(0)
    metrics = {
        "validation_mae_minutes": round(float(mean_absolute_error(y.iloc[validation_indices], validation_prediction)), 2),
        "validation_median_absolute_error_minutes": round(float(median_absolute_error(y.iloc[validation_indices], validation_prediction)), 2),
        "training_trip_count": int(trip_groups.iloc[train_indices].nunique()),
        "validation_trip_count": int(trip_groups.iloc[validation_indices].nunique()),
        "snapshot_count": int(len(raw)),
    }

    # Refit on all eligible trips only after the held-out trip evaluation.
    estimator.fit(x, y)
    bundle = {
        "schema_version": SCHEMA_VERSION,
        "feature_columns": list(MODEL_FEATURE_COLUMNS),
        "estimator": estimator,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_path)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()
    metrics = train(args.data, args.model)
    print(json.dumps({"model_path": str(args.model), **metrics}, indent=2))


if __name__ == "__main__":
    main()
