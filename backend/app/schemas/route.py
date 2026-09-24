from math import isfinite
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_coordinate_pairs(coordinates: list[tuple[float, float]]) -> list[tuple[float, float]]:
  for longitude, latitude in coordinates:
    if not isfinite(longitude) or not isfinite(latitude):
      raise ValueError("Route coordinates must be finite numbers")
    if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
      raise ValueError("Route coordinates must be ordered as [longitude, latitude]")
  return coordinates


class RouteGeometry(BaseModel):
  """A verified GeoJSON line for the direction from the terminal to a route destination."""

  type: Literal["LineString"]
  coordinates: list[tuple[float, float]] = Field(min_length=2)

  @field_validator("coordinates")
  @classmethod
  def validate_coordinates(cls, coordinates: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return validate_coordinate_pairs(coordinates)


class RouteDirectionsRequest(BaseModel):
  """Optional ordered stops that force Mapbox Directions through the official corridor."""

  via: list[tuple[float, float]] = Field(default_factory=list, max_length=23)

  @field_validator("via")
  @classmethod
  def validate_via(cls, via: list[tuple[float, float]]) -> list[tuple[float, float]]:
    return validate_coordinate_pairs(via)


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
  route_geometry: RouteGeometry | None = None
