from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class GpsPing(BaseModel):
  """What the driver app sends every 5 seconds during an active trip."""
  trip_id: int
  latitude: float
  longitude: float
  speed_kmh: float

  @field_validator("latitude")
  @classmethod
  def validate_lat(cls, v: float) -> float:
    if not -90 <= v <= 90:
      raise ValueError("latitude must be between -90 and 90")
    return v

  @field_validator("longitude")
  @classmethod
  def validate_lng(cls, v: float) -> float:
    if not -180 <= v <= 180:
      raise ValueError("longitude must be between -180 and 180")
    return v


class GpsLogResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  gps_log_id: int
  trip_id: int
  latitude: float
  longitude: float
  recorded_at: datetime
  speed_kmh: float