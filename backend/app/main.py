import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import (
    locations, weather, flood, risk, alerts, auth_router, citizen, admin, data,
    earthquake, heatwave,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist yet. Run `python -m app.seed_data`
    # once to populate demo data (see backend README).
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="MausamSetu API",
    description="Hyperlocal weather & disaster intelligence platform — prototype backend.",
    version="0.1.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(locations.router)
app.include_router(weather.router)
app.include_router(flood.router)
app.include_router(risk.router)
app.include_router(alerts.router)
app.include_router(auth_router.router)
app.include_router(citizen.router)
app.include_router(admin.router)
app.include_router(data.router)
app.include_router(earthquake.router)
app.include_router(heatwave.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MausamSetu API"}
