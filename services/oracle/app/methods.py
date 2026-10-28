"""Three ways to judge the unlabelled hours, all scored the same way.

- zscore: per hour of day, against hours labelled normal. The game's offline fallback.
- isolation_forest: fitted on hours labelled normal, flags what doesn't isolate like them.
- tabpfn: in-context classification. The archive's labelled history is the
  context; TabPFN reads it in one forward pass and gives each new hour a
  probability of being an incident. No training, no tuning.

Each returns one score per unlabelled hour and a boolean flag.
"""
import time
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .data import FEATURES, SENSORS


@dataclass
class Result:
    method: str
    detail: str
    scores: np.ndarray
    flagged: np.ndarray
    ms: int


def _zs(known: pd.DataFrame, unknown: pd.DataFrame) -> pd.DataFrame:
    """|z| of every sensor against normal hours at the same hour of day."""
    normal = known[known.label == "normal"]
    stats = normal.groupby("hour")[SENSORS].agg(["mean", "std"])
    out = {}
    for f in SENSORS:
        mean = unknown.hour.map(stats[(f, "mean")])
        sd = unknown.hour.map(stats[(f, "std")]).fillna(0).clip(lower=0.05)
        out[f] = (unknown[f] - mean).abs() / sd
    return pd.DataFrame(out)


def drivers(known: pd.DataFrame, unknown: pd.DataFrame, top: int = 3) -> list[list[str]]:
    """The sensors furthest from normal for each hour: what moved, not why a model flagged it."""
    z = _zs(known, unknown)
    return [[f for f in row.sort_values(ascending=False).index[:top] if row[f] >= 4] for _, row in z.iterrows()]


def zscore(known: pd.DataFrame, unknown: pd.DataFrame, threshold: float = 6.0) -> Result:
    t = time.perf_counter()
    score = _zs(known, unknown).max(axis=1).to_numpy()
    n = int((known.label == "normal").sum())
    return Result("zscore", f"|z| ≥ {threshold:g} on any sensor, per hour of day, against {n} hours labelled normal",
                  score, score >= threshold, int((time.perf_counter() - t) * 1000))


def isolation_forest(known: pd.DataFrame, unknown: pd.DataFrame) -> Result:
    t = time.perf_counter()
    normal = known[known.label == "normal"][FEATURES]
    # Flag what looks stranger than the strangest 1% of normal hours.
    model = IsolationForest(n_estimators=300, contamination=0.01, random_state=1031).fit(normal)
    score = -model.decision_function(unknown[FEATURES])
    return Result("isolation_forest", f"300 trees fitted on {len(normal)} hours labelled normal; threshold at the strangest 1% of them",
                  score, score > 0, int((time.perf_counter() - t) * 1000))


_tabpfn = None


def tabpfn(known: pd.DataFrame, unknown: pd.DataFrame, threshold: float = 0.5) -> Result:
    global _tabpfn
    from tabpfn import TabPFNClassifier
    from tabpfn.constants import ModelVersion

    t = time.perf_counter()
    if _tabpfn is None:
        # v2: open weights under the Prior Labs License (Apache 2.0 with attribution), no gate.
        # 1,200 context rows is just over TabPFN's 1,000-row CPU default; it's measured, and fast enough.
        _tabpfn = TabPFNClassifier.create_default_for_version(
            ModelVersion.V2, device="cpu", random_state=1031, ignore_pretraining_limits=True)
    y = (known.label == "anomalous").astype(int)
    _tabpfn.fit(known[FEATURES], y)
    p = _tabpfn.predict_proba(unknown[FEATURES])[:, 1]
    n_bad = int(y.sum())
    return Result("tabpfn", f"TabPFN v2 in-context classification: {len(known)} labelled hours ({n_bad} logged incidents) as context, P(incident) ≥ {threshold:g}",
                  p, p >= threshold, int((time.perf_counter() - t) * 1000))


METHODS = {"zscore": zscore, "isolation_forest": isolation_forest, "tabpfn": tabpfn}
