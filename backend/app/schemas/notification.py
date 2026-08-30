from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.enums import NotificationType, BroadcastType


class NotificationResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  notification_id: int
  recipient_id: int
  notification_type: NotificationType
  message: str | None = None
  is_read: bool
  created_at: datetime


class BroadcastNotificationResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  broadcast_id: int
  terminal_id: int | None = None
  route_id: int | None = None
  broadcast_type: BroadcastType
  created_at: datetime