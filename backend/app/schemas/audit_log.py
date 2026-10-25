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


class AuditActorSummary(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  account_id: int
  account_code: str
  role: str | None = None


class AuditLogResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  audit_id: int
  actor_id: int | None
  actor: AuditActorSummary | None = None
  actor_type: str = "account"
  action: AuditAction
  target_table: str
  target_id: int
  details: str
  outcome: str = "success"
  context: dict | None = None
  created_at: datetime
