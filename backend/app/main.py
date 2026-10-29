import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, accounts, vehicles, trips, gps, geofence, notifications, audit_logs, terminals, dashboard, routes, users, commuter, eta
from app.websocket import ws_router
from app.core.exceptions import register_exception_handlers

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "OrmocTransportApp")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_ORIGINS = [
  origin.strip().rstrip("/")
  for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
  if origin.strip()
]
app = FastAPI(
  title = APP_NAME,
  debug = DEBUG,
  version = "0.1.0",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_credentials=True,
  allow_headers=["*"],
  allow_methods=["*"]
)

register_exception_handlers(app)

@app.get("/")
def root():
  return {"app": APP_NAME, "status": "running"}


@app.get("/health")
def health_check():
  return {"status": "ok"}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
app.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
app.include_router(trips.router, prefix="/trips", tags=["trips"])
app.include_router(gps.router, prefix="/gps", tags=["gps"])
app.include_router(eta.router, prefix="/eta", tags=["eta"])
app.include_router(geofence.router, prefix="/geofence", tags=["geofence"])
app.include_router(ws_router.router, tags=["websocket"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
app.include_router(terminals.router, prefix="/terminals", tags=["terminals"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(routes.router, prefix="/routes", tags=["routes"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(commuter.router, prefix="/public", tags=["commuter public data"])
