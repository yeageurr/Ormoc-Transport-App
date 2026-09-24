from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.route import Route
from app.schemas.route import RouteDirectionsRequest, RouteGeometry, RouteResponse
from app.core.permissions import get_current_account, require_role
from app.enums import AccountRole, AuditAction
from app.services.audit_service import log_action
from app.services.mapbox_directions_service import get_driving_route

router = APIRouter()


@router.get("", response_model=list[RouteResponse])
def list_routes(db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  return db.query(Route).all()


@router.get("/{route_id}", response_model=RouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  route = db.query(Route).filter(Route.route_id == route_id).first()

  if route is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Route not found"
    )

  return route


@router.patch("/{route_id}/geometry", response_model=RouteResponse)
def update_route_geometry(
  route_id: int,
  payload: RouteGeometry,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Replace a route's verified outbound GeoJSON line without changing its history."""
  route = db.query(Route).filter(Route.route_id == route_id).first()
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

  route.route_geometry = payload.model_dump(mode="json")
  db.commit()
  db.refresh(route)
  log_action(
    db,
    current_admin.account_id,
    AuditAction.UPDATE,
    "routes",
    route.route_id,
    f"Updated verified route geometry with {len(payload.coordinates)} coordinates",
  )
  return route


@router.post("/{route_id}/geometry/directions", response_model=RouteResponse)
def generate_route_geometry(
  route_id: int,
  payload: RouteDirectionsRequest,
  db: Session = Depends(get_db),
  current_admin: Account = Depends(require_role(AccountRole.ADMIN)),
):
  """Generate and save a road-following route via Mapbox Directions.

  Add ordered ``via`` points to keep the generated line on the official PUV route.
  """
  route = db.query(Route).filter(Route.route_id == route_id).first()
  if route is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
  if route.origin is None or route.destination is None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Route origin or destination is missing")

  terminal = route.origin
  coordinates = [
    (
      float((terminal.min_longitude + terminal.max_longitude) / 2),
      float((terminal.min_latitude + terminal.max_latitude) / 2),
    ),
    *payload.via,
    (float(route.destination.longitude), float(route.destination.latitude)),
  ]
  generated = get_driving_route(coordinates)
  if generated is None:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Mapbox Directions is unavailable. Check MAPBOX_DIRECTIONS_ACCESS_TOKEN and try again.",
    )

  geometry = RouteGeometry.model_validate(generated.geometry)
  route.route_geometry = geometry.model_dump(mode="json")
  route.distance = generated.distance_km
  route.average_travel_duration = generated.duration_minutes
  db.commit()
  db.refresh(route)
  log_action(
    db,
    current_admin.account_id,
    AuditAction.UPDATE,
    "routes",
    route.route_id,
    f"Generated Mapbox Directions geometry with {len(geometry.coordinates)} coordinates via {len(payload.via)} checkpoints",
  )
  return route
