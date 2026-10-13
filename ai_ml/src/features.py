"""Feature schema and validation for driver ETA training and inference."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import numpy as np
import pandas as pd

SCHEMA_VERSION = 1
TARGET_COLUMN = "eta_remaining_minutes"
GROUP_COLUMN = "trip_id"
REQUIRED_INPUT_COLUMNS = (
    "remaining_distance_km",
    "route_distance_km",
    "current_speed_kmh",
    "route_average_speed_kmh",
    "trip_elapsed_minutes",
    "local_hour",
    "day_of_week",
    "is_returning",
)
MODEL_FEATURE_COLUMNS = (
    "remaining_distance_km",
    "route_distance_km",
    "remaining_route_fraction",
    "current_speed_kmh",
    "route_average_speed_kmh",
    "trip_elapsed_minutes",
    "local_hour_sin",
    "local_hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "is_returning",
)


def build_features(rows: pd.DataFrame | Mapping[str, Any]) -> pd.DataFrame:
    """Validate raw ETA inputs and return model-ready numeric features.

    ``local_hour`` and ``day_of_week`` must use the Ormoc/Asia-Manila clock.
    ``remaining_distance_km`` must come from matching the live GPS position to
    the assigned route geometry; straight-line distance is not suitable.
    """
    frame = rows.copy() if isinstance(rows, pd.DataFrame) else pd.DataFrame([rows])
    missing = [column for column in REQUIRED_INPUT_COLUMNS if column not in frame]
    if missing:
        raise ValueError(f"Missing ETA input columns: {', '.join(missing)}")

    frame = frame.loc[:, REQUIRED_INPUT_COLUMNS].copy()
    for column in REQUIRED_INPUT_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    if frame.isna().any().any():
        bad_columns = frame.columns[frame.isna().any()].tolist()
        raise ValueError(f"ETA inputs contain missing or non-numeric values: {', '.join(bad_columns)}")

    numeric = frame.drop(columns="is_returning").to_numpy(dtype=float)
    if not np.isfinite(numeric).all():
        raise ValueError("ETA inputs must be finite numbers")
    if (frame[["remaining_distance_km", "route_distance_km", "current_speed_kmh", "route_average_speed_kmh", "trip_elapsed_minutes"]] < 0).any().any():
        raise ValueError("Distance, speed, and elapsed-time inputs cannot be negative")
    if (frame["route_distance_km"] <= 0).any():
        raise ValueError("route_distance_km must be greater than zero")
    if (frame["remaining_distance_km"] > frame["route_distance_km"] * 1.05).any():
        raise ValueError("remaining_distance_km cannot exceed the assigned route distance")
    if not frame["local_hour"].between(0, 23).all():
        raise ValueError("local_hour must be between 0 and 23")
    if not frame["day_of_week"].between(0, 6).all():
        raise ValueError("day_of_week must be between 0 (Monday) and 6 (Sunday)")
    if not frame["is_returning"].isin([0, 1, False, True]).all():
        raise ValueError("is_returning must be 0 or 1")

    hour_angle = 2 * np.pi * frame["local_hour"] / 24
    weekday_angle = 2 * np.pi * frame["day_of_week"] / 7
    features = pd.DataFrame(index=frame.index)
    features["remaining_distance_km"] = frame["remaining_distance_km"]
    features["route_distance_km"] = frame["route_distance_km"]
    features["remaining_route_fraction"] = (
        frame["remaining_distance_km"] / frame["route_distance_km"]
    ).clip(0, 1)
    features["current_speed_kmh"] = frame["current_speed_kmh"]
    features["route_average_speed_kmh"] = frame["route_average_speed_kmh"]
    features["trip_elapsed_minutes"] = frame["trip_elapsed_minutes"]
    features["local_hour_sin"] = np.sin(hour_angle)
    features["local_hour_cos"] = np.cos(hour_angle)
    features["day_of_week_sin"] = np.sin(weekday_angle)
    features["day_of_week_cos"] = np.cos(weekday_angle)
    features["is_returning"] = frame["is_returning"].astype(int)
    return features.loc[:, MODEL_FEATURE_COLUMNS].astype(float)


def validate_training_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Check training identifiers/target and return rows with valid features."""
    missing = [column for column in (GROUP_COLUMN, TARGET_COLUMN) if column not in frame]
    if missing:
        raise ValueError(f"Training CSV is missing required columns: {', '.join(missing)}")
    features = build_features(frame)
    targets = pd.to_numeric(frame[TARGET_COLUMN], errors="coerce")
    if targets.isna().any() or not np.isfinite(targets.to_numpy(dtype=float)).all():
        raise ValueError(f"{TARGET_COLUMN} must contain finite numeric values")
    if (targets < 0).any():
        raise ValueError(f"{TARGET_COLUMN} cannot be negative")
    if frame[GROUP_COLUMN].isna().any():
        raise ValueError(f"{GROUP_COLUMN} cannot be empty")
    return features.assign(**{TARGET_COLUMN: targets.to_numpy()})
