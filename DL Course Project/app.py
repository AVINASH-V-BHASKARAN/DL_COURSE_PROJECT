"""
app.py - Streamlit Dashboard for Air Quality Prediction Using LSTM
Predicts the next day's PM2.5 and AQI values using the previous 7 days of air quality data.
"""

import os
import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Import model and data helpers
from model import (
    load_dataset,
    get_available_cities,
    preprocess_city_data,
    prepare_train_test_data,
    build_lstm_model,
    train_lstm_model,
    evaluate_model,
    predict_next_day,
    generate_sample_dataset,
)

# Page configuration
st.set_page_config(
    page_title="Air Quality Prediction Using LSTM",
    page_icon="🌤️",
    layout="wide"
)

# Styling and title
st.title("🌤️ Air Quality Prediction Using LSTM")
st.markdown(
    "**Course Project:** Predict next day's **PM2.5** and **AQI** using the previous 7 days of "
    "historical air quality data with a Long Short-Term Memory (LSTM) Deep Learning model."
)

DATA_PATH = "data/city_day.csv"

# Check if dataset exists
if not os.path.exists(DATA_PATH):
    st.warning("⚠️ Dataset file `city_day.csv` was not found in the `data/` directory.")

    st.markdown(
        """
        ### 📥 How to Download the Dataset:
        1. Visit Kaggle's **Air Quality Data in India** dataset:
           [https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india](https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india)
        2. Click **Download** to get the zip archive.
        3. Extract the file named **`city_day.csv`**.
        4. Place `city_day.csv` into the `data/` folder inside this project directory (`DL Course Project/data/city_day.csv`).
        5. Once placed, refresh this page or re-run the app.
        """
    )

    st.markdown("---")
    st.info("💡 **Need to test immediately?** You can generate a synthetic demo dataset below.")

    if st.button("Generate Sample Demo Dataset (Instant Test)"):
        with st.spinner("Generating sample dataset..."):
            generate_sample_dataset(DATA_PATH)
        st.success("Sample dataset created successfully at `data/city_day.csv`!")
        st.rerun()

    st.stop()


# Helper function to categorize AQI according to Indian NAQI standard
def get_aqi_category(aqi_val):
    if aqi_val <= 50:
        return "Good (0-50)", "green"
    elif aqi_val <= 100:
        return "Satisfactory (51-100)", "lightgreen"
    elif aqi_val <= 200:
        return "Moderate (101-200)", "orange"
    elif aqi_val <= 300:
        return "Poor (201-300)", "darkorange"
    elif aqi_val <= 400:
        return "Very Poor (301-400)", "red"
    else:
        return "Severe (>400)", "darkred"


# Load data
try:
    df = load_dataset(DATA_PATH)
    available_cities = get_available_cities(df)
except Exception as e:
    st.error(f"Error loading dataset: {e}")
    st.stop()

# Sidebar: City selection and hyperparameters
st.sidebar.header("⚙️ Configuration")
default_city_index = (
    available_cities.index("Delhi") if "Delhi" in available_cities else 0
)
selected_city = st.sidebar.selectbox(
    "Select City:", available_cities, index=default_city_index
)

st.sidebar.subheader("Model Parameters")
epochs = st.sidebar.slider("Training Epochs", min_value=5, max_value=25, value=10, step=5)
batch_size = st.sidebar.selectbox("Batch Size", [16, 32], index=0)

# Preprocess city data
try:
    city_df = preprocess_city_data(df, selected_city)
except Exception as e:
    st.error(f"Failed to process data for {selected_city}: {e}")
    st.stop()

# Tabs for organization
tab_trends, tab_model = st.tabs(["📊 Historical Trends", "🧠 Model Training & Predictions"])

# TAB 1: Historical Trends
with tab_trends:
    st.subheader(f"Historical Air Quality Trends — {selected_city}")

    # Summary metrics
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total Recorded Days", f"{len(city_df):,}")
    m2.metric("Date Range", f"{city_df['Date'].min().strftime('%b %Y')} - {city_df['Date'].max().strftime('%b %Y')}")
    m3.metric("Avg PM2.5", f"{city_df['PM2.5'].mean():.1f} µg/m³")
    m4.metric("Avg AQI", f"{city_df['AQI'].mean():.1f}")

    # Plot historical trends
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
    ax1.plot(city_df["Date"], city_df["PM2.5"], color="#e67e22", label="PM2.5 (µg/m³)")
    ax1.set_ylabel("PM2.5 (µg/m³)")
    ax1.set_title(f"Historical PM2.5 and AQI Over Time — {selected_city}")
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend(loc="upper right")

    ax2.plot(city_df["Date"], city_df["AQI"], color="#2980b9", label="AQI")
    ax2.set_xlabel("Date")
    ax2.set_ylabel("AQI")
    ax2.grid(True, linestyle="--", alpha=0.5)
    ax2.legend(loc="upper right")

    plt.tight_layout()
    st.pyplot(fig)
    plt.close(fig)

    with st.expander("🔍 View Cleaned City Dataset (Last 15 Records)"):
        st.dataframe(city_df.tail(15)[["Date", "City", "PM2.5", "AQI"]], use_container_width=True)

