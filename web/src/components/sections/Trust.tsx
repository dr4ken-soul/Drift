'use client';

import { motion } from 'motion/react';

const metrics = [
  ['SHA-256', 'manifest verification per run'],
  ['B2', 'every manifest and Parquet index stored durably'],
  ['2 of 2', 'hallucination checks passed on re-run'],
];

/** Renders the provenance and storage trust metrics. */
export function Trust() {
  return (
    <section id="provenance" data-density="calm" className="relative z-10 bg-[var(--bg-primary)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">provenance</div>
        <h2 className="mb-16 font-display text-3xl italic text-[var(--text-primary)] md:text-4xl">Every output carries proof of how it was made.</h2>
        <div className="grid grid-cols-1 gap-px bg-[var(--border-subtle)] md:grid-cols-3">
          {metrics.map(([value, label], index) => <motion.div key={value} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.6, delay: index * 0.1 }} className="bg-[var(--bg-primary)] p-8">
            <div className="font-display text-5xl tracking-[-0.02em] text-[var(--text-primary)] italic">{value}</div>
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</div>
          </motion.div>)}
        </div>
      </div>
    </section>
  );
}
