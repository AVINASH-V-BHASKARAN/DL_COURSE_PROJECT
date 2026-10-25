import { motion } from 'framer-motion';
import { ShieldCheck, HeartPulse, Info } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { AQI_BANDS } from '@/services/demoData';

export default function AirQualityGuide() {
  return (
    <section id="about" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="05 / Air Quality & Health"
          title={
            <>
              READING <span className="text-gradient-lime">THE SCALE.</span>
            </>
          }
          description="AIRFLOW uses India's CPCB National Air Quality Index. Each band reflects a range of pollutant concentrations and a level of health concern."
        />

        {/* Scale bar */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-white/8">
          <div className="flex h-3 w-full">
            {AQI_BANDS.map((b) => (
              <div key={b.label} style={{ backgroundColor: b.color, flex: b.max - b.min + 1 }} className="h-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {AQI_BANDS.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="border-b border-white/5 p-4 last:border-0 sm:border-r sm:last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  <span className="text-sm font-semibold text-fog">{b.label}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-fog-faint">{b.min}–{b.max}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AQI_BANDS.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="surface group relative overflow-hidden p-5"
              style={{ borderColor: `${b.color}30` }}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: b.color }} />
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-fog">{b.label}</span>
                <span className="rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold" style={{ backgroundColor: `${b.color}1a`, color: b.color }}>
                  {b.min}–{b.max}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fog-muted">{b.advice}</p>
            </motion.div>
          ))}
        </div>

        {/* Disclaimers */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
            <p className="text-xs leading-relaxed text-fog-muted">
              Health guidance here is general and informational — not personalized medical advice. Sensitive groups should consult a physician.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lime" />
            <p className="text-xs leading-relaxed text-fog-muted">
              Categories and breakpoints follow the CPCB National AQI bands used by the source dataset.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-200/90">AQI observations are historical through April 2025. Separate CPCB-derived PM2.5 and PM10 station readings extend through September 1, 2025. This is not a live sensor feed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
