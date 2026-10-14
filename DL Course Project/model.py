"""
model.py - Air Quality Prediction Using LSTM
Handles data preprocessing, sequence generation, LSTM model construction,
training, evaluation, and next-day forecasting for PM2.5 and AQI.
"""

import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input


def load_dataset(filepath="data/city_day.csv"):
    """
    Loads city_day.csv from the given path.
    Returns pandas DataFrame or raises FileNotFoundError.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset not found at {filepath}")
    df = pd.read_csv(filepath)
    return df


def get_available_cities(df):
    """
    Returns a sorted list of unique cities available in the dataset.
    """
    if "City" not in df.columns:
        raise ValueError("Column 'City' not found in dataset.")
    cities = sorted(df["City"].dropna().unique().tolist())
    return cities


def preprocess_city_data(df, city):
    """
    Filters data for a specific city, parses dates, handles missing values,
    and returns a clean DataFrame sorted by Date.
    """
    city_df = df[df["City"] == city].copy()
    if city_df.empty:
        raise ValueError(f"No records found for city: {city}")

    # Ensure Date column is datetime and sort chronologically
    city_df["Date"] = pd.to_datetime(city_df["Date"])
    city_df = city_df.sort_values("Date").reset_index(drop=True)

    # Select target features: PM2.5 and AQI
    if "PM2.5" not in city_df.columns or "AQI" not in city_df.columns:
        raise ValueError("Dataset must contain 'PM2.5' and 'AQI' columns.")

    # Clean missing values: linear interpolation across time, followed by bfill and ffill
    city_df["PM2.5"] = city_df["PM2.5"].interpolate(method="linear").bfill().ffill()
    city_df["AQI"] = city_df["AQI"].interpolate(method="linear").bfill().ffill()

    # Drop any remaining unfillable rows
    city_df = city_df.dropna(subset=["PM2.5", "AQI"]).reset_index(drop=True)

    if len(city_df) < 30:
        raise ValueError(
            f"Insufficient data for {city} ({len(city_df)} days available, at least 30 required)."
        )

    return city_df


def create_sequences(data, window_size=7):
    """
    Converts 2D array of features into sliding window sequences:
    X: (N - window_size, window_size, num_features)
    y: (N - window_size, num_features)
    """
    X, y = [], []
    for i in range(len(data) - window_size):
        X.append(data[i : i + window_size])
        y.append(data[i + window_size])
    return np.array(X), np.array(y)


def prepare_train_test_data(city_df, window_size=7, train_split=0.8):
    """
    Splits city data chronologically into train and test sets.
    Fits MinMaxScaler on training data only to avoid data leakage.
    Returns processed training/testing arrays, scaler, and test dates.
    """
    feature_cols = ["PM2.5", "AQI"]
    data_values = city_df[feature_cols].values

    # Chronological date split
    split_idx = int(len(city_df) * train_split)
    train_raw = data_values[:split_idx]
    test_raw = data_values[split_idx:]
    test_dates = city_df["Date"].iloc[split_idx:].reset_index(drop=True)

    if len(test_raw) == 0:
        raise ValueError("Dataset is too small to perform train-test split.")

    # Fit scaler strictly on training data
    scaler = MinMaxScaler(feature_range=(0, 1))
    train_scaled = scaler.fit_transform(train_raw)
    test_scaled = scaler.transform(test_raw)

    # Create training sequences
    X_train, y_train = create_sequences(train_scaled, window_size=window_size)

    # To predict all points in the test set without leakage, prepend the last
    # window_size days of training data to the test sequence inputs
    combined_test_scaled = np.vstack([train_scaled[-window_size:], test_scaled])
    X_test, y_test = create_sequences(combined_test_scaled, window_size=window_size)

    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_test": X_test,
        "y_test": y_test,
        "scaler": scaler,
        "train_df": city_df.iloc[:split_idx].copy(),
        "test_df": city_df.iloc[split_idx:].copy(),
        "test_dates": test_dates,
    }


def build_lstm_model(input_shape=(7, 2)):
    """
    Constructs a lightweight, beginner-friendly LSTM network.
    Input: (7 days, 2 features [PM2.5, AQI])
    Output: (2 values [Next-day PM2.5, Next-day AQI])
    """
    model = Sequential([
        Input(shape=input_shape),
        LSTM(32, activation="tanh", return_sequences=False),
        Dense(16, activation="relu"),
        Dense(2)  # Output next-day PM2.5 and AQI
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def train_lstm_model(model, X_train, y_train, epochs=10, batch_size=16, verbose=1):
    """
    Trains the LSTM model with standard parameters.
    """
    history = model.fit(
        X_train,
        y_train,
        epochs=epochs,
        batch_size=batch_size,
        verbose=verbose,
        shuffle=False
    )
    return history


def evaluate_model(model, X_test, y_test, scaler):
    """
    Computes actual vs. predicted values and evaluates MAE and RMSE metrics
    on unscaled values.
    """
    y_pred_scaled = model.predict(X_test, verbose=0)

    # Inverse transform to original PM2.5 and AQI units
    y_pred = scaler.inverse_transform(y_pred_scaled)
    y_true = scaler.inverse_transform(y_test)

    # Ensure predictions are physically realistic (>= 0)
    y_pred = np.clip(y_pred, 0, None)

    # PM2.5 metrics
    mae_pm25 = mean_absolute_error(y_true[:, 0], y_pred[:, 0])
    rmse_pm25 = float(np.sqrt(mean_squared_error(y_true[:, 0], y_pred[:, 0])))

    # AQI metrics
    mae_aqi = mean_absolute_error(y_true[:, 1], y_pred[:, 1])
    rmse_aqi = float(np.sqrt(mean_squared_error(y_true[:, 1], y_pred[:, 1])))

    metrics = {
        "pm25_mae": float(mae_pm25),
        "pm25_rmse": float(rmse_pm25),
        "aqi_mae": float(mae_aqi),
        "aqi_rmse": float(rmse_aqi)
    }

    return metrics, y_true, y_pred


def predict_next_day(model, recent_df, scaler, window_size=7):
    """
    Uses the latest 7 consecutive days of air quality data to forecast
    the next day's PM2.5 and AQI.
    """
    if len(recent_df) < window_size:
        raise ValueError(f"Need at least {window_size} days of recent data.")

    last_window = recent_df[["PM2.5", "AQI"]].iloc[-window_size:].values
    last_window_scaled = scaler.transform(last_window)

    input_seq = np.expand_dims(last_window_scaled, axis=0)  # Shape: (1, 7, 2)
    pred_scaled = model.predict(input_seq, verbose=0)
    pred_unscaled = scaler.inverse_transform(pred_scaled)
    pred_unscaled = np.clip(pred_unscaled, 0, None)

    next_pm25 = float(pred_unscaled[0, 0])
    next_aqi = float(pred_unscaled[0, 1])

    return next_pm25, next_aqi


def generate_sample_dataset(filepath="data/city_day.csv"):
    """
    Creates a small synthetic sample dataset structured like Kaggle's city_day.csv
    for quick local testing and verification without downloading the full archive.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    dates = pd.date_range(start="2018-01-01", end="2020-06-30", freq="D")
    records = []

    cities = ["Delhi", "Mumbai", "Bengaluru"]
    np.random.seed(42)

    for city in cities:
        base_pm25 = 120.0 if city == "Delhi" else (65.0 if city == "Mumbai" else 40.0)
        base_aqi = 210.0 if city == "Delhi" else (130.0 if city == "Mumbai" else 85.0)

        # Generate realistic periodic seasonal variations + random noise
        n = len(dates)
        seasonal = 35.0 * np.sin(2 * np.pi * np.arange(n) / 365.25)
        noise_pm25 = np.random.normal(0, 15, size=n)
        noise_aqi = np.random.normal(0, 25, size=n)

        pm25 = np.clip(base_pm25 + seasonal + noise_pm25, 5, 500)
        aqi = np.clip(base_aqi + 1.4 * seasonal + noise_aqi, 10, 500)

        for d, p, a in zip(dates, pm25, aqi):
            records.append({
                "City": city,
                "Date": d.strftime("%Y-%m-%d"),
                "PM2.5": round(float(p), 2),
                "PM10": round(float(p * 1.6), 2),
                "NO2": round(float(np.random.uniform(10, 60)), 2),
                "CO": round(float(np.random.uniform(0.5, 3.0)), 2),
                "SO2": round(float(np.random.uniform(5, 25)), 2),
                "O3": round(float(np.random.uniform(15, 55)), 2),
                "AQI": round(float(a), 2),
                "AQI_Bucket": "Moderate" if a < 200 else "Poor"
            })

    sample_df = pd.DataFrame(records)
    sample_df.to_csv(filepath, index=False)
    return sample_df


