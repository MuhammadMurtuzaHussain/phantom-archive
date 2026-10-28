"""The Oracle: scores the archive's telemetry for anomalies.

Phase 0 stub. Phase 2 adds TabPFN in-context classification over past nights,
with z-score and IsolationForest baselines for honest comparison.
"""
import os

from fastapi import FastAPI, Header, HTTPException

app = FastAPI(title="Phantom Oracle")
TOKEN = os.environ.get("DO_SERVICE_TOKEN", "")


@app.get("/health")
def health(authorization: str | None = Header(default=None)):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401)
    return {"ok": True, "models": ["zscore", "isolation_forest"], "tabpfn": False}
