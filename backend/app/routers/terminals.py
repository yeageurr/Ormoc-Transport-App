from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.terminal import Terminal
from app.schemas.terminals import TerminalResponse
from app.core.permissions import get_current_account

router = APIRouter()


@router.get("", response_model=list[TerminalResponse])
def list_terminals(db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  return db.query(Terminal).all()


@router.get("/{terminal_id}", response_model=TerminalResponse)
def get_terminal(terminal_id: int, db: Session = Depends(get_db), current_account: Account = Depends(get_current_account), ):
  terminal = db.query(Terminal).filter(Terminal.terminal_id == terminal_id).first()
  if terminal is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Terminal not found"
    )

  return terminal