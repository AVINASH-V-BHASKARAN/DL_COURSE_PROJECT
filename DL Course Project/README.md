# Air Quality Prediction Using LSTM

A beginner-friendly deep learning project with a React dashboard and a local FastAPI backend. The dashboard uses the current city-level AQI file, supplements its historical particulate charts with newer CPCB station readings, and trains an LSTM for AQI forecasts.

---

## 📌 Project Overview & Objective

Air pollution is a major environmental and public health concern in many urban regions. Accurately anticipating pollution levels helps citizens and local administrations take proactive measures.

- **Objective:** Forecast **AQI** 1, 3, or 7 days ahead from prior daily AQI observations.
- **Model:** A compact Long Short-Term Memory (LSTM) recurrent neural network built with TensorFlow/Keras.
- **Interface:** React, TypeScript, Vite, and Recharts.
- **API:** FastAPI and Uvicorn.

---

## 🛠️ Tech Stack

- **Language:** Python 3.9+
- **Deep Learning:** TensorFlow / Keras (LSTM, Dense, Sequential)
- **Data Manipulation:** Pandas, NumPy
- **Preprocessing & Metrics:** Scikit-learn (`MinMaxScaler`, `mean_absolute_error`, `mean_squared_error`)
- **Visualization:** Recharts
- **Web Dashboard:** React, TypeScript, Vite
- **API:** FastAPI, Uvicorn

---

## 📁 Project Structure

```text
DL Course Project/
│
├── data/
│   ├── aqi.csv                # City/day AQI observations (2022–2025)
│   ├── cpcb_caaqm_daily_pm_2025-05_to_2025-09.csv # Newer station PM2.5/PM10
│   ├── cpcb_caaqm_stations.csv # Station-to-city metadata
│   └── README.md              # Dataset provenance and refresh instructions
│
├── model.py                   # Data preprocessing, LSTM model, training & evaluation
├── api.py                     # FastAPI service for city history and LSTM forecasts
├── requirements.txt           # Project dependencies
├── UI/project/                # React dashboard
└── README.md                  # Comprehensive project documentation
```

---

## 📊 Datasets

The dashboard API uses `data/aqi.csv` for city/day AQI observations (2022-04-01 to 2025-04-30). Repeated city/date records are averaged. AQI forecasts use only these measured AQI values.

