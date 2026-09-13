import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv
from app.database import SessionLocal
from app.models.notification import BroadcastNotification

load_dotenv()

RETENTION_HOURS = int(os.getenv("BROADCAST_RETENTION_HOURS", 24))


def cleanup_broadcasts():
  db = SessionLocal()
  try:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RETENTION_HOURS)

    deleted_count = (
      db.query(BroadcastNotification)
      .filter(BroadcastNotification.created_at < cutoff)
      .delete(synchronize_session=False)
    )
    db.commit()

    print(f"Cleanup complete: removed {deleted_count} broadcast(s) older than {RETENTION_HOURS}h.")
  finally:
    db.close()


if __name__ == "__main__":
  cleanup_broadcasts()