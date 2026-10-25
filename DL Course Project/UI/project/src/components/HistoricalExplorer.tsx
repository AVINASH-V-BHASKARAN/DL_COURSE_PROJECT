import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  RotateCcw,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import SectionHeading from './SectionHeading';
import ForecastChart from './ForecastChart';
import { getHistory, getStations } from '@/services/api';
import type { MetricPoint, Station } from '@/types';

type Pollutant = 'aqi' | 'pm25' | 'pm10';
const POLLUTANTS: { key: Pollutant; label: string }[] = [
  { key: 'aqi', label: 'AQI' },
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
];

const EXPECTED_COLUMNS = ['date', 'aqi', 'pm25', 'pm10'];
const COLUMN_ALIASES: Record<string, string> = {
  date: 'date', datetime: 'date', time: 'date', timestamp: 'date',
  aqi: 'aqi', airqualityindex: 'aqi',
  pm25: 'pm25', 'pm2.5': 'pm25', pm_25: 'pm25', finepm: 'pm25',
  pm10: 'pm10', coarsepm: 'pm10',
  temp: 'temp', temperature: 'temp', tempc: 'temp',
  humidity: 'humidity', rh: 'humidity', humid: 'humidity',
};

interface ParsedCsv {
  history: MetricPoint[];
  warnings: string[];
}

