'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

/** Renders Drift's fixed dual-pill navigation. */
export function Nav() {
  const [open, setOpen] = useState(false);

  /** Toggle the compact mobile navigation menu. */
  const toggleMenu = (): void => setOpen((current) => !current);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      className="fixed inset-x-0 top-4 z-50 flex items-start justify-between px-6 lg:px-12"
    >
      <Link href="/" className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-2.5 font-display text-lg italic text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]">
        drift
      </Link>
      <div className="relative">
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] p-1.5">
          <div className="hidden items-center gap-0.5 md:flex">
            <Link href="/tree" className="rounded-full px-3 py-2 font-mono text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">Tree</Link>
            <Link href="/tree#delta" className="rounded-full px-3 py-2 font-mono text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">Delta</Link>
            <Link href="/tree#provenance" className="rounded-full px-3 py-2 font-mono text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">Provenance</Link>
          </div>
          <Link href="/tree" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]">Try Drift</Link>
          <button type="button" aria-label="Open navigation" onClick={toggleMenu} className="rounded-full p-2 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] md:hidden">
            <ChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>
        {open && (
          <div className="absolute right-0 top-full mt-1.5 flex w-40 flex-col gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2 md:hidden">
            <Link href="/tree" onClick={toggleMenu} className="rounded-lg px-3 py-2 font-mono text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">Tree</Link>
            <Link href="/tree#delta" onClick={toggleMenu} className="rounded-lg px-3 py-2 font-mono text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">Delta</Link>
            <Link href="/tree#provenance" onClick={toggleMenu} className="rounded-lg px-3 py-2 font-mono text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">Provenance</Link>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
