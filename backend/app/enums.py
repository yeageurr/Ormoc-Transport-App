import enum


class AccountStatus(str, enum.Enum):
  ACTIVE = "active"
  SUSPENDED = "suspended"
  DISABLED = "disabled"


class AccountRole(str, enum.Enum):
  ADMIN = "admin"
  DRIVER = "driver"


class VehicleCondition(str, enum.Enum):
  NEW = "new"
  OPERATIONAL = "operational"
  UNDER_MAINTENANCE = "under_maintenance"


class VehicleActivityStatus(str, enum.Enum):
  ACTIVE = "active"
  LOADING = "loading"
  ON_ROUTE = "on-route"


class TripStatus(str, enum.Enum):
  OUTGOING = "outgoing"
  RETURNING = "returning"
  COMPLETED = "completed"


class GeofenceEventType(str, enum.Enum):
  ENTER = "enter"
  EXIT = "exit"


class NotificationType(str, enum.Enum):
  SUSPENSION = "suspension"
  WARNING = "warning"
  UPDATED = "updated"


class BroadcastType(str, enum.Enum):
  PASSENGER_QUEUE = "passenger_queue"
  INCIDENT = "incident"


class IncidentType(str, enum.Enum):
  VEHICLE_BREAKDOWN = "vehicle_breakdown"
  FLOODED_ROAD = "flooded_road"
  CRIME_INCIDENT = "crime_incident"
  ROAD_ACCIDENT = "road_accident"


class IncidentStatus(str, enum.Enum):
  OPEN = "open"
  UNDER_REVIEW = "under_review"
  RESOLVED = "resolved"