
class UserRole():
  ADMIN: str = "administrator"
  DRIVER: str  = "driver"


class AccountStatus():
  ACTIVE: str = "active"
  SUSPENDED: str = "suspended"
  DISABLED: str = "disabled"


class VehicleCondition():
  NEW: str = "new"
  OPERATIONAL: str = "operational"
  UNDER_MAINTENANCE: str = "under maintenance"


class VehicleActivityStatus():
  ACTIVE: str = "active"
  LOADING: str = "loading"
  ONROUTE: str = "on route"


class GeofenceEventTypes():
  ENTER: str = "enter"
  EXIT: str = "exit"


class NotificationType():
  SUSPENSION: str = "suspension"
  WARNING: str = "warning"
  UPDATED: str = "updated"


class BroadcastNotificationType():
  PASSENGER_QUEUE: str = "passenger queue"
  INCIDENT: str = "incident"


class TripStatus():
  OUTGOING: str = "outgoing"
  RETURNING: str = "returning"
  COMPLETED: str = "completed"


class IncidentType():
  VEHICLE_BREAKDOWN: str = "vehicle breakdown"
  FLOODED_ROAD: str = "flooded road"
  CRIME_INCIDENT: str = "crime incident"
  ROAD_ACCIDENT: str = "road accident"


class IncidentStatus():
  OPEN: str = "open"
  RESOLVED: str = "resolved"
  UNDER_REVIEW: str = "under review"
