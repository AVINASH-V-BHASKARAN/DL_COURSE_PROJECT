import { useEffect, useRef, useState } from 'react';

interface Options {
  rootMargin?: string;
  threshold?: number | number[];
}

export function useInView<T extends HTMLElement>(opts: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(entry.target);
        }
      },
      { rootMargin: opts.rootMargin ?? '-10% 0px', threshold: opts.threshold ?? 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [opts.rootMargin, opts.threshold]);
  return { ref, inView };
}