function parseCsv(text: string): ParsedCsv {
  const warnings: string[] = [];
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row.');
  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  const headerMap: Record<string, string> = {};
  rawHeaders.forEach((h) => {
    const mapped = COLUMN_ALIASES[h];
    if (mapped && !headerMap[mapped]) headerMap[mapped] = h;
  });
  const missing = EXPECTED_COLUMNS.filter((c) => !headerMap[c]);
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}.`);
  const optionalMissing = ['temp', 'humidity'].filter((c) => !headerMap[c]);
  if (optionalMissing.length) warnings.push(`Optional columns not present: ${optionalMissing.join(', ')}.`);

  const data: MetricPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const get = (mapped: string) => {
      const raw = headerMap[mapped];
      if (!raw) return Number.NaN;
      const idx = rawHeaders.indexOf(raw);
      const v = cells[idx];
      return v === undefined || v === '' ? Number.NaN : Number(v);
    };
    const dateRaw = cells[rawHeaders.indexOf(headerMap.date)];
    if (!dateRaw) continue;
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) {
      warnings.push(`Row ${i + 1}: invalid date "${dateRaw}" — row skipped.`);
      continue;
    }
    const point: MetricPoint = {
      date: d.toISOString().slice(0, 10),
      aqi: get('aqi'),
      pm25: get('pm25'),
      pm10: get('pm10'),
    };
    if (headerMap.temp) point.temp = get('temp');
    if (headerMap.humidity) point.humidity = get('humidity');
    data.push(point);
  }
  if (!data.length) throw new Error('No valid data rows found after parsing.');
  data.sort((a, b) => a.date.localeCompare(b.date));
  for (const field of ['aqi', 'pm25', 'pm10'] as const) {
    const known = data.flatMap((point, index) => Number.isFinite(point[field]) ? [index] : []);
    if (!known.length) throw new Error(`The CSV has no numeric values in its ${field} column.`);
    const missingCount = data.length - known.length;
    if (missingCount) warnings.push(`${missingCount} missing ${field} value(s) were interpolated.`);
    for (let index = 0; index < data.length; index++) {
      if (Number.isFinite(data[index][field])) continue;
      const before = [...known].reverse().find((knownIndex) => knownIndex < index);
      const after = known.find((knownIndex) => knownIndex > index);
      const leftIndex = before ?? after!;
      const rightIndex = after ?? before!;
      const fraction = leftIndex === rightIndex ? 0 : (index - leftIndex) / (rightIndex - leftIndex);
      data[index][field] = data[leftIndex][field]! + (data[rightIndex][field]! - data[leftIndex][field]!) * fraction;
    }
  }
  return { history: data, warnings };
}

export default function HistoricalExplorer() {
  const [dataset, setDataset] = useState<MetricPoint[]>([]);
  const [baseDataset, setBaseDataset] = useState<MetricPoint[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [cityId, setCityId] = useState('');
  const [datasetCity, setDatasetCity] = useState('');
  const [source, setSource] = useState<'dataset' | 'uploaded'>('dataset');
  const [pollutant, setPollutant] = useState<Pollutant>('aqi');
  const [range, setRange] = useState(90);
  const [loading, setLoading] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    getStations().then((items) => {
      const city = items.find((item) => item.name.toLowerCase() === 'delhi') ?? items[0];
      if (!city) throw new Error('The dataset has no cities to display.');
      if (!active) return;
      setStations(items);
      setCityId(city.id);
    }).catch((e) => {
      if (active) setCsvError(e instanceof Error ? e.message : 'Could not load dataset history.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cityId) return;
    let active = true;
    setLoading(true);
    getHistory(cityId).then((history) => {
      if (!active) return;
      setDataset(history);
      setBaseDataset(history);
      setDatasetCity(stations.find((item) => item.id === cityId)?.name ?? cityId);
      setRange(Math.min(history.length, 90));
      setSource('dataset');
    }).catch((e) => {
      if (active) setCsvError(e instanceof Error ? e.message : 'Could not load dataset history.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [cityId, stations]);

  const chartData = useMemo(() => {
    const slice = dataset.filter((point) => typeof point[pollutant] === 'number' && Number.isFinite(point[pollutant])).slice(-range);
    return slice.map((m) => ({
      date: m.date,
      aqi: m.aqi,
      pm25: m.pm25,
      pm10: m.pm10,
      isForecast: false,
    }));
  }, [dataset, pollutant, range]);

  const stats = useMemo(() => {
    const slice = dataset.slice(-range);
    const avg = (k: keyof MetricPoint) => {
      const values = dataset.map((item) => item[k]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).slice(-range);
      return values.length ? Math.round(values.reduce((a, value) => a + value, 0) / values.length) : null;
    };
    return { avgAqi: avg('aqi'), avgPm25: avg('pm25'), avgPm10: avg('pm10'), count: slice.length };
  }, [dataset, range]);

  const handleFile = async (file: File) => {
    setCsvError(null);
    setCsvWarnings([]);
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Only .csv files are supported.');
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setDataset(parsed.history);
      setSource('uploaded');
      setCsvWarnings(parsed.warnings);
      setRange(Math.max(7, Math.min(parsed.history.length, 90)));
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : 'Failed to parse CSV.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const resetDataset = () => {
    setDataset(baseDataset);
    setSource('dataset');
    setRange(Math.min(baseDataset.length, 90));
    setCsvError(null);
    setCsvWarnings([]);
  };

  const downloadTemplate = () => {
    const header = 'date,aqi,pm25,pm10\n';
    const blob = new Blob([header], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airflow-dataset-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="history" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="03 / Historical Data"
          title={
            <>
              UNDERSTANDING <span className="text-gradient-lime">THE ATMOSPHERE.</span>
            </>
          }
          description="Explore city-level AQI observations and CPCB station-derived particulate readings. Unavailable metrics stay blank; you can also upload a compatible CSV file."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          {/* Controls + upload */}
          <div className="flex flex-col gap-5">
            <div className="surface surface-glow p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">Dataset</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${source === 'dataset' ? 'bg-lime/10 text-lime' : 'bg-lime/10 text-lime'}`}>
                  {source === 'dataset' ? `Dataset · ${datasetCity}` : 'Your upload'}
                </span>
              </div>

              <label htmlFor="history-city" className="mt-3 block font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">City</label>
              <select id="history-city" value={cityId} onChange={(e) => { setCityId(e.target.value); setCsvError(null); setCsvWarnings([]); }} className="mt-1.5 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-fog">
                {stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                  dragOver ? 'border-lime/60 bg-lime/5' : 'border-white/10 bg-white/[0.02] hover:border-lime/30'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
                {loading ? (
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-lime" />
                ) : (
                  <Upload className="mx-auto h-7 w-7 text-lime/70" />
                )}
                <div className="mt-2 text-sm font-medium text-fog">Drop a CSV here or click to upload</div>
                <div className="mt-0.5 text-[11px] text-fog-faint">Required columns: date, aqi, pm25, pm10</div>
              </div>

              <AnimatePresence>
                {csvError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{csvError}</span>
                      <button onClick={() => setCsvError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </motion.div>
                )}
                {csvWarnings.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] text-amber-200/90">
                      {csvWarnings.map((w, i) => <div key={i}>• {w}</div>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 flex gap-2">
                <button onClick={downloadTemplate} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-fog-muted hover:border-lime/30 hover:text-fog focus-ring">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Template
                </button>
                <button onClick={resetDataset} disabled={!baseDataset.length} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-fog-muted hover:border-lime/30 hover:text-fog disabled:opacity-50 focus-ring">
                  <RotateCcw className="h-3.5 w-3.5" /> Reload dataset
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="surface p-5">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-lime" />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">Filters</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-fog-muted">Pollutant</div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {POLLUTANTS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPollutant(p.key)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all focus-ring ${
                        pollutant === p.key ? 'border-lime/50 bg-lime/10 text-lime' : 'border-white/8 bg-white/[0.02] text-fog-muted hover:text-fog'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-fog-muted">
                  <span>Date range</span>
                  <span className="font-mono text-fog">Last {range} days</span>
                </div>
                <input
                  type="range"
                  min={7}
                  max={Math.max(7, Math.min(dataset.length, 90))}
                  value={Math.min(range, Math.max(7, Math.min(dataset.length, 90)))}
                  disabled={dataset.length < 7}
                  onChange={(e) => setRange(Number(e.target.value))}
                  className="mt-2 w-full accent-lime"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'Avg AQI', v: stats.avgAqi },
                { l: 'Avg PM2.5', v: stats.avgPm25 },
                { l: 'Avg PM10', v: stats.avgPm10 },
              ].map((s) => (
                <div key={s.l} className="surface p-3 text-center">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-fog-faint">{s.l}</div>
                  <div className="font-display text-lg font-bold text-lime">{s.v ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="surface surface-glow p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">
                {source === 'dataset' ? `Observed · ${datasetCity}` : 'Observed · uploaded data'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-fog-faint">
                <Download className="h-3 w-3" /> {chartData.length} points
              </span>
            </div>
            {chartData.length === 0 ? (
              <div className="grid h-64 place-items-center text-sm text-fog-muted">No data in selected range.</div>
            ) : (
              <ForecastChart data={chartData} height={340} showForecastBoundary={false} pollutant={pollutant} />
            )}
            <p className="mt-3 text-[11px] text-fog-faint">
            {source === 'dataset'
                ? 'AQI comes from the city dataset; particulate values come from CPCB station daily means where available.'
                : 'Showing your uploaded dataset. Observed values only — no forecast is shown in this view.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
