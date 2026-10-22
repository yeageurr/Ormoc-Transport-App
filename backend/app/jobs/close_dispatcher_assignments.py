import logging
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.dispatcher_assignment import DispatcherAssignment
from app.services.dispatcher_assignment_service import expire_assignment_reservations

logger = logging.getLogger(__name__)
ASSIGNMENT_DURATION = timedelta(hours=24)


def close_expired_dispatcher_assignments() -> int:
  """Close open assignments once their 24-hour period has elapsed.

  The stored ``closed_at`` is the actual deadline (created_at + 24 hours),
  even when this periodic job runs a little later. Row locks make this safe
  when multiple API workers run the job concurrently.
  """
  db = SessionLocal()
  try:
    now = datetime.now(timezone.utc)
    expired = (
      db.query(DispatcherAssignment)
      .filter(
        DispatcherAssignment.closed_at.is_(None),
        DispatcherAssignment.created_at <= now - ASSIGNMENT_DURATION,
      )
      .with_for_update(skip_locked=True)
      .all()
    )
    for assignment in expired:
      assignment.closed_at = assignment.created_at + ASSIGNMENT_DURATION
      assignment.closed_by = None
      assignment.auto_closed = True
      expire_assignment_reservations(db, assignment, assignment.closed_at)

    count = len(expired)
    db.commit()
    if count:
      logger.info("Automatically closed %s dispatcher assignment(s)", count)
    return count
  except Exception:
    db.rollback()
    logger.exception("Failed to auto-close expired dispatcher assignments")
    raise
  finally:
    db.close()
