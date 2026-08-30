from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DispatchCreate(BaseModel):
  driver_id: int
  vehicle_id: int
  route_id: int
  effective_on: datetime


class DispatchResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  dispatch_id: int
  admin_id: int | None = None
  driver_id: int
  vehicle_id: int
  route_id: int
  created_on: datetime
  effective_on: datetime