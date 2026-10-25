import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { aqiCategory } from '@/services/demoData';

interface Props {
  label: string;
  value: number | null;
  unit: string;
  delta: number;
  caption: string;
  series?: number[];
  accent?: boolean;
  index: number;
}

function Sparkline({ points, accent }: { points: number[]; accent?: boolean }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)}${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full overflow-visible">
      <defs>
        <linearGradient id={accent ? 'spark-lime' : 'spark-grey'} x1="0" y1="0" x2="0" y2="1">
          {accent ? (
            <>
              <stop offset="0%" stopColor="#C6FF4D" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#C6FF4D" stopOpacity="0" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#969D94" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#969D94" stopOpacity="0" />
            </>
          )}
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${accent ? 'spark-lime' : 'spark-grey'})`} />
      <path d={d} fill="none" stroke={accent ? '#C6FF4D' : '#969D94'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MetricCard({ label, value, unit, delta, caption, accent, index, series }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const trend = delta > 1.5 ? 'up' : delta < -1.5 ? 'down' : 'flat';
  const cat = accent && value !== null ? aqiCategory(value) : null;

  const points = series && series.length > 1 ? series : Array.from({ length: 14 }, () => value ?? 0);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="surface surface-glow group relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-faint">{label}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
            trend === 'up' ? 'bg-amber-400/10 text-amber-300' : trend === 'down' ? 'bg-lime/10 text-lime' : 'bg-white/5 text-fog-muted'
          }`}
        >
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}%
        </span>
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 + index * 0.07, duration: 0.6 }}
          className={`font-display text-4xl font-bold leading-none tracking-tight ${accent ? 'text-lime' : 'text-fog'}`}
        >
          {value ?? '—'}
        </motion.span>
        <span className="mb-1 font-mono text-xs text-fog-muted">{unit}</span>
      </div>

      {cat && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
          {cat.label}
        </div>
      )}

      <div className="mt-3">
        <Sparkline points={points} accent={accent} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-fog-faint">{caption}</p>
    </motion.div>
  );
}
