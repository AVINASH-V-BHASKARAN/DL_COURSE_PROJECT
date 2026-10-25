import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Gauge, Wind } from 'lucide-react';
import SectionHeading from './SectionHeading';
import MetricCard from './AQIMetricCard';
import AQIGauge from './AQIGauge';
import { getHistory, getStations } from '@/services/api';
import type { MetricPoint, Station } from '@/types';
import { useInView } from '@/hooks/useInView';

export default function OverviewSection() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [stations, setStations] = useState<Station[]>([]);
  const [station, setStation] = useState('');
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getStations().then((items) => {
      if (!active) return;
      setStations(items);
      const selected = items.find((item) => item.name.toLowerCase() === 'delhi') ?? items[0];
      if (selected) setStation(selected.id);
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load the dataset.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!station) return;
    let active = true;
    getHistory(station).then((items) => { if (active) setHistory(items); }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load this city.');
    });
    return () => { active = false; };
  }, [station]);

  const latest = history[history.length - 1];
  const latestFor = (key: 'aqi' | 'pm25' | 'pm10') => history.slice().reverse().find((point) => typeof point[key] === 'number' && Number.isFinite(point[key]))?.[key] ?? null;
  const aqiObservations = history.filter((point) => typeof point.aqi === 'number' && Number.isFinite(point.aqi));
  const latestAqi = latestFor('aqi');
  const latestPm25 = latestFor('pm25');
  const latestPm10 = latestFor('pm10');
  const delta = (key: 'aqi' | 'pm25' | 'pm10') => {
    const values = history.map((point) => point[key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const previous = values[values.length - 2];
    const current = values[values.length - 1];
    return previous && current !== undefined ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  };
  const averageAqi = useMemo(() => {
    const recent = aqiObservations.slice(-30);
    return recent.length ? Math.round(recent.reduce((sum, point) => sum + point.aqi!, 0) / recent.length) : 0;
  }, [aqiObservations]);
  const averageAqiSeries = useMemo(() => aqiObservations.map((_, index) => {
    const recent = aqiObservations.slice(Math.max(0, index - 29), index + 1);
    return recent.reduce((sum, point) => sum + point.aqi!, 0) / recent.length;
  }).slice(-14), [aqiObservations]);
  const peakAqi = useMemo(() => Math.round(Math.max(0, ...aqiObservations.slice(-90).map((point) => point.aqi!))), [aqiObservations]);

  return (
    <section id="overview" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="01 / Air Quality Overview"
          title={
            <>
              THE AIR HAS <span className="text-gradient-lime">A STORY.</span>
            </>
          }
          description="Explore daily AQI observations and newer CPCB station pollutant measurements. These records are historical, not a live sensor feed."
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label htmlFor="overview-city" className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">City dataset</label>
          <select id="overview-city" value={station} onChange={(e) => setStation(e.target.value)} className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-fog">
            {stations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {latest && <span className="text-xs text-fog-faint">Latest record: {latest.date}</span>}
          {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Metric cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            <MetricCard
              index={0}
              label="Latest recorded AQI"
              value={latestAqi === null ? null : Math.round(latestAqi)}
              unit="index"
              delta={delta('aqi')}
              caption="Composite air quality index, 0–500 scale (CPCB)."
              series={history.slice(-14).map((point) => point.aqi).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))}
              accent
            />
            <MetricCard
              index={1}
              label="PM2.5"
              value={latestPm25 === null ? null : Math.round(latestPm25)}
              unit="µg/m³"
              delta={delta('pm25')}
              caption="Fine particulate matter under 2.5 microns."
              series={history.slice(-14).map((point) => point.pm25).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))}
            />
            <MetricCard
              index={2}
              label="PM10"
              value={latestPm10 === null ? null : Math.round(latestPm10)}
              unit="µg/m³"
              delta={delta('pm10')}
              caption="Coarse particulate matter under 10 microns."
              series={history.slice(-14).map((point) => point.pm10).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))}
            />
            <MetricCard
              index={3}
              label="30-day average AQI"
              value={averageAqi}
              unit="index"
              delta={0}
              caption="Mean AQI over the latest 30 daily records in this city."
              series={averageAqiSeries}
            />
          </div>

          {/* Gauge card */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="surface surface-glow flex flex-col items-center justify-center p-6"
          >
            <div className="mb-2 flex w-full items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">AQI Gauge</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-fog-muted">
                <Gauge className="h-3.5 w-3.5 text-lime" /> Historical observation
              </span>
            </div>
            <AQIGauge value={latestAqi ?? 0} />
          </motion.div>
        </div>

        {/* Dataset summary */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="surface flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime/10 text-lime">
              <Wind className="h-5 w-5" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Avg. PM10 (30d)</div>
              <div className="font-display text-2xl font-bold text-fog">
                {(() => { const values = history.slice(-30).map((point) => point.pm10).filter((value): value is number => typeof value === 'number' && Number.isFinite(value)); return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : '—'; })()} µg/m³
              </div>
            </div>
          </div>
          <div className="surface flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime/10 text-lime">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Peak AQI (90d)</div>
              <div className="font-display text-2xl font-bold text-fog">
                {peakAqi}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
