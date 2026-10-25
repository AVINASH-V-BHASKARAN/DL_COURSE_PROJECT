import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getHistory, getStations } from '@/services/api';
import type { MetricPoint } from '@/types';

export default function HeroSection() {
  const [latest, setLatest] = useState<MetricPoint | null>(null);
  const [latestPm25, setLatestPm25] = useState<number | null>(null);
  const [latestPm10, setLatestPm10] = useState<number | null>(null);
  const [city, setCity] = useState('');
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const sx = useSpring(pointerX, { stiffness: 60, damping: 20 });
  const sy = useSpring(pointerY, { stiffness: 60, damping: 20 });
  const sphereTX = useTransform(sx, [-0.5, 0.5], [-18, 18]);
  const sphereTY = useTransform(sy, [-0.5, 0.5], [-14, 14]);
  const orbTX = useTransform(sx, [-0.5, 0.5], [12, -12]);
  const orbTY = useTransform(sy, [-0.5, 0.5], [10, -10]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    getStations().then(async (items) => {
      const selected = items.find((item) => item.name.toLowerCase() === 'delhi') ?? items[0];
      if (!selected) return;
      const points = await getHistory(selected.id);
      if (active) {
        setCity(selected.name);
        setLatest([...points].reverse().find((point) => typeof point.aqi === 'number' && Number.isFinite(point.aqi)) ?? null);
        setLatestPm25([...points].reverse().find((point) => typeof point.pm25 === 'number' && Number.isFinite(point.pm25))?.pm25 ?? null);
        setLatestPm10([...points].reverse().find((point) => typeof point.pm10 === 'number' && Number.isFinite(point.pm10))?.pm10 ?? null);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      pointerX.set((e.clientX - r.left) / r.width - 0.5);
      pointerY.set((e.clientY - r.top) / r.height - 0.5);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [pointerX, pointerY, reduced]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const lineParent = {
    hidden: {},
    show: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } },
  };
  const lineChild = {
    hidden: { y: '110%', opacity: 0 },
    show: { y: '0%', opacity: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section
      id="hero"
      ref={rootRef}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pt-24 sm:px-8"
    >
      {/* Floating eyebrow label */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.7 }}
        className="mx-auto flex max-w-7xl items-center gap-3"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/5 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
          </span>
          <span className="eyebrow !tracking-[0.3em]">AIRFLOW / ENVIRONMENTAL INTELLIGENCE</span>
        </span>
      </motion.div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 pt-12 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Headline */}
        <div className="relative z-10">
          <motion.h1
            variants={lineParent}
            initial="hidden"
            animate="show"
            className="font-display text-[clamp(3.2rem,11vw,8.5rem)] font-bold leading-[0.92] tracking-tightest text-fog"
          >
            <span className="block overflow-hidden">
              <motion.span variants={lineChild} className="block">
                BREATHE
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span variants={lineChild} className="block text-gradient-lime">
                THE FUTURE.
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-7 max-w-md text-base leading-relaxed text-fog-muted sm:text-lg"
          >
            Explore historical air-quality patterns and forecast what may follow a selected date range.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => scrollTo('overview')}
              className="group inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-semibold text-ink-900 transition-all hover:bg-lime-bright hover:shadow-[0_0_40px_-6px_rgba(198,255,77,0.55)] focus-ring"
            >
              Explore the Atmosphere
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollTo('predictions')}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-fog transition-all hover:border-lime/40 hover:bg-white/[0.06] focus-ring"
            >
              <Activity className="h-4 w-4 text-lime" />
              View Predictions
            </button>
          </motion.div>

          {/* Latest dataset observation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-10 flex items-center gap-5"
          >
            <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
              <Sparkles className="h-4 w-4 text-lime" />
              <div className="leading-tight">
                <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Latest AQI · {city || 'City'}</div>
                <div className="font-display text-sm font-semibold text-fog">{latest?.aqi != null ? Math.round(latest.aqi) : '—'}{latest ? ` · ${latest.date}` : ''}</div>
              </div>
            </div>
            <div className="hidden h-8 w-px bg-white/10 sm:block" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="leading-tight">
                <div className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">Source</div>
                <div className="font-mono text-sm text-fog">AQI city data / CPCB particulates</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Atmospheric sphere visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[440px]"
        >
          <motion.div style={{ x: sphereTX, y: sphereTY }} className="relative h-full w-full">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-lime/15 animate-spin-slower" />
            <div className="absolute inset-6 rounded-full border border-lime/10 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
            {/* Glow */}
            <div className="absolute inset-12 rounded-full bg-lime/10 blur-3xl animate-pulse-glow" />
            {/* Sphere core */}
            <div
              className="absolute inset-16 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, rgba(198,255,77,0.35), rgba(141,255,106,0.12) 45%, rgba(8,10,8,0.6) 78%)',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6), 0 0 60px rgba(198,255,77,0.18)',
              }}
            />
            {/* Atmosphere lines */}
            <svg viewBox="0 0 200 200" className="absolute inset-16 h-[calc(100%-8rem)] w-[calc(100%-8rem)] animate-spin-slower">
              <defs>
                <linearGradient id="orb-line" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#C6FF4D" stopOpacity="0.0" />
                  <stop offset="50%" stopColor="#C6FF4D" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#C6FF4D" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <ellipse cx="100" cy="100" rx="92" ry="34" fill="none" stroke="url(#orb-line)" strokeWidth="1" />
              <ellipse cx="100" cy="100" rx="92" ry="58" fill="none" stroke="url(#orb-line)" strokeWidth="0.6" opacity="0.6" />
              <ellipse cx="100" cy="100" rx="60" ry="92" fill="none" stroke="url(#orb-line)" strokeWidth="0.5" opacity="0.4" />
            </svg>
            {/* Center node */}
            <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center">
              <div className="absolute inset-0 rounded-full bg-lime/20 blur-xl animate-pulse-glow" />
              <div className="relative h-3 w-3 rounded-full bg-lime shadow-[0_0_20px_4px_rgba(198,255,77,0.7)]" />
            </div>
          </motion.div>

          {/* Floating data tags */}
          <motion.div
            style={{ x: orbTX, y: orbTY }}
            className="absolute -left-2 top-10 rounded-lg border border-white/10 bg-ink-700/80 px-3 py-2 backdrop-blur-md"
          >
            <div className="font-mono text-[9px] uppercase tracking-widest text-fog-faint">PM2.5</div>
            <div className="font-display text-sm font-semibold text-lime">{latestPm25 != null ? `${Math.round(latestPm25)} µg/m³` : '—'}</div>
          </motion.div>
          <motion.div
            style={{ x: orbTX, y: orbTY }}
            className="absolute -right-2 bottom-14 rounded-lg border border-white/10 bg-ink-700/80 px-3 py-2 backdrop-blur-md"
          >
            <div className="font-mono text-[9px] uppercase tracking-widest text-fog-faint">PM10</div>
            <div className="font-display text-sm font-semibold text-fog">{latestPm10 != null ? `${Math.round(latestPm10)} µg/m³` : '—'}</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={() => scrollTo('overview')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-2 focus-ring rounded-xl"
        aria-label="Scroll to overview"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog-faint">Scroll</span>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10">
          <motion.span
            animate={reduced ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="h-4 w-4 text-lime" />
          </motion.span>
        </span>
      </motion.button>
    </section>
  );
}
