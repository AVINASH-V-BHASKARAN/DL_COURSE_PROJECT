export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export interface AqiBand {
  label: AqiCategory;
  min: number;
  max: number;
  color: string;
  textColor: string;
  advice: string;
}

export interface MetricPoint {
  date: string; // ISO date
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temp?: number;
  humidity?: number;
}

export interface ForecastPoint {
  date: string;
  aqi: number | null;
  pm25?: number | null;
  pm10?: number | null;
  isForecast: boolean;
}

export type ForecastHorizon = 1 | 3 | 7;

export interface PredictionRequest {
  station: string;
  fromDate: string;
  toDate: string;
  horizon: ForecastHorizon;
}

export interface PredictionResponse {
  station: string;
  generatedAt: string;
  horizon: ForecastHorizon;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  predictedAqi: number;
  predictedPm25?: number;
  predictedPm10?: number;
  forecastDate: string;
  category: AqiCategory;
  trend: 'improving' | 'worsening' | 'stable';
  modelMeta: {
    name: string;
    version: string;
    trainedOn: string;
    lookback: number;
  };
}

export interface Station {
  id: string;
  name: string;
  region: string;
  startDate?: string;
  endDate?: string;
}

export type ApiStatus = 'ok' | 'unavailable';
