import Link from 'next/link';

/** Renders the quiet editorial footer below the landing page. */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] py-12">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 md:flex-row md:items-center">
        <div className="font-display text-lg italic text-[var(--text-secondary)]">drift</div>
        <div className="flex gap-6 font-mono text-xs text-[var(--text-muted)]">
          <Link href="https://github.com/dr4ken-soul/Drift" className="transition-colors hover:text-[var(--text-primary)]">GitHub</Link>
          <span>Backblaze Generative Media Hackathon</span>
          <Link href="https://github.com/backblaze-labs/genblaze" className="transition-colors hover:text-[var(--text-primary)]">Genblaze</Link>
        </div>
      </div>
    </footer>
  );
}
