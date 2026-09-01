from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.dispatch_log import DispatchLog
from app.models.notification import Notification, BroadcastNotification
from app.schemas.notification import NotificationResponse, BroadcastNotificationResponse
from app.core.permissions import require_role, get_current_account
from app.enums import AccountRole, NotificationType, BroadcastType
from app.websocket.connection_manager import manager

router = APIRouter()


# ---------- Targeted notifications ----------

async def send_targeted_notification(
  db: Session, recipient_id: int, notification_type: NotificationType, message: str
) -> Notification:
  """Called from other routers (e.g. suspend_driver) — not exposed
  directly as an endpoint. Persists the notification AND pushes it live
  if the recipient is currently connected."""
  notification = Notification(
    recipient_id=recipient_id,
    notification_type=notification_type,
    message=message,
  )
  db.add(notification)
  db.commit()
  db.refresh(notification)

  await manager.send_to(recipient_id, {
    "type": "notification",
    "data": {
      "notification_id": notification.notification_id,
      "notification_type": notification.notification_type.value,
      "message": notification.message,
      "created_at": notification.created_at.isoformat(),
    },
  })

  return notification


@router.get("/mine", response_model=list[NotificationResponse])
def list_my_notifications(
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  return (
    db.query(Notification)
    .filter(Notification.recipient_id == current_account.account_id)
    .order_by(Notification.created_at.desc())
    .all()
  )


@router.patch("/{notification_id}/read")
def mark_notification_read(
  notification_id: int,
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  notification = db.query(Notification).filter(Notification.notification_id == notification_id).first()
  if notification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

  if notification.recipient_id != current_account.account_id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notification")

  notification.is_read = True
  db.commit()
  return {"detail": "Marked as read"}


# ---------- Broadcast notifications ----------

async def send_route_broadcast(
  db: Session, broadcast_type: BroadcastType, terminal_id: int | None, route_id: int | None
) -> BroadcastNotification:
  """Called from other routers (e.g. incident reporting, passenger queue
  detection) — not exposed directly. Persists the broadcast AND pushes
  it to route-scoped drivers plus all connected admins."""

  broadcast = BroadcastNotification(
    terminal_id=terminal_id,
    route_id=route_id,
    broadcast_type=broadcast_type,
  )
  db.add(broadcast)
  db.commit()
  db.refresh(broadcast)

  payload = {
    "type": "broadcast",
    "data": {
      "broadcast_id": broadcast.broadcast_id,
      "broadcast_type": broadcast.broadcast_type.value,
      "route_id": broadcast.route_id,
      "created_at": broadcast.created_at.isoformat(),
    },
  }

  # Admins always see every broadcast, regardless of route.
  admin_ids = [acc.account_id for acc in db.query(Account).filter(Account.role == AccountRole.ADMIN).all()]
  await manager.broadcast_to(admin_ids, payload)

  # Drivers only see it if they're currently dispatched on the affected route today.
  if route_id is not None:
    driver_account_ids = [
      driver.account_id
      for driver in (
        db.query(Account)
        .join(User, User.account_id == Account.account_id)
        .join(DispatchLog, DispatchLog.driver_id == User.user_id)
        .filter(DispatchLog.route_id == route_id)
        .all()
      )
    ]
    await manager.broadcast_to(driver_account_ids, payload)

  return broadcast


@router.get("/broadcasts", response_model=list[BroadcastNotificationResponse])
def list_recent_broadcasts(
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  """Fallback for clients that missed the live push (e.g. just reconnected).
  Cleanup job purges anything older than BROADCAST_RETENTION_HOURS separately."""
  return db.query(BroadcastNotification).order_by(BroadcastNotification.created_at.desc()).all()