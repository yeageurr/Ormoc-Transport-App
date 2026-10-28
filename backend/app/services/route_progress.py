"""Small route-line projection helper shared by ETA serving and data export."""

from __future__ import annotations

import math
from typing import Any

EARTH_RADIUS_METERS = 6_371_000
MAX_ROUTE_SNAP_DISTANCE_METERS = 500


def remaining_route_distance_km(
  geometry: dict[str, Any] | None,
  latitude: float,
  longitude: float,
  route_distance_km: float,
  *,
  returning: bool = False,
) -> tuple[float, float] | None:
  """Return (remaining route km, GPS-to-route snap meters) for a GeoJSON line."""
  if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
    return None
  raw_coordinates = geometry.get("coordinates")
  if not isinstance(raw_coordinates, list) or len(raw_coordinates) < 2:
    return None
  try:
    coordinates = [(float(point[0]), float(point[1])) for point in raw_coordinates]
  except (TypeError, ValueError, IndexError):
    return None
  if any(not math.isfinite(lon) or not math.isfinite(lat) for lon, lat in coordinates):
    return None
  if returning:
    coordinates.reverse()

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
    lon1, lat1 = map(math.radians, start)
    lon2, lat2 = map(math.radians, end)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    length = 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(min(1.0, value)))
    segment_lengths.append(length)
    cumulative.append(cumulative[-1] + length)

  geometry_length = cumulative[-1]
  if geometry_length <= 0 or route_distance_km <= 0:
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
  progress = min(1.0, max(0.0, best_along_distance / geometry_length))
  return max(0.0, route_distance_km * (1 - progress)), snap_distance
