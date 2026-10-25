"""FastAPI service for the AIRFLOW React dashboard."""

from __future__ import annotations

import os
import threading
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import tensorflow as tf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Input, LSTM


ROOT = Path(__file__).resolve().parent
DATA_PATH = Path(os.environ.get("AIRFLOW_DATA_PATH", ROOT / "data" / "aqi.csv"))
POLLUTANT_PATH = Path(os.environ.get("AIRFLOW_POLLUTANT_PATH", ROOT / "data" / "cpcb_caaqm_daily_pm_2025-05_to_2025-09.csv"))
AQI_FEATURE = "AQI"
LOOKBACK = 7
MIN_DAYS = 30
TRAINING_LOCK = threading.Lock()

app = FastAPI(title="AIRFLOW Air Quality API", version="1.0.0")
cors_origins = {
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    *(origin.strip() for origin in os.environ.get("AIRFLOW_CORS_ORIGINS", "").split(",") if origin.strip()),
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(cors_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@lru_cache(maxsize=1)
def load_dataset() -> pd.DataFrame:
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")
    frame = pd.read_csv(DATA_PATH)
    columns = {str(column).strip().casefold(): column for column in frame.columns}
    city_column = columns.get("city", columns.get("area"))
    date_column = columns.get("date")
    aqi_column = columns.get("aqi", columns.get("aqi_value"))
    if city_column is None or date_column is None or aqi_column is None:
        raise ValueError("AQI dataset must contain area/city, date, and aqi_value/AQI columns.")
    frame = frame.rename(columns={city_column: "City", date_column: "Date", aqi_column: AQI_FEATURE})
    frame["Date"] = pd.to_datetime(frame["Date"], dayfirst=True, errors="coerce")
    frame["City"] = frame["City"].astype("string").str.strip()
    frame[AQI_FEATURE] = pd.to_numeric(frame[AQI_FEATURE], errors="coerce")
    frame = frame.dropna(subset=["City", "Date", AQI_FEATURE])
    return frame.groupby(["City", "Date"], as_index=False)[AQI_FEATURE].mean()


@lru_cache(maxsize=1)
def load_external_pm() -> pd.DataFrame:
    if not POLLUTANT_PATH.is_file():
        return pd.DataFrame(columns=["City", "Date", "PM2.5", "PM10"])
    frame = pd.read_csv(POLLUTANT_PATH)
    required = {"city_name", "period_start", "parameter_name", "mean"}
    if not required.issubset(frame.columns):
        raise ValueError(f"Supplementary pollutant dataset must contain {', '.join(sorted(required))}.")
    frame["Date"] = pd.to_datetime(frame["period_start"], errors="coerce").dt.normalize()
    frame["City"] = frame["city_name"].astype("string").str.strip()
    frame["mean"] = pd.to_numeric(frame["mean"], errors="coerce")
    frame = frame.dropna(subset=["City", "Date", "mean"])
    frame["parameter_name"] = frame["parameter_name"].replace({"PM2.5": "PM2.5", "PM10": "PM10"})
    frame = frame.loc[frame["parameter_name"].isin(["PM2.5", "PM10"])]
    # A city/day value is the unweighted mean of the reporting stations' daily means.
    pivot = frame.groupby(["City", "Date", "parameter_name"])["mean"].mean().unstack("parameter_name")
    pivot = pivot.rename(columns={"PM2.5": "PM2.5", "PM10": "PM10"}).reset_index()
    return pivot


def _city_key(city: str) -> str:
    key = " ".join(str(city).strip().casefold().split())
    aliases = {"bangalore": "bengaluru", "gurgaon": "gurugram", "mysore": "mysuru", "amaravathi": "amaravati"}
    return aliases.get(key, key)


@lru_cache(maxsize=32)
def get_city_data(city: str) -> pd.DataFrame:
    frame = load_dataset()
    city_frame = frame.loc[frame["City"].map(_city_key) == _city_key(city), ["Date", AQI_FEATURE]].copy()
    if city_frame.empty:
        raise KeyError(city)
    city_frame = city_frame.groupby("Date", as_index=False)[AQI_FEATURE].mean().set_index("Date")
    city_frame = city_frame.asfreq("D")
    city_frame[AQI_FEATURE] = city_frame[AQI_FEATURE].interpolate(method="time", limit=3)
    city_frame = city_frame.dropna(subset=[AQI_FEATURE])
    if len(city_frame) < MIN_DAYS:
        raise ValueError(f"{city} has fewer than {MIN_DAYS} usable daily records.")
    return city_frame


@lru_cache(maxsize=64)
def get_city_history(city: str) -> pd.DataFrame:
    aqi = load_dataset()
    city_aqi = aqi.loc[aqi["City"].map(_city_key) == _city_key(city), ["Date", AQI_FEATURE]].copy()
    if city_aqi.empty:
        raise KeyError(city)
    city_aqi = city_aqi.groupby("Date")[AQI_FEATURE].mean()
    pollutants = load_external_pm()
    city_pm = pollutants.loc[pollutants["City"].map(_city_key) == _city_key(city)]
    if city_pm.empty:
        result = city_aqi.to_frame()
        result["PM2.5"] = np.nan
        result["PM10"] = np.nan
    else:
        city_pm = city_pm.groupby("Date")[["PM2.5", "PM10"]].mean()
        result = city_aqi.to_frame().join(city_pm, how="outer")
    result.index.name = "Date"
    return result.sort_index()


def _round(value: float, digits: int = 2) -> float:
    return round(float(value), digits)


def _category(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Satisfactory"
    if aqi <= 200:
        return "Moderate"
    if aqi <= 300:
        return "Poor"
    if aqi <= 400:
        return "Very Poor"
    return "Severe"


class PredictionRequest(BaseModel):
    station: str
    from_date: date = Field(alias="fromDate")
    to_date: date = Field(alias="toDate")
    horizon: Literal[1, 3, 7]


def _fit_and_forecast(data: pd.DataFrame, horizon: int) -> list[dict[str, float | str | None]]:
    values = data[[AQI_FEATURE]].to_numpy(dtype=np.float32)
    split = int(len(values) * 0.8)
    split = min(max(split, LOOKBACK + 1), len(values) - 1)
    scaler = MinMaxScaler()
    train_scaled = scaler.fit_transform(values[:split]).astype(np.float32)

    sequences = np.array(
        [train_scaled[i - LOOKBACK : i] for i in range(LOOKBACK, len(train_scaled))],
        dtype=np.float32,
    )
    targets = train_scaled[LOOKBACK:]
    if not len(sequences):
        raise ValueError(f"Select at least {LOOKBACK + 2} days of data to train the model.")

    tf.keras.utils.set_random_seed(42)
    model = Sequential(
        [
            Input(shape=(LOOKBACK, 1)),
            LSTM(32, activation="tanh"),
            Dense(16, activation="relu"),
            Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    model.fit(sequences, targets, epochs=5, batch_size=32, verbose=0, shuffle=False)

    recent_scaled = scaler.transform(values[-LOOKBACK:]).astype(np.float32)
    forecast: list[dict[str, float | str | None]] = []
    next_date = data.index[-1].date()
    for step in range(1, horizon + 1):
        predicted_scaled = model.predict(recent_scaled[np.newaxis, ...], verbose=0)[0]
        predicted_aqi = float(np.clip(scaler.inverse_transform(predicted_scaled.reshape(1, -1))[0, 0], 0, 500))
        forecast_date = next_date + timedelta(days=step)
        forecast.append(
            {
                "date": forecast_date.isoformat(),
                "pm25": None,
                "pm10": None,
                "aqi": _round(predicted_aqi),
                "isForecast": True,
            }
        )
        recent_scaled = np.concatenate([recent_scaled[1:], scaler.transform([[predicted_aqi]]).astype(np.float32)], axis=0)
    return forecast


@app.get("/api/health")
def health() -> dict[str, object]:
    try:
        frame = load_dataset()
        pollutant_frame = load_external_pm()
        return {
            "status": "ok",
            "dataset": DATA_PATH.name,
            "supplementaryPollutants": POLLUTANT_PATH.name if POLLUTANT_PATH.is_file() else None,
            "cityCount": int(frame["City"].nunique()),
            "startDate": frame["Date"].min().date().isoformat(),
            "endDate": frame["Date"].max().date().isoformat(),
            "pollutantStartDate": pollutant_frame["Date"].min().date().isoformat() if not pollutant_frame.empty else None,
            "pollutantEndDate": pollutant_frame["Date"].max().date().isoformat() if not pollutant_frame.empty else None,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/history")
def history(station: str | None = Query(default=None)) -> dict[str, object]:
    try:
        if station is None:
            frame = load_dataset()
            stations = []
            city_stats = frame.groupby("City")["Date"].agg(start="min", end="max", days="nunique")
            for city, stats in city_stats.sort_index().iterrows():
                if int(stats["days"]) < MIN_DAYS:
                    continue
                stations.append(
                    {
                        "id": city,
                        "name": city,
                        "region": "India",
                        "startDate": stats["start"].date().isoformat(),
                        "endDate": stats["end"].date().isoformat(),
                    }
                )
            return {"stations": stations}

        city_data = get_city_data(station)
        history_data = get_city_history(station)
        points = [
            {
                "date": timestamp.date().isoformat(),
                "aqi": _round(row[AQI_FEATURE]) if pd.notna(row[AQI_FEATURE]) else None,
                "pm25": _round(row["PM2.5"]) if pd.notna(row["PM2.5"]) else None,
                "pm10": _round(row["PM10"]) if pd.notna(row["PM10"]) else None,
            }
            for timestamp, row in history_data.iterrows()
        ]
        return {"history": points}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown city: {station}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/predict")
def predict(request: PredictionRequest) -> dict[str, object]:
    if request.from_date > request.to_date:
        raise HTTPException(status_code=422, detail="From date must be on or before the to date.")
    try:
        city_data = get_city_data(request.station)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown city: {request.station}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    selected = city_data.loc[str(request.from_date) : str(request.to_date)]
    if len(selected) < MIN_DAYS:
        raise HTTPException(
            status_code=422,
            detail=f"The selected date range has {len(selected)} daily records. Choose at least {MIN_DAYS} days.",
        )

    try:
        with TRAINING_LOCK:
            forecast = _fit_and_forecast(selected, request.horizon)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model training or prediction failed: {exc}") from exc

    selected_history = get_city_history(request.station).reindex(selected.index)
    observed = [
        {
            "date": timestamp.date().isoformat(),
            "aqi": _round(row[AQI_FEATURE]) if pd.notna(row[AQI_FEATURE]) else None,
            "pm25": _round(row["PM2.5"]) if pd.notna(row["PM2.5"]) else None,
            "pm10": _round(row["PM10"]) if pd.notna(row["PM10"]) else None,
            "isForecast": False,
        }
        for timestamp, row in selected_history.tail(21).iterrows()
    ]
    final = forecast[-1]
    baseline = float(selected[AQI_FEATURE].iloc[-1])
    delta = float(final["aqi"]) - baseline
    trend = "improving" if delta < -12 else "worsening" if delta > 12 else "stable"
    return {
        "station": request.station,
        "generatedAt": datetime.now().astimezone().isoformat(),
        "horizon": request.horizon,
        "history": observed,
        "forecast": forecast,
        "predictedAqi": final["aqi"],
        "predictedPm25": final["pm25"],
        "predictedPm10": final["pm10"],
        "forecastDate": final["date"],
        "category": _category(float(final["aqi"])),
        "trend": trend,
        "modelMeta": {
            "name": "AIRFLOW-LSTM",
            "version": "1.0.0",
            "trainedOn": f"{DATA_PATH.name} · {len(selected):,} daily AQI records",
            "lookback": LOOKBACK,
        },
    }
