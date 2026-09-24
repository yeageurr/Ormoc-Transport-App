import os
from dataclasses import dataclass

import requests


MAPBOX_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"


@dataclass(frozen=True)
class DirectionsRoute:
  geometry: dict
  distance_km: float
  duration_minutes: float


def get_driving_route(coordinates: list[tuple[float, float]]) -> DirectionsRoute | None:
  """Return Mapbox's full road-following GeoJSON line for ordered waypoints."""
  access_token = os.getenv("MAPBOX_DIRECTIONS_ACCESS_TOKEN")
  if not access_token:
    return None

  coordinate_path = ";".join(f"{longitude},{latitude}" for longitude, latitude in coordinates)
  try:
    response = requests.get(
      f"{MAPBOX_DIRECTIONS_URL}/{coordinate_path}",
      params={
        "access_token": access_token,
        "geometries": "geojson",
        "overview": "full",
        "alternatives": "false",
      },
      timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    route = data["routes"][0]
    geometry = route["geometry"]
    if data.get("code") != "Ok" or geometry.get("type") != "LineString":
      return None
    return DirectionsRoute(
      geometry=geometry,
      distance_km=round(float(route["distance"]) / 1000, 2),
      duration_minutes=round(float(route["duration"]) / 60, 2),
    )
  except (requests.RequestException, KeyError, IndexError, TypeError, ValueError):
    return None
