from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, model_validator

from app.enums import TripStatus


class TripStart(BaseModel):
  """Driver starts one route leg in the selected direction."""
  dispatch_id: int | None = None
  status: TripStatus

  @model_validator(mode="after")
  def validate_dispatch_for_direction(self):
    if self.status == TripStatus.OUTGOING and self.dispatch_id is None:
      raise ValueError("Outgoing trips require a dispatch assignment")
    if self.status == TripStatus.RETURNING and self.dispatch_id is not None:
      raise ValueError("Returning trips must be recorded without a dispatch assignment")
    return self


class TripEnd(BaseModel):
  """Driver taps 'End Trip' — triggers average_speed_km calculation
  from gps_logs, sets is_complete = True."""
  trip_id: int


class TripResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  trip_id: int
  dispatch_id: int | None = None
  driver_id: int | None = None
  vehicle_id: int | None = None
  dispatch_ticket_id: UUID | None = None
  status: TripStatus
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  is_complete: bool


class DriverTripResponse(TripResponse):
  """Trip data shown in the driver's own history and home dashboard."""
  vehicle_plate: str | None = None
  route_label: str | None = None
  route_distance_km: float | None = None


class DriverDailySummary(BaseModel):
  """Counts for the signed-in driver's current calendar day."""
  trips_completed: int
  incidents_reported: int


class TripDriverSummary(BaseModel):
  user_id: int
  first_name: str
  last_name: str


class AdminTripResponse(BaseModel):
  """Used for the ticketing-officer Trip Logs table, which needs driver name
  and route directly, not just IDs — driver's own /trips/driver/mine
  doesn't need this since it's implicitly always their own trips."""
  trip_id: int
  dispatch_id: int | None
  status: TripStatus
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  is_complete: bool
  driver: TripDriverSummary | None = None
  route_label: str | None = None
