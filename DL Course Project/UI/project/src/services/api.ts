import type {
  ApiStatus,
  MetricPoint,
  PredictionRequest,
  PredictionResponse,
  Station,
} from '@/types';

// Local development uses Vite's /api proxy; set VITE_API_BASE_URL for a separate deployment.
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');
const ENDPOINTS = {
  health: `${API_BASE}/api/health`,
  history: `${API_BASE}/api/history`,
  predict: `${API_BASE}/api/predict`,
};

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getApiStatus(): Promise<ApiStatus> {
  try {
    const res = await fetchWithTimeout(ENDPOINTS.health);
    if (!res.ok) return 'unavailable';
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

export async function getStations(): Promise<Station[]> {
  const res = await fetchWithTimeout(ENDPOINTS.history);
  if (!res.ok) throw new Error('Could not load cities from the air quality dataset.');
  const data = (await res.json()) as { stations?: Station[] };
  if (!data.stations?.length) throw new Error('The dataset contains no usable cities.');
  return data.stations;
}

export async function getHistory(stationId: string): Promise<MetricPoint[]> {
  const res = await fetchWithTimeout(`${ENDPOINTS.history}?station=${encodeURIComponent(stationId)}`);
  if (!res.ok) throw new Error('Could not load history for this city.');
  const data = (await res.json()) as { history?: MetricPoint[] };
  if (!data.history?.length) throw new Error('No history was returned for this city.');
  return data.history;
}

export async function predict(req: PredictionRequest): Promise<PredictionResponse> {
  const res = await fetchWithTimeout(ENDPOINTS.predict, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }, 120_000);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Prediction failed (${res.status}).`);
  }
  return (await res.json()) as PredictionResponse;
}
