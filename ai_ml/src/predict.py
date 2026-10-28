"""Local CLI wrapper around the same ETA inference used by FastAPI."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PROJECT_ROOT.parent
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "eta_model.joblib"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.eta_prediction import EtaEstimate, predict_eta as _predict_eta  # noqa: E402


def predict_eta(
  sample: dict[str, Any],
  model_path: Path = DEFAULT_MODEL_PATH,
) -> EtaEstimate | None:
  return _predict_eta(sample, model_path)


if __name__ == "__main__":
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