if __name__ == "__main__":
    csv_path = "data/city_day.csv"
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Generating demo dataset...")
        generate_sample_dataset(csv_path)

    df = load_dataset(csv_path)
    cities = get_available_cities(df)
    print(f"Available cities: {cities}")

    test_city = "Delhi" if "Delhi" in cities else cities[0]
    print(f"\nProcessing data for {test_city}...")
    city_df = preprocess_city_data(df, test_city)

    data_dict = prepare_train_test_data(city_df, window_size=7, train_split=0.8)
    X_train = data_dict["X_train"]
    y_train = data_dict["y_train"]
    X_test = data_dict["X_test"]
    y_test = data_dict["y_test"]
    scaler = data_dict["scaler"]

    print(f"Training sequences shape: {X_train.shape}, Targets: {y_train.shape}")
    print(f"Testing sequences shape:  {X_test.shape}, Targets: {y_test.shape}")

    print("\nBuilding and training LSTM model (5 epochs for test)...")
    model = build_lstm_model(input_shape=(7, 2))
    train_lstm_model(model, X_train, y_train, epochs=5, batch_size=16, verbose=1)

    print("\nEvaluating model on test set...")
    metrics, y_true, y_pred = evaluate_model(model, X_test, y_test, scaler)
    print(f"PM2.5 MAE:  {metrics['pm25_mae']:.2f}")
    print(f"PM2.5 RMSE: {metrics['pm25_rmse']:.2f}")
    print(f"AQI MAE:    {metrics['aqi_mae']:.2f}")
    print(f"AQI RMSE:   {metrics['aqi_rmse']:.2f}")

    next_pm25, next_aqi = predict_next_day(model, city_df, scaler, window_size=7)
    print(f"\nNext Day Forecast -> PM2.5: {next_pm25:.2f}, AQI: {next_aqi:.2f}")
