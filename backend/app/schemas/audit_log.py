from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.enums import GeofenceEventType, AuditAction


class GeofenceEventResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  event_id: int
  terminal_id: int
  vehicle_id: int
  event_type: GeofenceEventType
  event_time: datetime


class AuditLogResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  audit_id: int
  actor_id: int
  action: AuditAction
  target_table: str
  target_id: int
  details: str
  created_at: datetime