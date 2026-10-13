"""Load a locally trained ETA model and provide a safe speed-based fallback."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import joblib

try:
    from .features import MODEL_FEATURE_COLUMNS, SCHEMA_VERSION, build_features
except ImportError:  # Support ``python src/predict.py`` from ai_ml/.
    from features import MODEL_FEATURE_COLUMNS, SCHEMA_VERSION, build_features

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "eta_model.joblib"
MAX_ETA_MINUTES = 240.0


@dataclass(frozen=True)
class EtaEstimate:
    eta_minutes: float
    source: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _speed_fallback(sample: dict[str, Any]) -> EtaEstimate | None:
    remaining = float(sample["remaining_distance_km"])
    if remaining == 0:
        return EtaEstimate(eta_minutes=0.0, source="distance_speed_fallback")

    current_speed = float(sample["current_speed_kmh"])
    route_speed = float(sample["route_average_speed_kmh"])
    # A near-zero GPS speed at a stop is noisy for ETA. Use the route's
    # configured historical average in that case, when available.
    usable_speed = current_speed if current_speed >= 5.0 else route_speed
    if usable_speed <= 0:
        return None
    minutes = remaining / usable_speed * 60
    return EtaEstimate(eta_minutes=round(min(minutes, MAX_ETA_MINUTES), 1), source="distance_speed_fallback")


def predict_eta(
    sample: dict[str, Any],
    model_path: Path = DEFAULT_MODEL_PATH,
) -> EtaEstimate | None:
    """Estimate minutes to destination; return ``None`` without usable speed.

    A trained model is used when present. Until then, the explicit fallback is
    remaining route distance divided by current or configured average speed.
    The caller must provide route-matched remaining distance and Manila-local
    time fields as described in ``ai_ml/README.md``.
    """
    features = build_features(sample)
    fallback = _speed_fallback(sample)
    if not model_path.is_file():
        return fallback

    bundle = joblib.load(model_path)
    if bundle.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("ETA model feature schema does not match this application")
    if bundle.get("feature_columns") != list(MODEL_FEATURE_COLUMNS):
        raise ValueError("ETA model feature order does not match this application")

    prediction = float(bundle["estimator"].predict(features)[0])
    if prediction < 0:
        prediction = 0.0
    return EtaEstimate(eta_minutes=round(min(prediction, MAX_ETA_MINUTES), 1), source="trained_model")


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remaining-km", type=float, required=True)
    parser.add_argument("--route-km", type=float, required=True)
    parser.add_argument("--current-speed-kmh", type=float, default=0)
    parser.add_argument("--route-average-speed-kmh", type=float, required=True)
    parser.add_argument("--elapsed-minutes", type=float, default=0)
    parser.add_argument("--hour", type=int, required=True, help="Hour in Asia/Manila, 0-23")
    parser.add_argument("--weekday", type=int, required=True, help="Monday=0 through Sunday=6")
    parser.add_argument("--returning", action="store_true")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()
    inputs = {
        "remaining_distance_km": args.remaining_km,
        "route_distance_km": args.route_km,
        "current_speed_kmh": args.current_speed_kmh,
        "route_average_speed_kmh": args.route_average_speed_kmh,
        "trip_elapsed_minutes": args.elapsed_minutes,
        "local_hour": args.hour,
        "day_of_week": args.weekday,
        "is_returning": int(args.returning),
    }
    result = predict_eta(inputs, args.model)
    print(json.dumps(result.as_dict() if result else None, indent=2))
