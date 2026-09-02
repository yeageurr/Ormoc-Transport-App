"""
Run once, during initial deployment, to seed the terminal and the 5 fixed
pilot routes. Not re-runnable to "update" a route later — routes are
immutable reference data once seeded, per the finalized design.

Usage: python -m seed.seed_routes
"""
import os
import sys

sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.terminal import Terminal
from app.models.destinations import Destination
from app.models.route import Route
from app.services.osrm_service import get_route_distance_km

load_dotenv()

# Terminal coordinates and the 5 pilot destinations — real coordinates
# should replace these placeholders before running against production.
TERMINAL_DATA = {
  "terminal_name": "Ormoc City Bus Terminal",
  "min_latitude": 11.0055,
  "max_latitude": 11.0075,
  "min_longitude": 124.6065,
  "max_longitude": 124.6085,
  "address": "Ormoc City Bus Terminal, Ormoc City, Leyte",
}

PILOT_DESTINATIONS = [
  {"name": "Montebello", "latitude": 11.0870, "longitude": 124.6130, "address": "Montebello, Ormoc City"},
  {"name": "Sabang Bao", "latitude": 10.9500, "longitude": 124.5700, "address": "Sabang Bao, Ormoc City"},
  {"name": "Puertobello", "latitude": 10.9200, "longitude": 124.5900, "address": "Puertobello, Ormoc City"},
  {"name": "Valencia", "latitude": 10.9500, "longitude": 124.6300, "address": "Valencia, Ormoc City"},
  {"name": "Albuera", "latitude": 11.0300, "longitude": 124.4700, "address": "Albuera, Leyte"},
]

# Manual fallback distances (km), used only if OSRM is unreachable —
# these should be replaced with real measured values if that happens.
FALLBACK_DISTANCES_KM = {
  "Montebello": 19.5,
  "Sabang Bao": 23.5,
  "Puertobello": 11.2,
  "Valencia": 14.0,
  "Albuera": 18.2,
}


def seed_routes():
  db = SessionLocal()
  try:
    existing_terminal = db.query(Terminal).first()
    if existing_terminal:
      print("A terminal already exists — routes appear to already be seeded. Skipping.")
      return

    terminal = Terminal(**TERMINAL_DATA)
    db.add(terminal)
    db.flush()  # get terminal_id before creating routes that reference it
    print(f"Created terminal: {terminal.terminal_name} (terminal_id={terminal.terminal_id})")

    for dest_data in PILOT_DESTINATIONS:
      destination = Destination(**dest_data)
      db.add(destination)
      db.flush()

      distance = get_route_distance_km(
        terminal.min_latitude, terminal.min_longitude,
        destination.latitude, destination.longitude,
      )

      used_fallback = False
      if distance is None:
        distance = FALLBACK_DISTANCES_KM.get(dest_data["name"])
        used_fallback = True

      route = Route(
        origin_id=terminal.terminal_id,
        destination_id=destination.destination_id,
        distance=distance,
      )
      db.add(route)

      source = "fallback value" if used_fallback else "OSRM"
      print(f"  Route to {dest_data['name']}: {distance} km (via {source})")

    db.commit()
    print()
    print(f"Seeded 1 terminal, {len(PILOT_DESTINATIONS)} destinations, {len(PILOT_DESTINATIONS)} routes.")

  finally:
    db.close()


if __name__ == "__main__":
  seed_routes()