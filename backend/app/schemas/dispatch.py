from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DispatchCreate(BaseModel):
  driver_id: int
  vehicle_id: int
  route_id: int
  effective_on: datetime


class DispatchBatchCreate(BaseModel):
  dispatches: list[DispatchCreate] = Field(min_length=1)


class DispatchUpdate(DispatchCreate):
  pass


class DispatchResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  dispatch_id: int
  admin_id: int | None = None
  driver_id: int
  vehicle_id: int
  route_id: int
  created_on: datetime
  effective_on: datetime


class CurrentDriverDispatch(BaseModel):
  dispatch_id: int
  vehicle_plate: str
  route_label: str
