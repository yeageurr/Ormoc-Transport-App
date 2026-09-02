from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.route import Route
from app.schemas.route import RouteResponse
from app.core.permissions import get_current_account

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