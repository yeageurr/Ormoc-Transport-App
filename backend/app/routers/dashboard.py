from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.trip import Trip
from app.models.incident_log import Incident
from app.models.dispatch_log import DispatchLog
from app.core.permissions import require_role
from app.enums import AccountRole

router = APIRouter()


class DashboardStats(BaseModel):
  total_trips_today: int
  avg_trip_duration_minutes: float | None
  incidents_reported_total: int
  drivers_total: int


class TripVolumeDay(BaseModel):
  day_label: str  # "MON", "TUE", etc.
  count: int


class RecentIncidentSummary(BaseModel):
  incident_id: int
  incident_type: str
  reporter_name: str
  route_label: str
  vehicle_plate: str | None = None


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

  total_trips_today = (
    db.query(Trip)
    .filter(Trip.time_departed >= today_start)
    .count()
  )

  avg_duration = (
    db.query(func.avg(Trip.trip_duration_minutes))
    .filter(Trip.is_complete == True)  # noqa: E712
    .scalar()
  )

  incidents_total = db.query(Incident).count()
  drivers_total = db.query(User).join(Account).filter(Account.role == AccountRole.DRIVER).count()

  return DashboardStats(
    total_trips_today=total_trips_today,
    avg_trip_duration_minutes=round(avg_duration, 2) if avg_duration is not None else None,
    incidents_reported_total=incidents_total,
    drivers_total=drivers_total,
  )


@router.get("/trip-volume", response_model=list[TripVolumeDay])
def get_trip_volume_last_7_days(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Completed trip count per day, last 7 days, oldest first — matches
  the Mon-Sun bar chart in the dashboard mockup."""
  results = []
  today = datetime.now(timezone.utc).date()

  for i in range(6, -1, -1):
    day = today - timedelta(days=i)
    day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    count = (
      db.query(Trip)
      .filter(Trip.time_departed >= day_start, Trip.time_departed < day_end)
      .count()
    )

    results.append(TripVolumeDay(day_label=day.strftime("%a").upper(), count=count))

  return results


@router.get("/recent-incidents", response_model=list[RecentIncidentSummary])
def get_recent_incidents(
  limit: int = 5,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  incidents = (
    db.query(Incident)
    .order_by(Incident.reported_at.desc())
    .limit(limit)
    .all()
  )

  summaries = []
  for incident in incidents:
    reporter = incident.reported_by_user
    trip = incident.trip
    dispatch = trip.dispatch_log if trip else None
    route = dispatch.route if dispatch else None
    vehicle = dispatch.vehicle if dispatch else None

    summaries.append(RecentIncidentSummary(
      incident_id=incident.incident_id,
      incident_type=incident.incident_type.value,
      reporter_name=f"{reporter.first_name} {reporter.last_name}" if reporter else "Unknown",
      route_label=route.destination.name if route and route.destination else "Unknown",
      vehicle_plate=vehicle.plate_number if vehicle else None,
    ))

  return summaries