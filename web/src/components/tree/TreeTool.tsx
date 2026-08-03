'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, GitBranch, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

import { createRun, fetchDelta, fetchRuns, type DeltaResult, type Run } from '@/lib/api';
import { DeltaCard } from '@/components/delta/DeltaCard';

/** Loading skeleton for the live tree surface. */
function TreeSkeleton() {
  return <div className="grid min-h-[420px] grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="skeleton rounded-[20px] border border-[var(--border-default)]" /><div className="space-y-4"><div className="skeleton h-24 rounded-[14px]" /><div className="skeleton h-48 rounded-[14px]" /></div></div>;
}

/** Renders a compact manually positioned genealogy graph without a graph dependency. */
function GenealogyGraph({ runs, selectedId, onSelect }: { runs: Run[]; selectedId: string | null; onSelect: (run: Run) => void }) {
  const levels = useMemo(() => {
    const roots = runs.filter((run) => !run.parent_run_id);
    const columns: Run[][] = [roots];
    runs.filter((run) => run.parent_run_id).forEach((run) => {
      const depth = Math.min(3, columns.findIndex((column) => column.some((item) => item.run_id === run.parent_run_id)) + 1 || 1);
      if (!columns[depth]) columns[depth] = [];
      columns[depth].push(run);
    });
    return columns.filter(Boolean);
  }, [runs]);
  const positions = new Map<string, { x: number; y: number }>();
  levels.forEach((column, columnIndex) => column.forEach((run, rowIndex) => positions.set(run.run_id, { x: 14 + columnIndex * 28, y: 24 + rowIndex * (52 / Math.max(column.length, 1)) })));

  return <div className="relative min-h-[420px] overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
    <div className="absolute left-6 top-6 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">stored genealogy</div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {runs.filter((run) => run.parent_run_id).map((run) => {
        const child = positions.get(run.run_id);
        const parent = run.parent_run_id ? positions.get(run.parent_run_id) : undefined;
        return child && parent ? <line key={run.run_id} x1={`${parent.x}%`} y1={`${parent.y}%`} x2={`${child.x}%`} y2={`${child.y}%`} stroke="var(--border-default)" strokeWidth="0.35" /> : null;
      })}
    </svg>
    {runs.map((run) => {
      const position = positions.get(run.run_id) ?? { x: 14, y: 50 };
      const selected = selectedId === run.run_id;
      return <button type="button" key={run.run_id} onClick={() => onSelect(run)} className="group absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`Select run ${run.run_id}`}>
        <span className={`block h-6 w-6 rounded-full border-4 border-[var(--bg-surface)] transition-transform duration-150 group-hover:scale-125 ${selected ? 'bg-[var(--accent)] ring-4 ring-[var(--accent-glow)]' : run.parent_run_id ? 'bg-[var(--text-secondary)]' : 'bg-[var(--accent)]'}`} />
        <span className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[var(--text-muted)]">{run.run_id.slice(0, 7)}</span>
      </button>;
    })}
    {runs.length === 0 && <div className="flex h-full min-h-[360px] items-center justify-center text-center"><div><GitBranch className="mx-auto mb-3 text-[var(--text-muted)]" size={24} /><p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">no runs yet</p><p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">Create the first prompt below and Drift will place it at the root of your lineage.</p></div></div>}
  </div>;
}

