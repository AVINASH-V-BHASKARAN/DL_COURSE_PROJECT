import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Wind } from 'lucide-react';
import { useActiveSection } from '@/hooks/useActiveSection';

const LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'history', label: 'Historical Data' },
  { id: 'how', label: 'How It Works' },
  { id: 'about', label: 'About' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(8,10,8,0.78)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(198,255,77,0.08)' : '1px solid transparent',
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <button onClick={() => go('hero')} className="flex items-center gap-2.5 focus-ring rounded-lg" aria-label="AIRFLOW home">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-lime/30 bg-lime/5">
            <Wind className="h-4.5 w-4.5 text-lime" strokeWidth={2.4} />
            <span className="absolute inset-0 rounded-xl bg-lime/10 blur-md -z-10" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-fog">
            AIR<span className="text-lime">FLOW</span>
          </span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="relative rounded-lg px-3.5 py-2 text-sm font-medium text-fog-muted transition-colors hover:text-fog focus-ring"
            >
              {active === l.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-white/5"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={active === l.id ? 'relative text-lime' : 'relative'}>{l.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go('predictions')}
            className="hidden rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-ink-900 transition-all hover:bg-lime-bright hover:shadow-[0_0_30px_-6px_rgba(198,255,77,0.6)] focus-ring sm:block"
          >
            Launch Dashboard
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-fog md:hidden focus-ring"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/5 bg-ink-800/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className={`rounded-xl px-4 py-3 text-left text-base font-medium transition-colors focus-ring ${
                    active === l.id ? 'bg-lime/10 text-lime' : 'text-fog-muted hover:bg-white/5 hover:text-fog'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => go('predictions')}
                className="mt-2 rounded-xl bg-lime px-4 py-3 text-center text-base font-semibold text-ink-900 focus-ring"
              >
                Launch Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
