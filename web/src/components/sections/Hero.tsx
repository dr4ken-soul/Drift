'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

/** Renders the scroll-weighted editorial headline and live delta proof point. */
export function Hero() {
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: headlineRef, offset: ['start start', 'end start'] });
  const weight = useTransform(scrollYProgress, [0, 1], [900, 200]);
  const variation = useTransform(weight, (value) => `'wght' ${value}`);

  return (
    <section data-density="hero" className="relative z-10 min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)]">
      <div className="grain pointer-events-none absolute inset-0 z-[3] opacity-[0.035]" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between px-6 pb-16 pt-28 lg:px-16">
        <div ref={headlineRef} className="relative min-h-[66dvh]">
          <motion.h1
            initial={{ opacity: 0, filter: 'blur(10px)', y: 24 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            style={{ fontVariationSettings: variation }}
            className="max-w-[16ch] font-display text-[clamp(3.5rem,11vw,9rem)] leading-[0.88] tracking-[-0.02em] text-[var(--text-primary)] italic"
          >
            Every version remembered.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 }} className="mt-6 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
            Genealogy for every prompt iteration, and a model that tells you what actually changed, or admits when nothing did.
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.9 }} className="flex self-end items-center gap-4">
          <Link href="/tree" className="group flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]">
            <span>See a comparison</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-primary)]/15 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-0.5"><ArrowUpRight size={15} /></span>
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 1.1 }} className="absolute bottom-32 right-6 z-20 w-[280px] rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 lg:right-16">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">unintendedDrift</div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--error)]/10 px-2 py-0.5 font-mono text-xs text-[var(--error)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />flagged</div>
          <p className="text-sm leading-snug text-[var(--text-secondary)]">Flower colour shifted beyond what the lighting change alone explains.</p>
        </motion.div>
      </div>
    </section>
  );
}
