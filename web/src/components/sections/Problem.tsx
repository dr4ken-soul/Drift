'use client';

import { motion } from 'motion/react';

/** Renders the problem statement behind Drift's genealogy mechanic. */
export function Problem() {
  const words = 'Every iteration you generate disappears the moment you write the next prompt. Nothing remembers what changed, or whether the change you asked for is the one you got.'.split(' ');
  return (
    <section data-density="calm" className="relative z-10 flex min-h-[100dvh] items-center bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">the problem</motion.div>
        <p className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--text-primary)] md:text-5xl lg:text-6xl italic">
          {words.map((word, index) => <motion.span key={`${word}-${index}`} initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }} whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.6, delay: index * 0.08 }} className="mr-[0.25em] inline-block">{word}</motion.span>)}
        </p>
      </div>
    </section>
  );
}
