import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Database,
  Filter as FilterIcon,
  Brain,
  LineChart,
  Eye,
  ArrowRight,
  ArrowDown,
  Eraser,
} from 'lucide-react';
import SectionHeading from './SectionHeading';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const STEPS = [
  {
    n: '01',
    icon: Database,
    title: 'Collect',
    body: 'Daily AQI observations come from the city AQI dataset. Newer station-level PM2.5 and PM10 measurements are shown separately for historical comparison.',
  },
  {
    n: '02',
    icon: Eraser,
    title: 'Clean & Normalize',
    body: 'Short gaps in the AQI series are interpolated, then AQI values are scaled for the selected city and date range.',
  },
  {
    n: '03',
    icon: Brain,
    title: 'Sequence',
    body: 'The cleaned AQI series is sliced into overlapping 7-day windows. Each window contains seven daily AQI observations.',
  },
  {
    n: '04',
    icon: Brain,
    title: 'LSTM Learns',
    body: 'The Long Short-Term Memory network reads each window in order, remembering important patterns and forgetting noise through its gating mechanism.',
  },
  {
    n: '05',
    icon: LineChart,
    title: 'Forecast',
    body: 'The trained model generates AQI values for the next 1, 3, or 7 days, which are then visualized against the historical trend.',
  },
];

const GATES = [
  { name: 'Forget gate', desc: 'Decides what old memory to discard.', color: '#FF9E3D' },
  { name: 'Input gate', desc: 'Decides what new information to store.', color: '#C6FF4D' },
  { name: 'Cell state', desc: 'The long-term memory carrying signal forward.', color: '#8DFF6A' },
  { name: 'Output gate', desc: 'Decides what part of memory to expose.', color: '#5BBA6F' },
];

export default function LSTMWorkflow() {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start center', 'end center'] });
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const progressX = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section id="how" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="04 / How It Works"
          title={
            <>
              THE PAST TEACHES <span className="text-gradient-lime">THE FUTURE.</span>
            </>
          }
          description="An LSTM (Long Short-Term Memory) network is built for sequences. Here is how the AQI observation history becomes a forecast."
        />

        {/* Pipeline */}
        <div ref={trackRef} className="relative mt-16">
          {/* Vertical progress line (mobile/tablet) */}
          <div className="absolute left-6 top-0 h-full w-px bg-white/8 sm:left-8">
            <motion.div
              style={{ scaleY: lineScaleY, transformOrigin: 'top' }}
              className="h-full w-full bg-gradient-to-b from-lime to-lime-bright"
            />
          </div>

          <div className="space-y-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-4 pl-16 sm:pl-24"
                >
                  <div className="absolute left-0 top-0 grid h-12 w-12 place-items-center rounded-2xl border border-lime/30 bg-ink-700 sm:h-16 sm:w-16">
                    <Icon className="h-5 w-5 text-lime sm:h-6 sm:w-6" />
                    <span className="absolute -top-2 -right-2 rounded-full bg-lime px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-900">{s.n}</span>
                  </div>
                  <div className="surface flex-1 p-5">
                    <h3 className="font-display text-lg font-bold text-fog">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fog-muted">{s.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* LSTM cell visualization */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <Eye className="h-4 w-4 text-lime" />
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-fog-faint">Inside an LSTM cell</h3>
          </div>
          <div className="surface surface-glow relative overflow-hidden p-6 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
              {/* Diagram */}
              <div className="relative">
                <svg viewBox="0 0 360 220" className="w-full">
                  {/* Cell state highway */}
                  <line x1="20" y1="40" x2="340" y2="40" stroke="#8DFF6A" strokeWidth="2.5" strokeDasharray="0" />
                  {/* Forget gate */}
                  <g>
                    <rect x="60" y="90" width="70" height="40" rx="8" fill="#FF9E3D22" stroke="#FF9E3D" />
                    <text x="95" y="114" textAnchor="middle" fill="#FF9E3D" fontSize="11" fontFamily="JetBrains Mono">forget</text>
                  </g>
                  {/* Input gate */}
                  <g>
                    <rect x="150" y="90" width="70" height="40" rx="8" fill="#C6FF4D22" stroke="#C6FF4D" />
                    <text x="185" y="114" textAnchor="middle" fill="#C6FF4D" fontSize="11" fontFamily="JetBrains Mono">input</text>
                  </g>
                  {/* Output gate */}
                  <g>
                    <rect x="240" y="90" width="70" height="40" rx="8" fill="#5BBA6F22" stroke="#5BBA6F" />
                    <text x="275" y="114" textAnchor="middle" fill="#5BBA6F" fontSize="11" fontFamily="JetBrains Mono">output</text>
                  </g>
                  {/* arrows to cell state */}
                  <path d="M95 90 L95 60" stroke="#FF9E3D" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M185 90 L185 60" stroke="#C6FF4D" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M275 90 L275 60" stroke="#5BBA6F" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  {/* Input h(t-1) */}
                  <path d="M20 170 L20 130 L95 130" stroke="#969D94" strokeWidth="1.5" />
                  <path d="M95 170 L95 130" stroke="#969D94" strokeWidth="1.5" />
                  <path d="M185 170 L185 130" stroke="#969D94" strokeWidth="1.5" />
                  <text x="14" y="190" fill="#969D94" fontSize="10" fontFamily="JetBrains Mono">h(t-1)</text>
                  <text x="300" y="30" fill="#8DFF6A" fontSize="10" fontFamily="JetBrains Mono">cell state</text>
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#C6FF4D" />
                    </marker>
                  </defs>
                </svg>
                {/* Flowing particle */}
                {!reduced && (
                  <motion.div
                    style={{ left: progressX }}
                    className="absolute top-[18%] h-2 w-2 -translate-x-1/2 rounded-full bg-lime shadow-[0_0_10px_2px_rgba(198,255,77,0.8)]"
                  />
                )}
              </div>

              {/* Gates explanation */}
              <div className="grid gap-3 sm:grid-cols-2">
                {GATES.map((g, i) => (
                  <motion.div
                    key={g.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-sm font-semibold text-fog">{g.name}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-fog-muted">{g.desc}</p>
                  </motion.div>
                ))}
                <div className="col-span-full rounded-xl border border-lime/15 bg-lime/[0.04] p-4 text-xs leading-relaxed text-fog-muted">
                  The LSTM keeps a <span className="text-lime">cell state</span> that flows almost unchanged through time, while the three gates decide what to add, remove, or expose — letting it hold long-range dependencies in a way plain networks cannot.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
