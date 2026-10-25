import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Gauge,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Cpu,
  CircleCheck,
  Search,
} from 'lucide-react';
import SectionHeading from './SectionHeading';
import ForecastChart from './ForecastChart';
import AQIGauge from './AQIGauge';
import { aqiCategory } from '@/services/demoData';
import { getApiStatus, getStations, predict } from '@/services/api';
import type { ApiStatus, ForecastHorizon, PredictionResponse, Station } from '@/types';

const HORIZONS: { value: ForecastHorizon; label: string; sub: string }[] = [
  { value: 1, label: '1 Day', sub: 'Next day in range' },
  { value: 3, label: '3 Days', sub: 'Short range' },
  { value: 7, label: '7 Days', sub: 'Week ahead' },
];

export default function PredictionPanel() {
  const [status, setStatus] = useState<ApiStatus>('unavailable');
  const [stations, setStations] = useState<Station[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [station, setStation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [horizon, setHorizon] = useState<ForecastHorizon>(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getApiStatus().then((value) => { if (active) setStatus(value); });
    getStations().then((items) => {
      if (!active) return;
      setStations(items);
      const selected = items.find((item) => item.name.toLowerCase() === 'delhi') ?? items[0];
      setStation(selected.id);
      setFrom(selected.startDate ?? '');
      setTo(selected.endDate ?? '');
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Could not connect to the dataset API.');
    });
    return () => { active = false; };
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await predict({ station, fromDate: from, toDate: to, horizon });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const cat = result ? aqiCategory(result.predictedAqi) : null;
  const filteredStations = stations.filter((item) =>
    `${item.name} ${item.region}`.toLowerCase().includes(citySearch.trim().toLowerCase()),
  );
  const TrendIcon = result?.trend === 'improving' ? TrendingDown : result?.trend === 'worsening' ? TrendingUp : Minus;

  return (
    <section id="predictions" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="02 / LSTM Prediction"
          title={
            <>
              WHAT FOLLOWS THIS <span className="text-gradient-lime">DATA?</span>
            </>
          }
          description="Choose a city, historical date range, and forecast horizon. The LSTM trains on daily AQI observations; CPCB particulate readings are shown separately and are not converted into AQI."
        />

        {/* Status badge */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === 'ok'
                ? 'bg-lime/15 text-lime'
                : 'bg-red-500/10 text-red-300'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status === 'ok' ? 'bg-lime/50' : 'bg-red-400/50'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${status === 'ok' ? 'bg-lime' : 'bg-red-400'}`} />
            </span>
            {status === 'ok' ? 'Dataset backend connected' : 'Backend unavailable'}
          </span>
          <span className="font-mono text-[11px] text-fog-faint">
            Status is checked against <code className="text-fog-muted">/api/health</code> at runtime.
          </span>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Controls */}
          <div className="surface surface-glow flex flex-col gap-6 p-6">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">City</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3">
                <Search className="h-4 w-4 shrink-0 text-fog-faint" />
                <input
                  type="search"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search cities…"
                  aria-label="Search cities"
                  className="w-full bg-transparent py-2.5 text-sm text-fog outline-none placeholder:text-fog-faint"
                />
              </div>
              <div
                className="mt-2 grid max-h-64 grid-cols-1 content-start gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:rgba(198,255,77,0.35)_transparent] [scrollbar-width:thin] sm:grid-cols-2 lg:max-h-[min(42vh,32rem)]"
                aria-label="Available cities"
              >
                {filteredStations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStation(s.id); setFrom(s.startDate ?? from); setTo(s.endDate ?? to); setResult(null); }}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all focus-ring ${
                      station === s.id
                        ? 'border-lime/50 bg-lime/10'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${station === s.id ? 'text-lime' : 'text-fog'}`}>{s.name}</div>
                    <div className="text-[11px] text-fog-faint">{s.region}</div>
                  </button>
                ))}
                {filteredStations.length === 0 && (
                  <p className="col-span-full py-4 text-center text-sm text-fog-faint">No matching cities.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">From date</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                  <CalendarDays className="h-4 w-4 text-lime/70" />
                  <input
                    type="date"
                    value={from}
                    min={stations.find((s) => s.id === station)?.startDate}
                    max={to}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-transparent text-sm text-fog outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">To date</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                  <CalendarDays className="h-4 w-4 text-lime/70" />
                  <input
                    type="date"
                    value={to}
                    min={from}
                    max={stations.find((s) => s.id === station)?.endDate}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-transparent text-sm text-fog outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">Forecast horizon</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {HORIZONS.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => setHorizon(h.value)}
                    className={`rounded-xl border px-3 py-3 text-center transition-all focus-ring ${
                      horizon === h.value
                        ? 'border-lime/50 bg-lime/10'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                    }`}
                  >
                    <div className={`font-display text-base font-bold ${horizon === h.value ? 'text-lime' : 'text-fog'}`}>{h.label}</div>
                    <div className="text-[10px] text-fog-faint">{h.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <button
                onClick={run}
                disabled={loading || !station || !from || !to}
                className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-semibold text-ink-900 transition-all hover:bg-lime-bright hover:shadow-[0_0_36px_-6px_rgba(198,255,77,0.55)] disabled:cursor-not-allowed disabled:opacity-60 focus-ring"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Predicting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Predict Air Quality
                  </>
                )}
              </button>
              <button
                onClick={reset}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-fog transition-all hover:border-lime/40 disabled:opacity-50 focus-ring"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="surface surface-glow relative min-h-[420px] p-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {loading && !result && !error && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center gap-5">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-2 border-lime/20" />
                    <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-2 border-transparent border-t-lime" />
                    <Cpu className="absolute inset-0 m-auto h-6 w-6 text-lime" />
                  </div>
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold text-fog">Running LSTM inference</div>
                    <div className="mt-1 font-mono text-xs text-fog-faint">Reading temporal patterns · {horizon}-day horizon</div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        className="h-1.5 w-1.5 rounded-full bg-lime"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {!loading && !result && !error && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Gauge className="h-10 w-10 text-lime/60" />
                  <div className="font-display text-lg font-semibold text-fog">Awaiting prediction</div>
                  <p className="max-w-sm text-sm text-fog-muted">
                    Choose a city and date range, then run the LSTM forecast.
                  </p>
                </motion.div>
              )}

              {result && cat && (
                <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex h-full flex-col gap-6">
                  <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                    <div className="flex flex-col items-center justify-center">
                      <AQIGauge value={result.predictedAqi} size={210} />
                    </div>
                    <div className="flex flex-col justify-center gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">Forecast for</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-lime" />
                          <span className="font-display text-xl font-bold text-fog">
                            {new Date(result.forecastDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Predicted PM2.5</div>
                          <div className="font-display text-lg font-bold text-fog">{result.predictedPm25 ?? '—'} <span className="text-xs text-fog-faint">µg/m³</span></div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Predicted PM10</div>
                          <div className="font-display text-lg font-bold text-fog">{result.predictedPm10 ?? '—'} <span className="text-xs text-fog-faint">µg/m³</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-lg ${
                            result.trend === 'improving' ? 'bg-lime/15 text-lime' : result.trend === 'worsening' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-fog-muted'
                          }`}
                        >
                          <TrendIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Trend vs. baseline</div>
                          <div className="text-sm font-semibold capitalize text-fog">{result.trend} air quality</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Health guidance */}
                  <div className="rounded-xl border-l-2 p-3.5" style={{ borderColor: cat.color, backgroundColor: `${cat.color}0d` }}>
                    <div className="flex items-center gap-2">
                      <CircleCheck className="h-4 w-4" style={{ color: cat.color }} />
                      <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: cat.color }}>{cat.label} · Health guidance</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-fog">{cat.advice}</p>
                    <p className="mt-1 text-[11px] text-fog-faint">Informational only — not personalized medical advice.</p>
                  </div>

                  {/* Chart */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">Historical vs. Predicted AQI</span>
                      <span className="text-[11px] text-fog-faint">{result.station}</span>
                    </div>
                    <ForecastChart data={[...result.history, ...result.forecast]} height={260} />
                  </div>

                  {/* Model metadata */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 font-mono text-[11px] text-fog-faint">
                    <span className="inline-flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-lime/70" /> {result.modelMeta.name}</span>
                    <span>· v{result.modelMeta.version}</span>
                    <span>· lookback {result.modelMeta.lookback}d</span>
                    <span>· {result.modelMeta.trainedOn}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
