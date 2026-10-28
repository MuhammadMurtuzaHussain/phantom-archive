"""The archive's telemetry, split the way the oracle sees it.

Labelled hours (1 Sep to 20 Oct) are the context: what normal looked like, and
the few incidents the maintenance log recorded. Unlabelled hours (21 Oct on)
are what the oracle has to judge. The `note` column is the generator's own
commentary and would leak the answer, so it never reaches a model.
"""
import os
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
TELEMETRY = Path(os.environ.get("TELEMETRY_CSV", HERE.parents[2] / "content/cases/vale/telemetry.csv"))

# What a model may look at. Not ts, label or note.
FEATURES = ["hour", "weekday", "door_badge", "door_manual", "door_denied", "rack7_kw", "archive_io_gb", "net_out_mb", "node_temp_c"]
# The sensor readings, for explaining a flag in plain words.
SENSORS = FEATURES[2:]


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(TELEMETRY, keep_default_na=False)
    known = df[df.label != ""].reset_index(drop=True)
    unknown = df[df.label == ""].reset_index(drop=True)
    return known, unknown
