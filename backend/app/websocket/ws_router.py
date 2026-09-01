from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.core.security import decode_access_token
from app.models.account import Account
from app.enums import AccountStatus
from app.websocket.connection_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
  """WebSocket clients authenticate via ?token=<jwt> since browsers/Expo
  can't attach an Authorization header to the WS handshake directly."""

  payload = decode_access_token(token)
  if payload is None:
    await websocket.close(code=4401)  # custom close code, roughly "unauthorized"
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