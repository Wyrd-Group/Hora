"""
MSS FastAPI — main entry point.
Run: uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import db, redis as redis_core
from core.config import settings
from models.entities import ApiHealth
from routers import analytics, entities, forecasting, macro, market_data, maven, nlp, portfolio, reports, shap, training, websocket

logging.basicConfig(level=settings.log_level.upper())
log = logging.getLogger(__name__)

_start_time = time.monotonic()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    log.info("MSS API starting up — version=%s", settings.app_version)
    await db.startup()
    await redis_core.startup()
    log.info("DB and Redis connections ready")
    yield
    log.info("MSS API shutting down")
    await db.shutdown()
    await redis_core.shutdown()


app = FastAPI(
    title       = "MSS API",
    version     = settings.app_version,
    description = "Maven Smart System — geospatial intelligence backend",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # Tighten in production via env
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analytics.router)
app.include_router(entities.router)
app.include_router(forecasting.router)
app.include_router(macro.router)
app.include_router(market_data.router)
app.include_router(maven.router)
app.include_router(nlp.router)
app.include_router(portfolio.router)
app.include_router(reports.router)
app.include_router(shap.router)
app.include_router(training.router)
app.include_router(websocket.router)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", response_model=ApiHealth, tags=["meta"])
async def health() -> ApiHealth:
    return ApiHealth(
        status  = "ok",
        version = settings.app_version,
        uptime  = round(time.monotonic() - _start_time, 2),
    )