Newer PM2.5 and PM10 daily readings are from the [India Air Quality Database by XKDR Forum](https://airquality.xkdr.org/), sourced from CPCB's CAAQM network and licensed CC BY 4.0. The downloaded station-level file covers 2025-05-01 to 2025-09-01 and is aggregated by the API for historical PM charts. It does not contain AQI, so the project does not infer or forecast AQI from these two pollutants. See [`data/README.md`](data/README.md) and [`data/cpcb_caaqm_source.json`](data/cpcb_caaqm_source.json) for provenance and limitations.

The original Kaggle data files (2015–2020) remain in `data/` for the standalone project materials; they are not the dashboard API's current source. None of these files is a live sensor feed.

---

## ⚙️ Installation & Setup

### 1. Clone or Open the Project
Open a terminal in the project directory:
```bash
cd "d:/DL Course Project"
```

### 2. (Recommended) Create and Activate a Virtual Environment
```bash
# On Windows:
python -m venv venv
venv\Scripts\activate

# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🚀 How to Run

Start the API from the project directory:

```bash
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8001
```

In a second terminal, start the React dashboard:

```bash
cd "UI/project"
npm ci
npm run dev -- --host 127.0.0.1
```

Open the Vite URL shown in the terminal, normally `http://127.0.0.1:5173`. Vite forwards `/api` requests to FastAPI. The prediction form defaults to the selected city's available dates; select at least 30 days before requesting a forecast.

Vite 7 requires Node.js 20.19+ or 22.12+.

The dashboard shows AQI history and the newer station-derived PM readings, supports CSV upload for the history chart, and forecasts AQI with an LSTM. Uploaded CSVs affect only the history view. PM observations are supplementary measurements and are not inputs to the AQI forecast model.

## Deploy the dashboard on Vercel

The repository-root `vercel.json` builds and serves the Vite dashboard from `DL Course Project/UI/project`. Import the repository into Vercel and keep the project root set to the repository root; the build and output paths are configured in `vercel.json`.

Vercel hosts the static dashboard. The FastAPI service uses TensorFlow and trains a model during prediction, so deploy the API on a Python-capable service separately. In Vercel project settings, set `VITE_API_BASE_URL` to that API's public base URL (without a trailing slash). Set `AIRFLOW_CORS_ORIGINS` on the API to the Vercel site origin, such as `https://your-project.vercel.app`; separate multiple origins with commas. The API service must also include the `data/` directory containing `aqi.csv` and `cpcb_caaqm_daily_pm_2025-05_to_2025-09.csv`.

After changing `VITE_API_BASE_URL`, redeploy the Vercel site because Vite embeds this value at build time. `UI/project/.env.example` shows the variable for local configuration.

---

### Run Standalone Model Training (Terminal / Script)
You can also run the core pipeline directly from the command line:
```bash
python model.py
```
This will:
- Load and preprocess the dataset for a default city (e.g., Delhi).
- Split data chronologically (80% train, 20% test).
- Train the LSTM model for 5–10 epochs.
- Print computed MAE and RMSE metrics directly to the console.
- Display the next day's forecasted PM2.5 and AQI.

---

## 🔬 Methodology & Model Architecture

### 1. Data Cleaning & Handling Missing Values
- The dashboard API groups duplicate city/date AQI rows, expands AQI time series to daily frequency, and interpolates only gaps up to three days. The external particulate dataset remains separate from AQI observations.

### 2. Train-Test Split by Date & Scaling
To preserve temporal causality and avoid data leakage:
- The data is split chronologically: **80% for training** and **20% for testing**.
- A `MinMaxScaler` is **fitted exclusively on the training set**. The test set is transformed using the parameters learned from the training data.

### 3. Dashboard AQI Forecast
- **Input ($X$):** Consecutive 7 days of AQI observations (Shape: `(batch_size, 7, 1)`).
- **Target ($y$):** The following day's AQI (Shape: `(batch_size, 1)`).

```text
Day 1 to 7 [AQI]  ──>  [ LSTM Model ]  ──>  Day 8 [AQI]
```

### 4. Neural Network Architecture
The architecture is designed to be lightweight and fast to train on CPU:
- **Input Layer:** Shape `(7, 1)` representing 7 daily AQI values.
- **LSTM Layer:** 32 hidden units with `tanh` activation to capture temporal dependencies.
- **Dense Layer:** 16 hidden units with `relu` activation for feature combination.
- **Output Layer:** 1 unit (linear activation) predicting AQI.
- **Loss & Optimizer:** Mean Squared Error (`mse`) loss optimized using the `adam` optimizer.

### 5. Evaluation Metrics
Dashboard predictions are inverse-scaled to AQI index points. The separate `model.py` experiment retains its legacy Kaggle PM2.5/AQI pipeline.
- **MAE (Mean Absolute Error):** Measures average absolute deviation from the ground truth.
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |y_i - \hat{y}_i|$$
- **RMSE (Root Mean Squared Error):** Penalizes larger forecasting errors more heavily.
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)^2}$$

The standalone `model.py` pipeline calculates MAE and RMSE from its actual held-out PM2.5/AQI test predictions. The dashboard API trains on the selected city and date range and returns recursive forecasts for the requested horizon.

---

## 📜 Indian National AQI Categories Reference

| AQI Range | Category | Health Impact |
|:---:|:---:|:---|
| **0 – 50** | Good | Minimal impact |
| **51 – 100** | Satisfactory | Minor breathing discomfort to sensitive people |
| **101 – 200** | Moderate | Breathing discomfort to people with lungs, asthma, and heart diseases |
| **201 – 300** | Poor | Breathing discomfort to most people on prolonged exposure |
| **301 – 400** | Very Poor | Respiratory illness on prolonged exposure |
| **401 – 500+** | Severe | Affects healthy people and seriously impacts those with existing diseases |

---

## 📝 Course Project Submission Notes
- **Simple & Beginner-Friendly:** Uses a standard, clean folder structure without convoluted abstractions.
- **Local API:** The dashboard and model run locally without API keys or external services.
- **Authentic Metrics:** Metrics are computed purely from model predictions; no hardcoded or fabricated numbers.
