'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

/** Renders the final call to the live genealogy tool. */
export function FinalCta() {
  return (
    <section data-density="hero" className="relative z-10 flex min-h-[70dvh] items-center justify-center overflow-hidden bg-[var(--bg-secondary)]">
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <motion.h2 initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.8 }} className="font-display text-4xl leading-tight text-[var(--text-primary)] italic md:text-5xl">Stop guessing what changed.</motion.h2>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.1 }} transition={{ duration: 0.6, delay: 0.3 }}><Link href="/tree" className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]">Try Drift</Link></motion.div>
      </div>
    </section>
  );
}
