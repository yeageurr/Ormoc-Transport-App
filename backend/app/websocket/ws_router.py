from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.core.security import decode_access_token
from app.models.account import Account
from app.enums import AccountStatus
from app.websocket.connection_manager import manager

router = APIRouter()


def _extract_token_from_cookie(websocket: WebSocket) -> str | None:
  raw = websocket.cookies.get("access_token")
  if not raw:
    return None
  if raw.startswith("Bearer "):
    return raw.split(" ", 1)[1]
  return raw


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
  """WebSocket clients authenticate via the same `access_token` httpOnly
  cookie the REST client already relies on. Browsers send cookies
  automatically on same-origin WS handshakes, so nothing needs to be
  attached to the URL — this replaces the old `?token=<jwt>` query param,
  which stopped being viable the moment the token moved into an httpOnly
  cookie (client-side JS can no longer read it to build the URL)."""

  token = _extract_token_from_cookie(websocket)
  if token is None:
    await websocket.close(code=4401)  # custom close code, roughly "unauthorized"
    return

  payload = decode_access_token(token)
  if payload is None:
    await websocket.close(code=4401)
    return

  account_id = payload.get("account_id")

  db: Session = SessionLocal()
  try:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if account is None or account.status != AccountStatus.ACTIVE:
      await websocket.close(code=4401)
      return
  finally:
    db.close()

  await manager.connect(websocket, account_id)

  try:
    while True:
      # Currently server -> client only (GPS/notification pushes).
      # Still need to receive to detect disconnects properly.
      await websocket.receive_text()
  except WebSocketDisconnect:
    manager.disconnect(account_id)