/** Renders the interactive product surface for runs, provenance, and deltas. */
export function TreeTool() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [delta, setDelta] = useState<DeltaResult | null>(null);
  const [prompt, setPrompt] = useState('A quiet editorial still life with a ceramic vase and dried flowers');
  const [parentId, setParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [deltaLoading, setDeltaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Refresh the stored lineage from the backend. */
  const loadRuns = async (): Promise<void> => {
    setLoading(true);
    try { setRuns(await fetchRuns()); setError(null); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load runs'); } finally { setLoading(false); }
  };

  useEffect(() => { void loadRuns(); }, []);

  /** Select a run and request its parent comparison when available. */
  const selectRun = async (run: Run): Promise<void> => {
    setSelected(run);
    setParentId(run.run_id);
    setDelta(null);
    if (!run.parent_run_id) return;
    setDeltaLoading(true);
    try { setDelta(await fetchDelta(run.parent_run_id, run.run_id)); setError(null); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to analyse this comparison'); } finally { setDeltaLoading(false); }
  };

  /** Submit a new root or chained prompt iteration. */
  const submitRun = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (prompt.trim().length < 3) return;
    setWorking(true);
    try {
      const run = await createRun(prompt.trim(), parentId);
      setRuns((current) => [...current, run]);
      setSelected(run);
      setPrompt('');
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create the run'); } finally { setWorking(false); }
  };

  return <main className="relative z-10 min-h-screen bg-[var(--bg-primary)] px-6 pb-24 pt-32 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">the live tool</div><h1 className="max-w-3xl font-display text-5xl leading-[0.92] text-[var(--text-primary)] italic md:text-7xl">Make the next version accountable.</h1><p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">Generate a root, refine it, then click any child to see the prompt change and the grounded visual delta.</p></div><button type="button" onClick={() => void loadRuns()} className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"><RefreshCw size={14} />refresh index</button></div>
      {error && <div className="mb-6 rounded-[14px] border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">{error}</div>}
      {loading ? <TreeSkeleton /> : <div className="grid min-h-[420px] grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]"><GenealogyGraph runs={runs} selectedId={selected?.run_id ?? null} onSelect={(run) => void selectRun(run)} /><div className="space-y-4">{selected ? <motion.div initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">selected run</span>{selected.manifest_verified && <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--success)]"><Check size={13} />verified</span>}</div><div className="mb-4 aspect-[4/3] overflow-hidden rounded-[8px] bg-[var(--bg-elevated)]">{selected.asset_url && <img src={selected.asset_url} alt="Generated Drift run" className="h-full w-full object-cover" />}</div><p className="text-sm leading-relaxed text-[var(--text-primary)]">{selected.prompt}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-4 font-mono text-[10px] uppercase text-[var(--text-muted)]"><span>model <b className="mt-1 block font-normal normal-case text-[var(--text-secondary)]">{selected.model}</b></span><span>sha-256 <b className="mt-1 block truncate font-normal normal-case text-[var(--text-secondary)]">{selected.sha256.slice(0, 16)}...</b></span></div></motion.div> : <div className="flex min-h-[260px] items-center justify-center rounded-[14px] border border-dashed border-[var(--border-default)] p-8 text-center"><div><ImageIcon className="mx-auto mb-3 text-[var(--text-muted)]" size={24} /><p className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">select a node</p><p className="mt-2 text-sm text-[var(--text-secondary)]">The manifest and parent delta will appear here.</p></div></div>}{selected?.parent_run_id && <div id="delta">{deltaLoading ? <div className="space-y-2 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"><div className="skeleton h-3 w-32 rounded" /><div className="skeleton h-3 w-full rounded" /><div className="skeleton h-3 w-4/5 rounded" /><div className="skeleton h-3 w-11/12 rounded" /></div> : delta && <DeltaCard result={delta} />}</div>}</div></div>}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={submitRun} className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8"><div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-[var(--accent)]"><ArrowUpRight size={14} />new iteration</div><label htmlFor="prompt" className="mb-2 block text-sm text-[var(--text-secondary)]">Describe the image you want to make</label><textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} className="w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 text-sm leading-relaxed text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]" /><div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">iterate from<select value={parentId ?? ''} onChange={(event) => setParentId(event.target.value || null)} className="rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 font-mono text-[10px] normal-case text-[var(--text-secondary)] outline-none"><option value="">new root</option>{runs.map((run) => <option key={run.run_id} value={run.run_id}>{run.run_id.slice(0, 7)} · {run.prompt.slice(0, 24)}</option>)}</select></label><button type="submit" disabled={working || prompt.trim().length < 3} className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40">{working ? 'Generating...' : parentId ? 'Generate iteration' : 'Generate root'}</button></div></form>
        <div id="provenance" className="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8"><div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-[var(--accent)]"><ArrowLeft size={14} />provenance</div><p className="text-sm leading-relaxed text-[var(--text-secondary)]">Each run is backed by a Genblaze manifest with a canonical SHA-256 hash. B2 stores the image and manifest, while ParquetSink keeps the lineage index queryable.</p><div className="mt-6 space-y-3 font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]"><div className="flex justify-between border-b border-[var(--border-subtle)] pb-3"><span>provider</span><span className="text-[var(--text-secondary)]">GMI Cloud</span></div><div className="flex justify-between border-b border-[var(--border-subtle)] pb-3"><span>generation</span><span className="text-[var(--text-secondary)]">seedream-5.0-lite</span></div><div className="flex justify-between"><span>delta</span><span className="text-[var(--text-secondary)]">qwen/qwen3.6-27b</span></div></div></div>
      </section>
    </div>
  </main>;
}