# TAB 2: Model Training & Evaluation
with tab_model:
    st.subheader(f"LSTM Deep Learning Model for {selected_city}")
    st.markdown(
        "The model uses a **7-day sliding window** of PM2.5 and AQI values to predict the "
        "next day's values. Features are scaled using `MinMaxScaler` fitted **only** on the training set."
    )

    # Prepare train/test splits
    try:
        data_bundle = prepare_train_test_data(city_df, window_size=7, train_split=0.8)
    except Exception as e:
        st.error(f"Error preparing train/test split: {e}")
        st.stop()

    X_train = data_bundle["X_train"]
    y_train = data_bundle["y_train"]
    X_test = data_bundle["X_test"]
    y_test = data_bundle["y_test"]
    scaler = data_bundle["scaler"]
    test_dates = data_bundle["test_dates"]

    st.write(
        f"**Dataset Split:** {len(data_bundle['train_df'])} Training Days (80%) | "
        f"{len(data_bundle['test_df'])} Testing Days (20%)"
    )

    # Session state key per city to cache results
    train_key = f"trained_{selected_city}_{epochs}_{batch_size}"

    train_btn = st.button("🚀 Train LSTM Model", type="primary")

    if train_btn or train_key in st.session_state:
        if train_btn or train_key not in st.session_state:
            with st.spinner(f"Training LSTM model on {selected_city} data ({epochs} epochs)..."):
                model = build_lstm_model(input_shape=(7, 2))
                train_lstm_model(model, X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=0)
                metrics, y_true, y_pred = evaluate_model(model, X_test, y_test, scaler)
                next_pm25, next_aqi = predict_next_day(model, city_df, scaler, window_size=7)

                st.session_state[train_key] = {
                    "metrics": metrics,
                    "y_true": y_true,
                    "y_pred": y_pred,
                    "next_pm25": next_pm25,
                    "next_aqi": next_aqi
                }

        results = st.session_state[train_key]
        metrics = results["metrics"]
        y_true = results["y_true"]
        y_pred = results["y_pred"]
        next_pm25 = results["next_pm25"]
        next_aqi = results["next_aqi"]

        st.success("✅ Model Training & Evaluation Complete!")

        # 1. Performance Evaluation Metrics
        st.markdown("### 📈 Evaluation Metrics (Calculated on Unseen Test Set)")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("PM2.5 MAE", f"{metrics['pm25_mae']:.2f} µg/m³")
        c2.metric("PM2.5 RMSE", f"{metrics['pm25_rmse']:.2f} µg/m³")
        c3.metric("AQI MAE", f"{metrics['aqi_mae']:.2f}")
        c4.metric("AQI RMSE", f"{metrics['aqi_rmse']:.2f}")

        # 2. Next Day Prediction Banner
        st.markdown("---")
        st.markdown("### 🔮 Next-Day Forecast (Day Ahead)")
        category_name, _ = get_aqi_category(next_aqi)

        f1, f2, f3 = st.columns(3)
        last_date = city_df["Date"].max()
        next_date_str = (last_date + pd.Timedelta(days=1)).strftime("%A, %d %B %Y")

        f1.metric(f"Forecast Date", next_date_str)
        f1.caption(f"Based on 7 previous days up to {last_date.strftime('%Y-%m-%d')}")
        f2.metric("Predicted PM2.5", f"{next_pm25:.2f} µg/m³")
        f3.metric("Predicted AQI", f"{next_aqi:.1f}", help=f"Category: {category_name}")
        st.info(f"Predicted AQI Category: **{category_name}**")

        # 3. Prediction Graphs (Actual vs Predicted)
        st.markdown("---")
        st.markdown("### 📉 Actual vs. Predicted Graphs (Test Period)")

        fig_pred, (p_ax1, p_ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)

        # PM2.5 Plot
        p_ax1.plot(test_dates, y_true[:, 0], label="Actual PM2.5", color="#2c3e50", linewidth=1.5)
        p_ax1.plot(test_dates, y_pred[:, 0], label="Predicted PM2.5", color="#e67e22", linestyle="--", linewidth=1.5)
        p_ax1.set_ylabel("PM2.5 (µg/m³)")
        p_ax1.set_title(f"PM2.5: Actual vs Predicted — {selected_city}")
        p_ax1.grid(True, linestyle="--", alpha=0.5)
        p_ax1.legend(loc="upper right")

        # AQI Plot
        p_ax2.plot(test_dates, y_true[:, 1], label="Actual AQI", color="#2c3e50", linewidth=1.5)
        p_ax2.plot(test_dates, y_pred[:, 1], label="Predicted AQI", color="#2980b9", linestyle="--", linewidth=1.5)
        p_ax2.set_xlabel("Date")
        p_ax2.set_ylabel("AQI")
        p_ax2.set_title(f"AQI: Actual vs Predicted — {selected_city}")
        p_ax2.grid(True, linestyle="--", alpha=0.5)
        p_ax2.legend(loc="upper right")

        plt.tight_layout()
        st.pyplot(fig_pred)
        plt.close(fig_pred)

        # 4. Actual vs Predicted Values Table
        st.markdown("---")
        st.markdown("### 📋 Sample Predictions on Test Data (Most Recent 10 Days)")

        comparison_df = pd.DataFrame({
            "Date": test_dates.dt.strftime("%Y-%m-%d"),
            "Actual PM2.5": np.round(y_true[:, 0], 2),
            "Predicted PM2.5": np.round(y_pred[:, 0], 2),
            "PM2.5 Error (|Diff|)": np.round(np.abs(y_true[:, 0] - y_pred[:, 0]), 2),
            "Actual AQI": np.round(y_true[:, 1], 2),
            "Predicted AQI": np.round(y_pred[:, 1], 2),
            "AQI Error (|Diff|)": np.round(np.abs(y_true[:, 1] - y_pred[:, 1]), 2),
        })

        st.dataframe(comparison_df.tail(10), use_container_width=True)

    else:
        st.info("👆 Click **'🚀 Train LSTM Model'** above to train the model on this city's data and view the prediction metrics and graphs.")
