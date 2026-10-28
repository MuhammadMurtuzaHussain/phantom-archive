"""The Oracle: scores the archive's telemetry for anomalies.

TabPFN reads the archive's labelled history in context and judges the hours
nobody logged. A z-score and IsolationForest run beside it, so the report can
say where they disagree. The telemetry is fixed, so the scan runs once at
startup and is served from memory; POST /scan?fresh=1 runs it again.
"""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool

from .report import scan

TOKEN = os.environ.get("DO_SERVICE_TOKEN", "")
cache: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    cache["scan"] = await run_in_threadpool(scan)
    yield


app = FastAPI(title="Phantom Oracle", lifespan=lifespan)


def authorized(authorization: str | None = Header(default=None)):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401)


@app.get("/health")
def health():
    s = cache.get("scan")
    return {"ok": s is not None, "methods": list(s["methods"]) if s else [], "scanned_at": s and s["at"]}


@app.post("/scan", dependencies=[Depends(authorized)])
async def run_scan(fresh: bool = False):
    if fresh or "scan" not in cache:
        cache["scan"] = await run_in_threadpool(scan)
    return cache["scan"]
