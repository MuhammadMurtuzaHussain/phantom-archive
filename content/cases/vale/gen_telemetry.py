"""Generate the Vale Archive's hourly telemetry, 1 Sep to 31 Oct 2049 (fictional).

Rows up to 20 Oct carry labels from the archive's own maintenance records:
`normal`, or `anomalous` for the incidents someone logged. From 21 Oct on,
nobody was logging, so the label is blank. Those are the rows the oracle has
to judge. Seeded, so the file is the same on every run:

    python3 gen_telemetry.py > telemetry.csv
"""
import csv
import random
import sys
from datetime import datetime, timedelta

rng = random.Random(1031)
start = datetime(2049, 9, 1)
hours = 61 * 24
labelled_until = datetime(2049, 10, 21)

# Incidents the maintenance log recorded (hour ranges, inclusive start, exclusive end).
logged = {
    "rogue_sync": [(datetime(2049, 9, 19, 1), datetime(2049, 9, 19, 4)), (datetime(2049, 10, 14, 22), datetime(2049, 10, 15, 1))],
    "break_in": [(datetime(2049, 9, 27, 2), datetime(2049, 9, 27, 3))],
    "power_fault": [(datetime(2049, 10, 6, 13), datetime(2049, 10, 6, 15))],
}


def in_any(t, spans):
    return any(a <= t < b for a, b in spans)


w = csv.writer(sys.stdout)
w.writerow(["ts", "hour", "weekday", "door_badge", "door_manual", "door_denied", "rack7_kw", "archive_io_gb", "net_out_mb", "node_temp_c", "label", "note"])

for i in range(hours):
    t = start + timedelta(hours=i)
    h, wd = t.hour, t.weekday()
    open_hours = 9 <= h < 18 and wd < 5 and t >= datetime(2049, 9, 1)
    badge = rng.randint(2, 9) if open_hours else 0
    if h in (8, 18) and wd < 5:
        badge += 1  # operator in / out
    manual = 0
    denied = 0
    kw = round(rng.gauss(0.9 if open_hours else 0.42, 0.05), 2)
    io = round(max(0.0, rng.gauss(1.8 if open_hours else 0.2, 0.3)), 1)
    net = round(max(0.0, rng.gauss(40 if open_hours else 4, 3)), 1)
    temp = round(rng.gauss(17.5 if open_hours else 14.3, 0.3), 1)
    note = ""

    # Scheduled Sunday backup, 03:00. Normal, and it looks a bit like trouble on purpose.
    if wd == 6 and h == 3:
        kw, io, net, note = round(rng.gauss(1.6, 0.1), 2), round(rng.gauss(38, 2), 1), round(rng.gauss(900, 40), 1), "scheduled backup"

    if in_any(t, logged["rogue_sync"]):
        kw, io, net, temp, note = round(rng.gauss(2.9, 0.2), 2), round(rng.gauss(41, 3), 1), round(rng.gauss(12, 2), 1), round(temp + 2.5, 1), "logged: unscheduled bulk write"
    if in_any(t, logged["break_in"]):
        denied, note = 4, "logged: forced entry attempt"
    if in_any(t, logged["power_fault"]):
        kw, io, note = round(rng.choice([0.0, 5.1]), 2), 0.0, "logged: power fault"

    # 21-29 Oct, 01:00-04:00: Node 7 wakes. Nobody logs it. (Ines, ingesting.)
    if datetime(2049, 10, 21) <= t < datetime(2049, 10, 30) and 1 <= h < 4:
        kw, io, net, temp = round(rng.gauss(2.7, 0.15), 2), round(rng.gauss(40, 2.5), 1), round(rng.gauss(3, 1), 1), round(temp + 2.2, 1)
    # The night itself, 31 Oct: manual key at 01:58, final commit at 02:14, leaves 02:31.
    if t == datetime(2049, 10, 31, 1):
        manual = 1
    if t == datetime(2049, 10, 31, 2):
        manual, kw, io, net, temp = 1, 3.92, 9.0, 2.1, 20.3

    label = "" if t >= labelled_until else ("anomalous" if note.startswith("logged") else "normal")
    w.writerow([t.isoformat(timespec="minutes"), h, wd, badge, manual, denied, kw, io, net, temp, label, note])
