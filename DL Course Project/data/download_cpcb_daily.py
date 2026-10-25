"""Download the CPCB CAAQM daily PM archive from the XKDR open database.

The archive contains pollutant concentrations, not AQI. This script keeps
station-level measurements and source metadata separate so values are not
mistaken for city AQI or fabricated into an AQI value.
"""

from __future__ import annotations

import csv
import io
import json
import os
import time
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BASE_URL = "https://airquality.xkdr.org"
DEFAULT_DEMO_KEY = "aqi_demo_wbf92Qx21zX-Wa_Tg8Dx1nXe"
START = date(2025, 5, 1)
END = date(2025, 9, 1)
PARAMETERS = ("PM2.5", "PM10")
FIELDS = ("station_id", "parameter_name", "unit", "period_start", "mean", "min", "max", "n")


def get(url: str, key: str) -> tuple[bytes, dict[str, str]]:
    request = Request(url, headers={"Authorization": f"Bearer {key}", "User-Agent": "AIRFLOW-course-project/1.0"})
    for attempt in range(4):
        try:
            with urlopen(request, timeout=45) as response:
                return response.read(), {k.lower(): v for k, v in response.headers.items()}
        except (HTTPError, URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def main() -> None:
    key = os.environ.get("XKDR_API_KEY", DEFAULT_DEMO_KEY)
    raw, _ = get(f"{BASE_URL}/v1/stations?source=cpcb_caaqm&format=csv", key)
    station_path = DATA / "cpcb_caaqm_stations.csv"
    station_path.write_bytes(raw)
    station_by_id = {row["station_id"]: row for row in csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))}

    target = DATA / "cpcb_caaqm_daily_pm_2025-05_to_2025-09.csv"
    temp = target.with_suffix(".csv.part")
    output_fields = [*FIELDS, "station_name", "city_name", "state_name", "source"]
    chunks: list[dict[str, str]] = []
    api_rows = 0
    start = START
    while start <= END:
        end = min(start + timedelta(days=6), END)
        params = [
            ("source", "cpcb_caaqm"), ("start", start.isoformat()), ("end", end.isoformat()),
            ("agg", "daily"), ("format", "csv"), ("limit", "10000"),
            *(("parameter", parameter) for parameter in PARAMETERS),
        ]
        url = f"{BASE_URL}/v1/measurements?{urlencode(params)}"
        body, response_headers = get(url, key)
        if response_headers.get("x-truncated", "false").lower() == "true":
            end = min(start + timedelta(days=2), END)
            params[2] = ("end", end.isoformat())
            body, response_headers = get(f"{BASE_URL}/v1/measurements?{urlencode(params)}", key)
            if response_headers.get("x-truncated", "false").lower() == "true":
                raise RuntimeError(f"Archive response still truncated for {start} through {end}.")
        for row in csv.DictReader(io.StringIO(body.decode("utf-8-sig"))):
            station = station_by_id.get(row.get("station_id", ""), {})
            chunks.append({
                **{field: row.get(field, "") for field in FIELDS},
                "station_name": station.get("station_name", ""),
                "city_name": station.get("city_name", ""),
                "state_name": station.get("state_name", ""),
                "source": "cpcb_caaqm",
            })
        api_rows += int(response_headers.get("x-row-count", "0") or 0)
        print(f"Downloaded {start} to {end}: {response_headers.get('x-row-count', '0')} rows")
        start = end + timedelta(days=1)

    with temp.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_fields)
        writer.writeheader()
        writer.writerows(chunks)
    temp.replace(target)

    meta, _ = get(f"{BASE_URL}/v1/meta", key)
    metadata = {
        "dataset": "India Air Quality Database, XKDR Forum",
        "source": "CPCB Continuous Ambient Air Quality Monitoring network (CAAQM)",
        "source_url": "https://airquality.xkdr.org/",
        "api_url": f"{BASE_URL}/v1/measurements",
        "license": "Creative Commons Attribution 4.0 (CC BY 4.0)",
        "attribution": "XKDR Forum (2026), India Air Quality Database; source network: CPCB CAAQM",
        "downloaded_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "coverage_requested": {"start": START.isoformat(), "end": END.isoformat()},
        "coverage_returned": {
            "start": min(row["period_start"][:10] for row in chunks) if chunks else None,
            "end": max(row["period_start"][:10] for row in chunks) if chunks else None,
            "city_count": len({row["city_name"] for row in chunks if row["city_name"]}),
        },
        "aggregation": "Daily mean/min/max/count per station and pollutant; timestamps are IST.",
        "parameters": list(PARAMETERS),
        "rows_downloaded": len(chunks),
        "api_rows_reported": api_rows,
        "stations_file": station_path.name,
        "measurements_file": target.name,
        "archive_snapshot": json.loads(meta).get("measurements", {}),
        "limitations": "Measurements are published as received without validation or gap filling. This archive does not publish AQI; no AQI was derived from these two pollutants. Direct API queries returned no rows after 2025-09-01 even though archive-level metadata reports later coverage; only returned observations are saved.",
    }
    (DATA / "cpcb_caaqm_source.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved {len(chunks)} measurements to {target}")


if __name__ == "__main__":
    main()
