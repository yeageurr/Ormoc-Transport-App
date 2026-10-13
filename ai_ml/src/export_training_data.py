"""Export route-matched GPS snapshots from completed trips for ETA training."""

from __future__ import annotations

import argparse
import csv
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")

from app.database import SessionLocal  # noqa: E402
from app.models.trip import Trip  # noqa: E402

MANILA = ZoneInfo("Asia/Manila")
EARTH_RADIUS_METERS = 6_371_000
MAX_ROUTE_SNAP_DISTANCE_METERS = 500
OUTPUT_COLUMNS = [
    "trip_id",
    "route_id",
    "recorded_at",
    "remaining_distance_km",
    "route_distance_km",
    "current_speed_kmh",
    "route_average_speed_kmh",
    "trip_elapsed_minutes",
    "local_hour",
    "day_of_week",
    "is_returning",
    "eta_remaining_minutes",
]


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _line_coordinates(route: object, returning: bool) -> list[tuple[float, float]] | None:
    geometry = getattr(route, "route_geometry", None)
    if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
        return None
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return None
    try:
        points = [(float(point[0]), float(point[1])) for point in coordinates]
    except (TypeError, ValueError, IndexError):
        return None
    if any(not math.isfinite(lon) or not math.isfinite(lat) for lon, lat in points):
        return None
    return list(reversed(points)) if returning else points


def _haversine_meters(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(value))


def remaining_route_distance_km(
    coordinates: list[tuple[float, float]], latitude: float, longitude: float, route_distance_km: float
) -> tuple[float, float] | None:
    """Return (remaining route km, GPS-to-route snap meters) for a LineString."""
    cos_lat = math.cos(math.radians(latitude))
    projected = [
        (
            math.radians(lon - longitude) * EARTH_RADIUS_METERS * cos_lat,
            math.radians(lat - latitude) * EARTH_RADIUS_METERS,
        )
        for lon, lat in coordinates
    ]
    cumulative = [0.0]
    segment_lengths: list[float] = []
    for start, end in zip(coordinates, coordinates[1:]):
        length = _haversine_meters(start, end)
        segment_lengths.append(length)
        cumulative.append(cumulative[-1] + length)
    total_geometry_length = cumulative[-1]
    if total_geometry_length <= 0:
        return None

    best_distance_squared = float("inf")
    best_along_distance = 0.0
    for index, (start, end) in enumerate(zip(projected, projected[1:])):
        dx, dy = end[0] - start[0], end[1] - start[1]
        segment_squared = dx * dx + dy * dy
        fraction = 0.0 if segment_squared == 0 else -(start[0] * dx + start[1] * dy) / segment_squared
        fraction = min(1.0, max(0.0, fraction))
        nearest_x, nearest_y = start[0] + fraction * dx, start[1] + fraction * dy
        distance_squared = nearest_x * nearest_x + nearest_y * nearest_y
        if distance_squared < best_distance_squared:
            best_distance_squared = distance_squared
            best_along_distance = cumulative[index] + fraction * segment_lengths[index]

    snap_distance = math.sqrt(best_distance_squared)
    if snap_distance > MAX_ROUTE_SNAP_DISTANCE_METERS:
        return None
    progress = min(1.0, max(0.0, best_along_distance / total_geometry_length))
    return max(0.0, route_distance_km * (1 - progress)), snap_distance


def collect_rows() -> tuple[list[dict[str, object]], dict[str, int]]:
    db = SessionLocal()
    rows: list[dict[str, object]] = []
    skipped = {"missing_geometry": 0, "missing_route_stats": 0, "off_route_or_invalid_fix": 0}
    try:
        trips = db.query(Trip).filter(Trip.is_complete.is_(True), Trip.time_arrived.isnot(None)).all()
        for trip in trips:
            dispatch = trip.dispatch_log
            route = dispatch.route if dispatch else None
            if route is None:
                skipped["missing_route_stats"] += 1
                continue
            route_distance = float(route.distance or 0)
            average_duration = float(route.average_travel_duration or 0)
            if route_distance <= 0 or average_duration <= 0:
                skipped["missing_route_stats"] += 1
                continue
            is_returning = str(getattr(trip.status, "value", trip.status)).lower() == "returning"
            coordinates = _line_coordinates(route, is_returning)
            if coordinates is None:
                skipped["missing_geometry"] += 1
                continue

            departed = _as_utc(trip.time_departed)
            arrived = _as_utc(trip.time_arrived)
            for gps in sorted(trip.gps_logs, key=lambda item: _as_utc(item.recorded_at)):
                recorded = _as_utc(gps.recorded_at)
                if recorded < departed or recorded > arrived:
                    skipped["off_route_or_invalid_fix"] += 1
                    continue
                progress = remaining_route_distance_km(
                    coordinates, float(gps.latitude), float(gps.longitude), route_distance
                )
                if progress is None:
                    skipped["off_route_or_invalid_fix"] += 1
                    continue
                remaining_km, _snap_meters = progress
                local_time = recorded.astimezone(MANILA)
                rows.append({
                    "trip_id": trip.trip_id,
                    "route_id": route.route_id,
                    "recorded_at": recorded.isoformat(),
                    "remaining_distance_km": round(remaining_km, 4),
                    "route_distance_km": route_distance,
                    "current_speed_kmh": max(0.0, float(gps.speed_kmh)),
                    "route_average_speed_kmh": route_distance / average_duration * 60,
                    "trip_elapsed_minutes": max(0.0, (recorded - departed).total_seconds() / 60),
                    "local_hour": local_time.hour,
                    "day_of_week": local_time.weekday(),
                    "is_returning": int(is_returning),
                    "eta_remaining_minutes": max(0.0, (arrived - recorded).total_seconds() / 60),
                })
        return rows, skipped
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "ai_ml" / "data" / "trips_export.csv")
    args = parser.parse_args()
    rows, skipped = collect_rows()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Exported {len(rows)} GPS snapshots from completed trips to {args.output}")
    print(f"Skipped records: {skipped}")


if __name__ == "__main__":
    main()
