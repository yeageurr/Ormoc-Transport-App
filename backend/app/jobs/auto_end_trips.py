import logging
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.trip import Trip
from app.services.trip_completion import complete_trip, record_automatic_completion

logger = logging.getLogger(__name__)
TRIP_MAX_DURATION = timedelta(hours=24)


def close_expired_trips() -> int:
  """Complete trips that have reached 24 hours; safe across multiple workers."""
  now = datetime.now(timezone.utc)
  cutoff = now - TRIP_MAX_DURATION
  db = SessionLocal()
  try:
    expired_trips = (
      db.query(Trip)
      .filter(Trip.is_complete.is_(False), Trip.time_departed <= cutoff)
      .order_by(Trip.time_departed.asc())
      .with_for_update(skip_locked=True)
      .all()
    )
    for trip in expired_trips:
      departed = trip.time_departed
      if departed.tzinfo is None:
        departed = departed.replace(tzinfo=timezone.utc)
      deadline = departed + TRIP_MAX_DURATION
      complete_trip(db, trip, deadline)
      record_automatic_completion(db, trip, deadline)
    if expired_trips:
      db.commit()
    return len(expired_trips)
  except Exception:
    db.rollback()
    raise
  finally:
    db.close()


async def run_trip_auto_end_job(interval_seconds: int = 30) -> None:
  """Poll periodically; a missed interval is handled on the next pass/startup."""
  import asyncio

  while True:
    try:
      closed_count = await asyncio.to_thread(close_expired_trips)
      if closed_count:
        logger.info("Automatically completed %s trip(s) at the 24-hour limit", closed_count)
    except Exception:
      logger.exception("Unable to automatically complete expired trips")
    await asyncio.sleep(interval_seconds)
