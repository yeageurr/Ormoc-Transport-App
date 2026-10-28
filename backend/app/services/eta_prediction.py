"""ETA inference shared by the API and the offline ML prediction command.

With no trained artifact, this returns an explicitly labeled distance/speed
baseline. Optional data-science dependencies are imported only when a model
artifact is configured and present.
"""

from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
FEATURE_COLUMNS = (
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
MAX_ETA_MINUTES = 240.0
DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[3] / "ai_ml" / "models" / "eta_model.joblib"


@dataclass(frozen=True)
class EtaEstimate:
  eta_minutes: float
  source: str

  def as_dict(self) -> dict[str, Any]:
    return asdict(self)


def _number(sample: dict[str, Any], key: str, *, minimum: float = 0) -> float:
  try:
    value = float(sample[key])
  except (KeyError, TypeError, ValueError) as error:
    raise ValueError(f"Missing or invalid ETA input: {key}") from error
  if not math.isfinite(value) or value < minimum:
    raise ValueError(f"ETA input {key} must be finite and at least {minimum}")
  return value


def _features(sample: dict[str, Any]) -> dict[str, float]:
  remaining = _number(sample, "remaining_distance_km")
  route_distance = _number(sample, "route_distance_km", minimum=0.000001)
  current_speed = _number(sample, "current_speed_kmh")
  route_speed = _number(sample, "route_average_speed_kmh")
  elapsed = _number(sample, "trip_elapsed_minutes")
  hour = _number(sample, "local_hour")
  weekday = _number(sample, "day_of_week")
  returning = _number(sample, "is_returning")
  if remaining > route_distance * 1.05:
    raise ValueError("remaining_distance_km cannot exceed route_distance_km")
  if hour > 23 or not hour.is_integer() or weekday > 6 or not weekday.is_integer():
    raise ValueError("ETA local_hour or day_of_week is out of range")
  if returning not in (0, 1):
    raise ValueError("is_returning must be 0 or 1")

  hour_angle = 2 * math.pi * hour / 24
  weekday_angle = 2 * math.pi * weekday / 7
  return {
    "remaining_distance_km": remaining,
    "route_distance_km": route_distance,
    "remaining_route_fraction": min(1.0, max(0.0, remaining / route_distance)),
    "current_speed_kmh": current_speed,
    "route_average_speed_kmh": route_speed,
    "trip_elapsed_minutes": elapsed,
    "local_hour_sin": math.sin(hour_angle),
    "local_hour_cos": math.cos(hour_angle),
    "day_of_week_sin": math.sin(weekday_angle),
    "day_of_week_cos": math.cos(weekday_angle),
    "is_returning": returning,
  }


def predict_eta(sample: dict[str, Any], model_path: Path | None = None) -> EtaEstimate | None:
  """Predict minutes remaining, using the trained model when available.

  Otherwise use a clearly identified route-distance/speed baseline. A paused
  or near-stationary GPS speed falls back to configured route average speed.
  """
  model_path = model_path or Path(os.getenv("ETA_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
  features = _features(sample)
  remaining = features["remaining_distance_km"]
  if remaining <= 0:
    return EtaEstimate(0.0, "distance_speed_fallback")

  current_speed = features["current_speed_kmh"]
  route_speed = features["route_average_speed_kmh"]
  usable_speed = current_speed if current_speed >= 5.0 else route_speed
  fallback = (
    EtaEstimate(round(min(remaining / usable_speed * 60, MAX_ETA_MINUTES), 1), "distance_speed_fallback")
    if usable_speed > 0 else None
  )
  if not model_path.is_file():
    return fallback

  # No training/serving stack is required until an artifact is actually
  # supplied. Deploy ai_ml/requirements.txt with the backend when enabling it.
  try:
    import joblib
    import pandas as pd
  except ImportError:
    return fallback

  try:
    bundle = joblib.load(model_path)
  except ImportError:
    # A model artifact may have been copied without installing the optional
    # sklearn runtime. Continue serving the documented baseline in that case.
    return fallback
  if bundle.get("schema_version") != SCHEMA_VERSION:
    raise ValueError("ETA model feature schema does not match this application")
  if bundle.get("feature_columns") != list(FEATURE_COLUMNS):
    raise ValueError("ETA model feature order does not match this application")
  frame = pd.DataFrame([[features[column] for column in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
  prediction = max(0.0, float(bundle["estimator"].predict(frame)[0]))
  return EtaEstimate(round(min(prediction, MAX_ETA_MINUTES), 1), "trained_model")
