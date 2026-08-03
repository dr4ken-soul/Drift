'use client';

import { motion } from 'motion/react';

const nodes = [
  { id: 'root', x: 18, y: 50, parent: null, label: 'v1' },
  { id: 'light', x: 48, y: 28, parent: 'root', label: 'v2' },
  { id: 'frame', x: 48, y: 73, parent: 'root', label: 'v2b' },
  { id: 'colour', x: 78, y: 18, parent: 'light', label: 'v3' },
  { id: 'final', x: 78, y: 52, parent: 'light', label: 'v3b' },
  { id: 'wide', x: 78, y: 83, parent: 'frame', label: 'v3c' },
];

/** Renders the marketing preview of a branching prompt lineage. */
export function Tree() {
  return (
    <section data-density="dense" className="relative z-10 min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-y-0 left-[8%] border-l border-[var(--border-subtle)]" />
      <div className="absolute inset-y-0 left-1/2 border-l border-[var(--border-subtle)]" />
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-8 px-[8%] lg:grid-cols-12">
        <motion.div initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.7, delay: 0.2 }} className="lg:col-span-4">
          <div className="mb-2 font-mono text-xs tracking-wider text-[var(--text-muted)]">genealogy</div>
          <h2 className="font-display text-4xl italic text-[var(--text-primary)]">Every run knows its parent.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">Each Genblaze pipeline call links to the run it came from via from_result(), stored in B2 through ParquetSink. Nothing is ever disconnected from its history.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.7, delay: 0.4 }} className="relative aspect-[16/10] overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 lg:col-span-8">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {nodes.filter((node) => node.parent).map((node) => {
              const parent = nodes.find((candidate) => candidate.id === node.parent);
              return parent ? <line key={node.id} x1={`${parent.x}%`} y1={`${parent.y}%`} x2={`${node.x}%`} y2={`${node.y}%`} stroke="var(--border-default)" strokeWidth="0.45" /> : null;
            })}
          </svg>
          {nodes.map((node, index) => <motion.div key={node.id} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.4, delay: 0.5 + index * 0.12 }} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <div className={`h-4 w-4 rounded-full border-2 border-[var(--bg-surface)] transition-transform duration-150 group-hover:scale-125 ${node.parent ? 'bg-[var(--text-secondary)]' : 'bg-[var(--accent)]'}`} />
            <span className="absolute left-1/2 top-6 -translate-x-1/2 font-mono text-[10px] text-[var(--text-muted)]">{node.label}</span>
          </motion.div>)}
        </motion.div>
      </div>
    </section>
  );
}
