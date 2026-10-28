"""Turn the three methods' scores into EV-012, the anomaly report the player reads."""
import textwrap
from collections import defaultdict
from datetime import datetime, timezone

import pandas as pd

from .data import load
from .methods import METHODS, Result, drivers


def scan() -> dict:
    known, unknown = load()
    results: dict[str, Result] = {name: fn(known, unknown) for name, fn in METHODS.items()}
    moved = drivers(known, unknown)
    hours = []
    for i, ts in enumerate(unknown.ts):
        verdict = {name: bool(r.flagged[i]) for name, r in results.items()}
        if any(verdict.values()):
            hours.append({
                "ts": ts, "p_incident": round(float(results["tabpfn"].scores[i]), 3),
                "zscore": round(float(results["zscore"].scores[i]), 1), "flagged_by": [n for n, v in verdict.items() if v], "moved": moved[i],
            })
    return {
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scanned": len(unknown),
        "context": len(known),
        "methods": {n: {"detail": r.detail, "flagged": int(r.flagged.sum()), "ms": r.ms} for n, r in results.items()},
        "hours": hours,
        "report": report(results, hours, len(unknown)),
    }


WIDTH = 44  # the CRT's file reader fits about 44 characters a line


def _day(ts: str) -> str:
    return datetime.fromisoformat(ts).strftime("%d %b")


def report(results: dict[str, Result], hours: list[dict], scanned: int) -> str:
    t = results["tabpfn"]
    flagged = [h for h in hours if "tabpfn" in h["flagged_by"]]
    agreed = [h for h in flagged if len(h["flagged_by"]) == len(results)]
    split = [h for h in hours if len(h["flagged_by"]) < len(results)]
    nights: dict[str, list[dict]] = defaultdict(list)
    for h in flagged:
        nights[h["ts"][:10]].append(h)
    names = {"tabpfn": "TabPFN", "zscore": "z-score", "isolation_forest": "IsolationForest"}

    intro = (f"TabPFN v2, open weights, read the archive's labelled history in context and judged "
             f"the {scanned} hours nobody logged. A z-score and IsolationForest checked its work. "
             f"TabPFN flags {len(flagged)} hours; all three methods agree on {len(agreed)}.")
    lines = ["ORACLE · anomaly report", "", *textwrap.wrap(intro, WIDTH), "", "flagged by TabPFN           P(incident)"]
    for night, hs in nights.items():
        lo, hi = min(h["p_incident"] for h in hs), max(h["p_incident"] for h in hs)
        p = f"{hi:.2f}" if f"{lo:.2f}" == f"{hi:.2f}" else f"{lo:.2f}-{hi:.2f}"
        lines.append(f"{_day(hs[0]['ts'])}  {' '.join(h['ts'][11:16] for h in hs):<20}{p}")
    moved = sorted({m for h in flagged for m in h["moved"]})
    lines += ["", *textwrap.wrap(f"what moved: {', '.join(moved)}", WIDTH)]
    if split:
        lines += ["", "where the methods disagree"]
        for h in split:
            who = " and ".join(names[n] for n in h["flagged_by"])
            lines.append(f"{_day(h['ts'])} {h['ts'][11:16]}  {who} only")
            detail = f"TabPFN {h['p_incident']:.2f}, z {h['zscore']}" + (f", {', '.join(h['moved'])}" if h["moved"] else "")
            lines.append(f"  {detail}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(scan()["report"])
