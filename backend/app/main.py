import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, accounts, vehicles, dispatch, trips, gps, incidents, geofence
from app.websocket import ws_router

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "OrmocTransportApp")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGIN", "").split(",")

app = FastAPI(
  title = APP_NAME,
  debug = DEBUG,
  version = "0.1.0"
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_credentials=True,
  allow_headers=["*"],
  allow_methods=["*"]
)

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