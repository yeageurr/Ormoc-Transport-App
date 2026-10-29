from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.account import Account
from app.models.user import User
from app.models.trip import Trip
from app.core.permissions import require_role
from app.enums import AccountRole

router = APIRouter()


class DashboardStats(BaseModel):
  total_trips_today: int
  total_trips_yesterday: int
  avg_trip_duration_minutes: float | None
  avg_trip_duration_previous_period_minutes: float | None
  drivers_total: int
  drivers_total_previous_month: int


class TripVolumeDay(BaseModel):
  day_label: str
  count: int


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  now = datetime.now(ZoneInfo("Asia/Manila"))
  today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
  yesterday_start = today_start - timedelta(days=1)
  tomorrow_start = today_start + timedelta(days=1)

  total_trips_today = db.query(Trip).filter(Trip.time_departed >= today_start, Trip.time_departed < tomorrow_start).count()
  total_trips_yesterday = db.query(Trip).filter(Trip.time_departed >= yesterday_start, Trip.time_departed < today_start).count()

  current_duration_start = now - timedelta(days=7)
  previous_duration_start = now - timedelta(days=14)
  avg_duration = db.query(func.avg(Trip.trip_duration_minutes)).filter(
    Trip.is_complete.is_(True), Trip.time_arrived >= current_duration_start, Trip.time_arrived < now,
  ).scalar()
  previous_avg_duration = db.query(func.avg(Trip.trip_duration_minutes)).filter(
    Trip.is_complete.is_(True), Trip.time_arrived >= previous_duration_start, Trip.time_arrived < current_duration_start,
  ).scalar()

  current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
  drivers_query = db.query(User).join(Account).filter(Account.role == AccountRole.DRIVER)
  month_start_utc = current_month_start.astimezone(timezone.utc).replace(tzinfo=None)
  return DashboardStats(
    total_trips_today=total_trips_today,
    total_trips_yesterday=total_trips_yesterday,
    avg_trip_duration_minutes=round(avg_duration, 2) if avg_duration is not None else None,
    avg_trip_duration_previous_period_minutes=round(previous_avg_duration, 2) if previous_avg_duration is not None else None,
    drivers_total=drivers_query.count(),
    drivers_total_previous_month=drivers_query.filter(Account.created_on < month_start_utc).count(),
  )


@router.get("/trip-volume", response_model=list[TripVolumeDay])
def get_trip_volume_last_7_days(
  db: Session = Depends(get_db),
  admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  results = []
  today = datetime.now(ZoneInfo("Asia/Manila")).date()
  for i in range(6, -1, -1):
    day = today - timedelta(days=i)
    day_start = datetime.combine(day, datetime.min.time(), tzinfo=ZoneInfo("Asia/Manila"))
    day_end = day_start + timedelta(days=1)
    count = db.query(Trip).filter(Trip.time_departed >= day_start, Trip.time_departed < day_end).count()
    results.append(TripVolumeDay(day_label=day.strftime("%a").upper(), count=count))
  return results
