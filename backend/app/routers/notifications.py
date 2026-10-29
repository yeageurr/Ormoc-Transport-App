from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.core.permissions import require_role, get_current_account
from app.enums import NotificationType
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
