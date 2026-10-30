from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.enums import TripStatus


class TripStart(BaseModel):
  """Driver starts one route leg in the selected direction."""
  route_id: int
  status: TripStatus


class TripPauseEventResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  pause_event_id: int
  paused_at: datetime
  resumed_at: datetime | None = None
  delay_reason: str | None = None
  delay_details: str | None = None
  broadcast_to_commuters: bool = False


class TripPauseRequest(BaseModel):
  broadcast_to_commuters: bool = False
  delay_reason: Literal["accident", "road_incident", "traffic", "other"] | None = None
  delay_details: str | None = Field(default=None, max_length=500)

  @model_validator(mode="after")
  def validate_broadcast(self):
    if self.broadcast_to_commuters and self.delay_reason is None:
      raise ValueError("Choose a delay reason before broadcasting")
    if self.delay_reason == "other" and self.broadcast_to_commuters and not (self.delay_details or "").strip():
      raise ValueError("Describe the delay before broadcasting")
    if self.delay_reason != "other":
      self.delay_details = None
    if not self.broadcast_to_commuters:
      self.delay_reason = None
      self.delay_details = None
    elif self.delay_details is not None:
      self.delay_details = self.delay_details.strip()
    return self


class TripEnd(BaseModel):
  """Driver taps 'End Trip' — triggers average_speed_km calculation
  from gps_logs, sets is_complete = True."""
  trip_id: int


class TripResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  trip_id: int
  route_id: int
  driver_id: int
  vehicle_id: int
  status: TripStatus
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  distance_traveled_km: float | None = None
  is_complete: bool
  pause_events: list[TripPauseEventResponse] = Field(default_factory=list)


class DriverTripResponse(TripResponse):
  """Trip data shown in the driver's own history and home dashboard."""
  vehicle_plate: str | None = None
  route_label: str | None = None
  route_distance_km: float | None = None


class DriverDailySummary(BaseModel):
  """Counts for the signed-in driver's current calendar day."""
  trips_completed: int


class TripDriverSummary(BaseModel):
  user_id: int
  first_name: str
  last_name: str


class AdminTripResponse(BaseModel):
  """Used for the admin trip overview, which needs driver name
  and route directly, not just IDs — driver's own /trips/driver/mine
  doesn't need this since it's implicitly always their own trips."""
  trip_id: int
  status: TripStatus
  route_id: int | None = None
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  is_complete: bool
  driver: TripDriverSummary | None = None
  route_label: str | None = None
