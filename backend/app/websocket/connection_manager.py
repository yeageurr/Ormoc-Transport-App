from fastapi import WebSocket


class ConnectionManager:
  """Single in-memory manager — no Redis. Tracks connections by account_id
  (not a flat list) so broadcasts can be selectively targeted, e.g. only
  to drivers currently dispatched on a specific route."""

  def __init__(self):
    self.active_connections: dict[int, WebSocket] = {}

  async def connect(self, websocket: WebSocket, account_id: int):
    await websocket.accept()
    self.active_connections[account_id] = websocket

  def disconnect(self, account_id: int):
    self.active_connections.pop(account_id, None)

  async def send_to(self, account_id: int, message: dict):
    connection = self.active_connections.get(account_id)
    if connection:
      await connection.send_json(message)

  async def broadcast_to(self, account_ids: list[int], message: dict):
    for account_id in account_ids:
      await self.send_to(account_id, message)

  async def broadcast_all(self, message: dict):
    for connection in self.active_connections.values():
      await connection.send_json(message)

  def is_connected(self, account_id: int) -> bool:
    return account_id in self.active_connections


# Single shared instance, imported wherever a broadcast needs to happen
manager = ConnectionManager()