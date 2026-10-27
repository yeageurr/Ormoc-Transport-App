from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

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


class TripEnd(BaseModel):
  """Driver taps 'End Trip' — triggers average_speed_km calculation
  from gps_logs, sets is_complete = True."""
  trip_id: int


class TripResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  trip_id: int
  dispatch_id: int | None = None
  route_id: int | None = None
  driver_id: int | None = None
  vehicle_id: int | None = None
  dispatch_ticket_id: UUID | None = None
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
  route_id: int | None = None
  time_departed: datetime
  time_arrived: datetime | None = None
  trip_duration_minutes: float | None = None
  average_speed_km: float | None = None
  is_complete: bool
  driver: TripDriverSummary | None = None
  route_label: str | None = None
