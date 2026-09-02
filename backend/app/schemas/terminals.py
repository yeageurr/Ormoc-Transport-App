from pydantic import BaseModel, ConfigDict


class TerminalResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  terminal_id: int
  admin_id: int | None = None
  terminal_name: str
  min_latitude: float
  min_longitude: float
  max_latitude: float
  max_longitude: float
  address: str