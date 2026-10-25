import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AQI_BANDS, aqiCategory } from '@/services/demoData';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  value: number;
  size?: number;
}

export default function AQIGauge({ value, size = 240 }: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const cat = aqiCategory(value);
  const r = size / 2 - 18;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 180;
  const endAngle = 360;
  const totalAngle = endAngle - startAngle;
  const maxAqi = 500;
  const valueAngle = startAngle + (Math.min(value, maxAqi) / maxAqi) * totalAngle;

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = display;
    const t0 = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  const polar = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (a0: number, a1: number, radius: number) => {
    const p0 = polar(a0, radius);
    const p1 = polar(a1, radius);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  const segments = AQI_BANDS.map((b) => {
    const a0 = startAngle + (b.min / maxAqi) * totalAngle;
    const a1 = startAngle + (Math.min(b.max, maxAqi) / maxAqi) * totalAngle;
    return { ...b, path: arcPath(a0, a1, r) };
  });

  const needleEnd = polar(valueAngle, r - 6);
  const needleBack = polar(valueAngle + 180, 10);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size / 1.5 + 20 }}>
      <svg width={size} height={size / 1.6 + 30} viewBox={`0 0 ${size} ${size / 1.6 + 30}`}>
        {/* Band segments */}
        {segments.map((s) => (
          <path key={s.label} d={s.path} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" opacity={0.85} />
        ))}
        {/* Active highlight */}
        <motion.path
          d={arcPath(startAngle, valueAngle, r)}
          fill="none"
          stroke={cat.color}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${cat.color}aa)` }}
        />
        {/* Needle */}
        <motion.g
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >
          <line x1={needleBack.x} y1={needleBack.y} x2={needleEnd.x} y2={needleEnd.y} stroke="#F5F7F2" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
        <circle cx={cx} cy={cy} r="6" fill="#080A08" stroke={cat.color} strokeWidth="2" />
      </svg>

      <div className="absolute bottom-2 flex flex-col items-center">
        <div className="font-display text-4xl font-bold leading-none text-fog">
          {display}
        </div>
        <div
          className="mt-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
        >
          {cat.label}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fog-faint">
          AQI · CPCB India
        </div>
      </div>

      {/* Scale labels */}
      <div className="mt-1 flex w-full max-w-xs justify-between px-2 font-mono text-[9px] text-fog-faint">
        <span>0</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>400</span>
        <span>500</span>
      </div>
    </div>
  );
}
