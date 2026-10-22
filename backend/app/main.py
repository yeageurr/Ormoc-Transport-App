import os
import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, accounts, vehicles, dispatch, trips, gps, incidents, geofence, notifications, audit_logs, terminals, dashboard, routes, users, dispatcher_assignments, dispatch_tickets, queue_reservations
from app.websocket import ws_router
from app.core.exceptions import register_exception_handlers
from app.jobs.close_dispatcher_assignments import close_expired_dispatcher_assignments

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "OrmocTransportApp")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
logger = logging.getLogger(__name__)


async def _dispatcher_assignment_closure_loop():
  while True:
    try:
      await asyncio.to_thread(close_expired_dispatcher_assignments)
    except Exception:
      logger.exception("Dispatcher assignment auto-closure pass failed")
    await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(_app: FastAPI):
  closure_task = asyncio.create_task(_dispatcher_assignment_closure_loop())
  try:
    yield
  finally:
    closure_task.cancel()
    with suppress(asyncio.CancelledError):
      await closure_task

app = FastAPI(
  title = APP_NAME,
  debug = DEBUG,
  version = "0.1.0",
  lifespan=lifespan,
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
app.include_router(dispatch.router, prefix="/dispatch", tags=["dispatch"])
app.include_router(trips.router, prefix="/trips", tags=["trips"])
app.include_router(gps.router, prefix="/gps", tags=["gps"])
app.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
app.include_router(geofence.router, prefix="/geofence", tags=["geofence"])
app.include_router(ws_router.router, tags=["websocket"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
app.include_router(terminals.router, prefix="/terminals", tags=["terminals"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(routes.router, prefix="/routes", tags=["routes"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(dispatcher_assignments.router, prefix="/dispatcher-assignments", tags=["dispatcher assignments"])
app.include_router(dispatch_tickets.router, prefix="/dispatch-tickets", tags=["dispatch tickets"])
app.include_router(queue_reservations.router, prefix="/queue-reservations", tags=["queue reservations"])
