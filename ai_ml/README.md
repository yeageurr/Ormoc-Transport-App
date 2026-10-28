# ETA prediction workspace

This folder owns ETA data export, feature preparation, model training, and local inference. The backend now exposes the authenticated ETA endpoint and shares its inference service with the local prediction command. It uses a transparent fallback until a trained artifact is available.

## Current data status

No ETA export or trained model exists yet. The exporter creates `data/trips_export.csv` when run; generated exports and model binaries are git-ignored because the export contains sensitive location history. The Driver app now displays an explicitly labeled distance/speed baseline when a fresh GPS fix and route geometry are available; it is not presented as a trained ML result. Do not use fabricated or synthetic rows to claim model accuracy.

The active trip screen writes authenticated GPS fixes to `gps_logs` about every five seconds while foregrounded. Upload failures are dropped, so some trips may have incomplete trails. The exporter supports both current direct route-based trips and legacy dispatch-linked trips. Training still needs enough completed trips with usable GPS snapshots, route geometry, and arrival times.

## Layout

- `data/trips_export.csv`: generated historical route-progress snapshots; do not commit personal identifiers or raw account data.
- `src/export_training_data.py`: reads completed trips and their persisted GPS logs from the configured backend database, map-matches each fix to the assigned route geometry, and computes the remaining-time target.
- `src/features.py`: single source of truth for input validation and engineered model features.
- `src/train_model.py`: trip-grouped holdout evaluation, training, and versioned `joblib` artifact output.
- `src/predict.py`: calls the same inference service as FastAPI, loading a compatible local model when one exists, otherwise returning a transparent distance/speed estimate.
- `models/`: generated trained artifacts; no trained model is checked in yet.
- `notebooks/`: optional exploratory analysis after real data accumulates.

## Snapshot data contract

The CSV contains one row per GPS fix during a completed trip. `trip_id` is used only to keep all snapshots from one trip together when creating the validation split. `route_id` and `recorded_at` are retained for auditing and are not model inputs.

Required columns:

| Column | Meaning |
| --- | --- |
| `trip_id` | Completed trip grouping key |
| `route_id` | Assigned route key for audit |
| `recorded_at` | UTC ISO timestamp of the GPS sample |
| `remaining_distance_km` | Distance still to travel along the assigned route geometry |
| `route_distance_km` | Configured route distance |
| `current_speed_kmh` | Speed reported by the GPS sample |
| `route_average_speed_kmh` | Configured route distance divided by average route duration |
| `trip_elapsed_minutes` | Minutes since trip departure at the sample time |
| `local_hour` | Sample hour in `Asia/Manila` (0–23) |
| `day_of_week` | Manila-local weekday, Monday=0 through Sunday=6 |
| `is_returning` | 1 for a return leg, otherwise 0 |
| `eta_remaining_minutes` | Actual sample-to-arrival time; the supervised target |

Remaining distance must be based on the route line, not straight-line distance. The exporter reverses the stored line for returning trips and drops fixes that are more than 500 m from it. This is a simple nearest-line match; significant detours or off-route travel can still make labels noisy and should be reviewed.

## Setup and workflow

Use a Python environment with the backend requirements installed and install the ML dependencies:

```sh
cd ai_ml
python -m pip install -r requirements.txt
```

The exporter uses `backend/.env` to connect to the configured database. Run it from the repository root using the same Python environment that has the backend dependencies:

```sh
python ai_ml/src/export_training_data.py
```

Review the exported rows and verify that route geometry, progress, timestamps, and remaining-time labels make sense before training. Training refuses empty data, fewer than 30 distinct trips, or fewer than 200 GPS snapshots. It evaluates on held-out trips (not random rows from trips already seen), reports mean and median absolute error in minutes, then saves `models/eta_model.joblib`.

```sh
cd ai_ml
python -m src.train_model
```

Try one local inference after training (hours and weekdays are Manila-local):

```sh
python -m src.predict \
  --remaining-km 2.4 --route-km 8.0 \
  --current-speed-kmh 24 --route-average-speed-kmh 20 \
  --elapsed-minutes 12 --hour 17 --weekday 2
```

Until a trained artifact exists, inference uses `remaining_distance / usable_speed * 60`; at speeds below 5 km/h it uses the configured route-average speed to avoid treating a temporary stop as the trip's lasting speed. The predictor caps displayed results at 240 minutes. This fallback is not an ML prediction.

## Model limitations and integration

- The trainer requires the real `gps_logs` collection and accurate route geometry. The current mobile app does not yet write active-trip samples there.
- The CSV is an intermediate artifact. Keep it access-controlled and remove or aggregate it if it contains sensitive trip traces.
- FastAPI exposes authenticated `GET /eta/trip/{trip_id}` for the active Driver trip. It map-matches the newest trip GPS fix to the route geometry and returns the estimate, source, and location timestamp. The Driver refreshes this endpoint during the active trip and displays `--` when data is stale or route geometry is unavailable.
- The native driver UI keeps `--` if there is no fresh GPS fix, route geometry match, or usable speed. Do not present average route duration as a live ETA by itself.
- Training requires at least 30 distinct trips and 200 snapshots, and validation keeps trips grouped to avoid leaking the same trip into training and validation. Track held-out MAE against the distance/speed fallback before enabling a trained artifact. When deploying a model, set `ETA_MODEL_PATH` and install `ai_ml/requirements.txt` in the backend environment.
