from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.trip import Trip
from app.models.incident_log import Incident
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse, IncidentReporterSummary, IncidentRouteSummary
from app.core.permissions import require_role, get_current_account
from app.enums import AccountRole, IncidentStatus

router = APIRouter()


def _build_incident_response(incident: Incident) -> IncidentResponse:
  """IncidentResponse.reporter/route don't map directly to model attribute
  names (the relationships are named reported_by_user, dispatch_log.route),
  so this manually assembles the nested summaries the frontend table needs."""
  reporter = None
  if incident.reported_by_user:
    reporter = IncidentReporterSummary.model_validate(incident.reported_by_user)

  route = None
  trip_route = incident.trip.dispatch_log.route if incident.trip and incident.trip.dispatch_log else None
  if trip_route:
    route = IncidentRouteSummary(
      route_id=trip_route.route_id,
      route_name=trip_route.destination.name if trip_route.destination else None,
    )

  response = IncidentResponse.model_validate(incident)
  response.reporter = reporter
  response.route = route
  return response


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def report_incident(
  payload: IncidentCreate,
  db: Session = Depends(get_db),
  current_driver: Account = Depends(require_role(AccountRole.DRIVER)),
):
  """Driver reports an incident during a trip. reported_by is derived
  server-side from the current driver — never trusted from the client."""

  trip = db.query(Trip).filter(Trip.trip_id == payload.trip_id).first()
  if trip is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

  if trip.dispatch_log.driver.account_id != current_driver.account_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="This trip does not belong to you",
    )

  incident = Incident(
    trip_id=payload.trip_id,
    reported_by=current_driver.user.user_id,
    incident_type=payload.incident_type,
    description=payload.description,
    latitude=payload.latitude,
    longitude=payload.longitude,
    status=IncidentStatus.OPEN,
  )
  db.add(incident)
  db.commit()
  db.refresh(incident)

  from app.routers.notifications import send_route_broadcast
  from app.enums import BroadcastType
  route_id = trip.dispatch_log.route_id
  await send_route_broadcast(db, BroadcastType.INCIDENT, terminal_id=None, route_id=route_id)

  return _build_incident_response(incident)


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  incidents = db.query(Incident).order_by(Incident.reported_at.desc()).all()
  return [_build_incident_response(i) for i in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
  incident_id: int,
  db: Session = Depends(get_db),
  current_account: Account = Depends(get_current_account),
):
  incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
  if incident is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
  return _build_incident_response(incident)


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
  incident_id: int,
  payload: IncidentUpdate,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Admin moves an incident through its lifecycle. If status is being
  set to RESOLVED, resolved_by/resolved_at are stamped automatically."""

  incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
  if incident is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

  update_data = payload.model_dump(exclude_unset=True)

  if "status" in update_data:
    new_status = update_data["status"]
    if new_status == IncidentStatus.RESOLVED and incident.status != IncidentStatus.RESOLVED:
      incident.resolved_by = current_admin.account_id
      incident.resolved_at = datetime.now(timezone.utc)

  for field, value in update_data.items():
    setattr(incident, field, value)

  incident.updated_by = current_admin.account_id
  incident.updated_at = datetime.now(timezone.utc)

  db.commit()
  db.refresh(incident)

  return _build_incident_response(incident)