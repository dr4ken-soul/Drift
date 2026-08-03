'use client';

import { motion } from 'motion/react';

const fields = [
  ['composition', 'Framing stays wide while the subject moves closer to the left third.'],
  ['subjectTreatment', 'The subject keeps its shape, with more visible surface detail on the stem.'],
  ['lightingMoodColour', 'Side light deepens the table shadow. The dried flower shifts warmer than light alone explains.'],
  ['technicalExecution', 'Edges remain clean. Fine grain is visible in the darker background.'],
  ['unrealisedChanges', 'The requested moody atmosphere is only partly visible.'],
  ['unintendedDrift', 'Flower colour shifted beyond what the lighting change alone explains.'],
  ['recommendation', 'Refine the lighting prompt while explicitly protecting the flower palette.'],
];

/** Renders the locked delta schema as the landing page proof point. */
export function Delta() {
  return (
    <section id="delta" data-density="dense" className="relative z-10 min-h-[100dvh] bg-[var(--bg-secondary)]">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:px-16">
        <motion.div initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.7, delay: 0.2 }}>
          <div className="mb-4 font-mono text-xs uppercase tracking-widest text-[var(--accent)]">the schema</div>
          <h2 className="font-display text-4xl tracking-tight text-[var(--text-primary)] md:text-5xl italic">Structure catches what a glance misses.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">Seven fixed fields, grounded against the actual prompt diff, not a blind pixel comparison. It names what changed, flags what you did not ask for, and says so plainly when nothing changed at all.</p>
          <div className="mt-10 flex gap-6 border-t border-[var(--border-subtle)] pt-6">
            <div><div className="font-mono text-[10px] uppercase text-[var(--text-muted)]">model</div><div className="font-mono text-sm text-[var(--text-primary)]">qwen3.6-27b</div></div>
            <div><div className="font-mono text-[10px] uppercase text-[var(--text-muted)]">fields</div><div className="font-mono text-sm text-[var(--text-primary)]">7</div></div>
            <div><div className="font-mono text-[10px] uppercase text-[var(--text-muted)]">checks</div><div className="font-mono text-sm text-[var(--text-primary)]">2 of 2</div></div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.7, delay: 0.4 }} className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8">
          {fields.map(([label, value], index) => <motion.div key={label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.35, delay: 0.5 + index * 0.04 }} className="border-b border-[var(--border-subtle)] py-3 last:border-b-0">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">{label}</div>
            <div className="text-sm text-[var(--text-secondary)]">{value}</div>
          </motion.div>)}
        </motion.div>
      </div>
    </section>
  );
}
