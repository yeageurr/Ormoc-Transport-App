from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from app.enums import VehicleCondition, VehicleActivityStatus


class VehicleBase(BaseModel):
  body_color: str  # hex, e.g. "#1D9E75"
  body_number: str
  plate_number: str
  vehicle_type: str
  registry_expiration: datetime

  @field_validator("body_color")
  @classmethod
  def validate_hex_color(cls, v: str) -> str:
    import re
    if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
      raise ValueError("body_color must be a valid hex color, e.g. #1D9E75")
    return v


class VehicleCreate(VehicleBase):
  owner_id: int  # must reference a driver with no vehicle already linked


class VehicleUpdate(BaseModel):
  body_color: str | None = None
  condition: VehicleCondition | None = None
  registry_expiration: datetime | None = None


class VehicleOwnerSummary(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  user_id: int
  first_name: str
  last_name: str


class VehicleResponse(VehicleBase):
  model_config = ConfigDict(from_attributes=True)

  vehicle_id: int
  owner_id: int
  owner: VehicleOwnerSummary | None = None
  condition: VehicleCondition
  activity_status: VehicleActivityStatus
  is_registered: bool
  created_on: datetime
  updated_on: datetime | None = None