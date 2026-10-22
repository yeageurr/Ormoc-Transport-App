from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DispatcherAssignmentCreate(BaseModel):
  operating_date: date
  route_id: int
  dispatcher_id: int


class DispatcherAssignmentResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  operating_date: date
  route_id: int
  dispatcher_id: int
  assigned_by: int
  created_at: datetime
  closed_at: datetime | None
  closed_by: int | None = None
  auto_closed: bool
