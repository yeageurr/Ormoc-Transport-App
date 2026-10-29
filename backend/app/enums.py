import enum


class AccountStatus(str, enum.Enum):
  ACTIVE = "active"
  SUSPENDED = "suspended"
  DISABLED = "disabled"


class AccountRole(str, enum.Enum):
  DRIVER = "driver"
  ADMIN = "admin"


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


class GeofenceEventType(str, enum.Enum):
  ENTER = "enter"
  EXIT = "exit"


class AuditAction(str, enum.Enum):
  CREATE = "create"
  UPDATE = "update"
  SUSPEND = "suspend"
  RESOLVE = "resolve"
  DELETE = "delete"


class NotificationType(str, enum.Enum):
  SUSPENSION = "suspension"
  WARNING = "warning"
  UPDATED = "updated"
