import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastPoint } from '@/types';
import { aqiCategory } from '@/services/demoData';

interface Props {
  data: ForecastPoint[];
  height?: number;
  showForecastBoundary?: boolean;
  pollutant?: 'aqi' | 'pm25' | 'pm10';
}

interface TooltipEntry {
  value: number;
  dataKey: string;
  payload: ForecastPoint;
}

const POLLUTANT_META = {
  aqi: { label: 'AQI', unit: 'index', color: '#C6FF4D' },
  pm25: { label: 'PM2.5', unit: 'µg/m³', color: '#8DFF6A' },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#7AAE2E' },
} as const;

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function ForecastChart({ data, height = 320, showForecastBoundary = true, pollutant = 'aqi' }: Props) {
  const meta = POLLUTANT_META[pollutant];
  const boundaryDate = data.find((d) => d.isForecast)?.date;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="fill-history" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C6FF4D" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#C6FF4D" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fill-forecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8DFF6A" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#8DFF6A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1E251E" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#5C6359', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={{ stroke: '#1E251E' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: '#5C6359', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          {showForecastBoundary && boundaryDate && (
            <ReferenceLine
              x={boundaryDate}
              stroke="#C6FF4D"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: 'Forecast →', position: 'insideTopRight', fill: '#C6FF4D', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            />
          )}
          <Tooltip
            cursor={{ stroke: '#C6FF4D', strokeOpacity: 0.4, strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = (payload[0] as TooltipEntry).payload;
              const cat = p.aqi === null ? null : aqiCategory(p.aqi);
              return (
                <div className="rounded-xl border border-white/10 bg-ink-800/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">{formatDate(p.date)}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="font-display text-lg font-bold text-fog">
                      {p[pollutant] ?? (pollutant === 'aqi' ? '—' : p.aqi ?? '—')}
                      <span className="ml-1 font-mono text-[10px] font-normal text-fog-muted">{meta.unit}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {cat && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                      {cat.label}
                    </span>}
                    {p.isForecast && (
                      <span className="rounded bg-lime/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime">Forecast</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="aqi" stroke="none" fill="url(#fill-history)" />
          <Line
            type="monotone"
            dataKey={pollutant}
            stroke={meta.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: meta.color, stroke: '#080A08', strokeWidth: 2 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
