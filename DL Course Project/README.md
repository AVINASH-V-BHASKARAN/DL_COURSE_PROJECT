# Air Quality Prediction Using LSTM

A beginner-friendly Deep Learning course project that forecasts next-day air quality (**PM2.5** and **AQI**) using the previous **7 days** of historical air quality data with a Long Short-Term Memory (LSTM) neural network and an interactive **Streamlit** dashboard.

---

## 📌 Project Overview & Objective

Air pollution is a major environmental and public health concern in many urban regions. Accurately anticipating pollution levels helps citizens and local administrations take proactive measures.

- **Objective:** Predict the next day's **PM2.5** (µg/m³) and **AQI** (Air Quality Index) values based on the preceding 7 days of historical air quality data.
- **Model:** A compact Long Short-Term Memory (LSTM) recurrent neural network built with TensorFlow/Keras.
- **Interface:** An interactive Streamlit dashboard featuring city selection, historical trend analysis, model training, actual vs. predicted graphs, evaluation metrics (MAE & RMSE), and a next-day forecast.

---

## 🛠️ Tech Stack

- **Language:** Python 3.9+
- **Deep Learning:** TensorFlow / Keras (LSTM, Dense, Sequential)
- **Data Manipulation:** Pandas, NumPy
- **Preprocessing & Metrics:** Scikit-learn (`MinMaxScaler`, `mean_absolute_error`, `mean_squared_error`)
- **Visualization:** Matplotlib
- **Web Dashboard:** Streamlit

---

## 📁 Project Structure

```text
DL Course Project/
│
├── data/
│   ├── README.md              # Instructions for Kaggle dataset placement
│   └── city_day.csv           # Kaggle dataset (manual download or generated demo)
│
├── model.py                   # Data preprocessing, LSTM model, training & evaluation
├── app.py                     # Streamlit web application
├── requirements.txt           # Project dependencies
└── README.md                  # Comprehensive project documentation
```

---

## 📊 Dataset: Air Quality Data in India (Kaggle)

This project uses the official Kaggle dataset:
🔗 **[Air Quality Data in India](https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india)** by Rohan Rao.

### Manual Download Instructions:
1. Visit the [Kaggle Dataset Page](https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india).
2. Download the archive.
3. Extract the file named **`city_day.csv`**.
4. Place `city_day.csv` directly into the `data/` directory inside this project:
   ```text
   DL Course Project/data/city_day.csv
   ```

> **Note:** If the dataset is not yet present when you launch the Streamlit app, the app will display clear download instructions and also offer a one-click button to generate a synthetic sample dataset for instant testing.

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

### Option A: Launch the Streamlit Dashboard (Primary Interface)
Run the following command in your terminal:
```bash
streamlit run app.py
```
This opens the web app in your browser at `http://localhost:8501`.

#### Features in the Dashboard:
1. **City Selection:** Select any city available in the dataset (e.g., Delhi, Mumbai, Bengaluru, etc.).
2. **Historical Trends:** View interactive time-series plots and summary statistics for PM2.5 and AQI.
3. **Model Training:** Train the LSTM model with configurable epochs (default: 10 epochs).
4. **Evaluation Metrics:** View real-time **MAE** and **RMSE** calculated directly from model predictions on unseen test data.
5. **Actual vs. Predicted Graphs:** Compare actual ground truth against model predictions over the test period.
6. **Comparison Table:** View side-by-side tabular differences between actual and predicted values for recent days.
7. **Next-Day Forecast:** Get the predicted PM2.5, AQI, and Indian National AQI health category for tomorrow.

---

### Option B: Run Standalone Model Training (Terminal / Script)
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
Air quality sensor feeds often experience missing readings.
- Missing values in `PM2.5` and `AQI` are smoothed using **linear time-series interpolation**, followed by backward and forward filling to ensure a complete, continuous temporal sequence.

### 2. Train-Test Split by Date & Scaling
To preserve temporal causality and avoid data leakage:
- The data is split chronologically: **80% for training** and **20% for testing**.
- A `MinMaxScaler` is **fitted exclusively on the training set**. The test set is transformed using the parameters learned from the training data.

### 3. 7-Day Sliding Window Sequences
- **Input ($X$):** Consecutive 7 days of `[PM2.5, AQI]` readings (Shape: `(batch_size, 7, 2)`).
- **Target ($y$):** Next day's `[PM2.5, AQI]` readings (Shape: `(batch_size, 2)`).

```text
Day 1 to 7 [PM2.5, AQI]  ──>  [ LSTM Model ]  ──>  Day 8 [PM2.5, AQI]
```

### 4. Neural Network Architecture
The architecture is designed to be lightweight and fast to train on CPU:
- **Input Layer:** Shape `(7, 2)` representing 7 time steps with 2 features.
- **LSTM Layer:** 32 hidden units with `tanh` activation to capture temporal dependencies.
- **Dense Layer:** 16 hidden units with `relu` activation for feature combination.
- **Output Layer:** 2 units (linear activation) predicting tomorrow's PM2.5 and AQI.
- **Loss & Optimizer:** Mean Squared Error (`mse`) loss optimized using the `adam` optimizer.

### 5. Evaluation Metrics
Predictions are inverse-scaled back to their original units (µg/m³ for PM2.5, index points for AQI).
- **MAE (Mean Absolute Error):** Measures average absolute deviation from the ground truth.
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |y_i - \hat{y}_i|$$
- **RMSE (Root Mean Squared Error):** Penalizes larger forecasting errors more heavily.
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)^2}$$

All metrics are strictly calculated from the model's actual test predictions.

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
- **No External APIs / Databases:** Completely self-contained; runs locally without API keys or external services.
- **Authentic Metrics:** Metrics are computed purely from model predictions; no hardcoded or fabricated numbers.
