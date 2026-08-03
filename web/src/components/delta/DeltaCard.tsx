'use client';

import { motion } from 'motion/react';

import type { DeltaResult } from '@/lib/api';

const labels: Array<[keyof DeltaResult, string]> = [
  ['composition', 'composition'],
  ['subjectTreatment', 'subjectTreatment'],
  ['lightingMoodColour', 'lightingMoodColour'],
  ['technicalExecution', 'technicalExecution'],
  ['unrealisedChanges', 'unrealisedChanges'],
  ['unintendedDrift', 'unintendedDrift'],
  ['recommendation', 'recommendation'],
];

/** Renders the complete seven-field delta result with status signalling. */
export function DeltaCard({ result }: { result: DeltaResult }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8">
      {labels.map(([key, label], index) => {
        const value = result[key];
        const isFlag = key === 'unintendedDrift' && Boolean(value);
        const isClean = (key === 'unintendedDrift' || key === 'unrealisedChanges') && !value;
        return <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04 }} className="border-b border-[var(--border-subtle)] py-3 last:border-b-0">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">{label}</div>
          {isFlag && <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--error)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--error)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />flagged</span>}
          {isClean && <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--success)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--success)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />clean</span>}
          <div className="text-sm leading-relaxed text-[var(--text-secondary)]">{value ?? 'none noted'}</div>
        </motion.div>;
      })}
    </div>
  );
}
