from pydantic import BaseModel, ConfigDict


class DestinationResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  destination_id: int
  name: str
  latitude: float
  longitude: float
  address: str


class RouteResponse(BaseModel):
  """No RouteCreate/RouteUpdate schemas — routes are seeded once at
  deployment and are fully view-only, no admin write access at all."""
  model_config = ConfigDict(from_attributes=True)

  route_id: int
  origin_id: int
  destination_id: int
  distance: float
  average_travel_duration: float | None = None
  destination: DestinationResponse | None = None