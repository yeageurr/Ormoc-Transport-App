from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.enums import IncidentType, IncidentStatus


class IncidentCreate(BaseModel):
  """Driver-submitted incident report — reported_by and trip_id are
  derived server-side from the driver's active trip, not sent by the client."""
  trip_id: int
  incident_type: IncidentType
  description: str | None = None
  latitude: float  # captured from device GPS at moment of reporting
  longitude: float


class IncidentUpdate(BaseModel):
  """Admin-facing — resolve or move an incident through its lifecycle."""
  status: IncidentStatus | None = None
  description: str | None = None


class IncidentReporterSummary(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  user_id: int
  first_name: str
  last_name: str


class IncidentRouteSummary(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  route_id: int
  route_name: str | None = None  # populated in the router from destination.name


class IncidentResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  incident_id: int
  trip_id: int
  reported_by: int
  reporter: IncidentReporterSummary | None = None
  route: IncidentRouteSummary | None = None
  incident_type: IncidentType
  description: str | None = None
  latitude: float
  longitude: float
  status: IncidentStatus
  reported_at: datetime
  resolved_by: int | None = None
  resolved_at: datetime | None = None
  updated_by: int | None = None
  updated_at: datetime | None = None