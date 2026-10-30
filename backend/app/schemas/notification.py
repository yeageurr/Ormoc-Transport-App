from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.enums import NotificationType


class NotificationResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  notification_id: int
  recipient_id: int
  notification_type: NotificationType
  message: str | None = None
  is_read: bool
  created_at: datetime
