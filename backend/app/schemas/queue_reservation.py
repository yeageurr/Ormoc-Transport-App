from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class QueueReservationCreate(BaseModel):
  route_id: int
  vehicle_id: int
  operating_date: date


class QueueReservationResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  route_id: int
  vehicle_id: int
  operating_date: date
  queue_number: int | None
  queue_display: str | None
  approval_status: str
  queue_status: str | None
  reserved_at: datetime
  approved_at: datetime | None = None
  approved_by: int | None = None
  cancelled_at: datetime | None = None
  cancelled_by: int | None = None
  expired_at: datetime | None = None
  ticket_id: str | None = None
  ticket_reference: str | None = None
  ticket_is_valid: bool | None = None


class DriverQueueReservationHistoryResponse(QueueReservationResponse):
  driver_name: str
  route_label: str
  vehicle_plate: str
  vehicle_body_number: str
  loading_at: datetime | None = None
  departed_at: datetime | None = None
  ticket_created_at: datetime | None = None
  ticket_used_at: datetime | None = None
  ticket_cancelled_at: datetime | None = None
  ticket_expired_at: datetime | None = None


class DispatcherQueueReservationResponse(DriverQueueReservationHistoryResponse):
  driver_public_id: str
