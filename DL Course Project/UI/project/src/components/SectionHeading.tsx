import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

interface Props {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  id?: string;
}

export default function SectionHeading({ eyebrow, title, description, align = 'left', id }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const center = align === 'center';
  return (
    <div
      ref={ref}
      id={id}
      className={`flex flex-col gap-4 ${center ? 'items-center text-center' : 'items-start'}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="eyebrow"
      >
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight text-fog"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.12 }}
          className={`max-w-2xl text-base leading-relaxed text-fog-muted ${center ? 'mx-auto' : ''}`}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
