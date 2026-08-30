from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.enums import TripStatus


class TripStart(BaseModel):
  """Driver taps 'Start Trip' — dispatch_id must already exist,
  vehicle activity_status must be 'loading' before this is allowed."""
  dispatch_id: int


class TripEnd(BaseModel):
  """Driver taps 'End Trip' — triggers average_speed_km calculation
  from gps_logs, sets is_complete = True."""
  trip_id: int


class TripResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  trip_id: int
  dispatch_id: int
  status: TripStatus
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  is_complete: bool