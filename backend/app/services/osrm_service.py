import os
import requests

OSRM_API_URL = os.getenv("OSRM_API_URL", "http://router.project-osrm.org")


def get_route_distance_km(
  origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
) -> float | None:
  """Calls OSRM's public routing API to get real road-network distance
  (not straight-line) between two points. Used once, at seed time, to
  populate routes.distance for the fixed pilot routes — not called
  repeatedly at runtime.

  OSRM expects coordinates as lng,lat (reversed from how we store them).
  Returns None if the request fails, so callers can fall back gracefully
  (e.g. prompt for a manual distance entry) instead of crashing the seed.
  """
  url = f"{OSRM_API_URL}/route/v1/driving/{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
  params = {"overview": "false"}

  try:
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    if data.get("code") != "Ok":
      return None

    distance_meters = data["routes"][0]["distance"]
    return round(distance_meters / 1000, 2)

  except (requests.RequestException, KeyError, IndexError):
    return None