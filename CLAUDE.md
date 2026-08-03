# Drift — Agent Context

## What This Is

Drift is an iteration genealogy and delta analysis tool for generative media. Every prompt run through Genblaze chains to its parent via `from_result()`, building a branching tree stored in B2 through ParquetSink. A vision model compares any two connected nodes against their actual prompt diff and returns a structured verdict, what changed, what didn't happen that was asked for, and what changed that wasn't asked for, refusing to invent a difference when nothing actually changed.

Built for the Backblaze Generative Media Hackathon, Build with Genblaze on B2, deadline 3 August 2026, 22:00 GMT+1.

---

## One-Line Pitch

Drift remembers every prompt you've ever run, and tells you exactly what changed between any two versions, including the part you didn't ask for.

---

## MVP Features

1. Iteration genealogy — `from_result()`/`parent_run_id` chaining via Genblaze, stored in B2 through ParquetSink
2. Delta analysis engine — the validated seven-field schema, Groq `qwen/qwen3.6-27b`, `reasoning_effort: default`
3. Provenance manifest — Genblaze's SHA-256 manifest embedded per run, stored in B2 alongside the asset
4. Tree inspection UI — click any node, see its manifest, its prompt diff from its parent, and its delta result

Post-hackathon, not in MVP: cross-session chaining (`from_result()` is confirmed to work only within a live backend process, see BUILD_GUIDE.md Step 0), multi-provider generation (GMI Cloud image only), video and audio modalities, user auth and multi-tenant isolation, manual override of a delta result.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI |
| Media pipeline | Genblaze (`genblaze-core`, `genblaze-gmicloud`, `genblaze-s3`) |
| Image generation | GMI Cloud, `seedream-5.0-lite` |
| Delta analysis | Groq, `qwen/qwen3.6-27b`, `reasoning_effort: default` |
| Storage | Backblaze B2 via Genblaze's `ObjectStorageSink`, HIERARCHICAL layout |
| Genealogy index | Genblaze `ParquetSink` |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Animation | `motion/react` |
| Hosting | Vercel (frontend), any Python host reachable by it (backend) |

---

## Project Structure

```
drift/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── runs.py
│   │   │   └── delta.py
│   │   ├── services/
│   │   │   ├── storage.py       (shared ObjectStorageSink + ParquetSink)
│   │   │   ├── pipeline.py      (create_run, from_result chaining)
│   │   │   ├── tree.py          (list_runs, Parquet index read)
│   │   │   └── delta.py         (run_delta, the validated schema)
│   │   └── main.py
│   ├── data/                    (ParquetSink output)
│   └── .env
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         (landing page)
│   │   │   └── tree/page.tsx    (the live product surface)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Nav.tsx              (A4 dual-pill split)
│   │   │   │   └── DriftField.tsx       (ambient canvas, mounted once)
│   │   │   ├── sections/
│   │   │   │   ├── Hero.tsx             (kinetic headline mechanic)
│   │   │   │   ├── Problem.tsx
│   │   │   │   ├── Tree.tsx
│   │   │   │   ├── Delta.tsx
│   │   │   │   ├── Trust.tsx
│   │   │   │   ├── FinalCta.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── tree/             (live tree visualisation)
│   │   │   └── delta/            (delta card components)
│   │   └── styles/globals.css
│   └── .env.local
├── DRIFT_VALIDATION.md          (locked schema, source of truth)
├── FRONTEND_SPEC.md
├── BUILD_GUIDE.md
└── CLAUDE.md
```

---

## Design System

All seven gates confirmed, do not deviate from any value below.

**Aesthetic:** Kinetic editorial
**Identity fingerprint:** top-left lead, bottom-right support / kinetic type / monochrome + single pop / micro-noise gradient / front-loaded / editorial reveal

**Fonts:**
- Display: Bodoni Moda (italic, variable weight, carries the scroll-driven headline)
- Mono: Martian Mono
- Body: Inter

```css
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Martian+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
```

**Colour palette:**
```css
--bg-primary:     #0b0a0d;
--bg-secondary:   #121116;
--bg-surface:     #18171d;
--bg-elevated:    #201f26;
--accent:         #8b7cff;
--accent-hover:   #a396ff;
--accent-glow:    rgba(139, 124, 255, 0.12);
--text-primary:   #ececee;
--text-secondary: #94929c;
--text-muted:     #4d4b54;
--border-subtle:  rgba(139, 124, 255, 0.05);
--border-default: rgba(139, 124, 255, 0.10);
--success:        #6fcf97;
--error:          #ff6b6b;
```

`--success` and `--error` are not decorative, they're the same clean-pass and flagged-drift colours already validated in DRIFT_VALIDATION.md's test harness. Every delta card uses these two and no others for status.

**Nav:** A4, dual-pill split. Left pill wordmark only, right pill links plus CTA, nothing across the centre.

**Background:** Dual-Motion Sync, two layers, never both loud at once. The kinetic headline's scroll-driven weight shift is the loud layer. DriftField, a sparse 140-point ambient canvas at 0.05 to 0.22 opacity depending on section density, is the quiet layer.

**Section behaviour:** scroll-snapped, each section is one locked viewport.

---

## Landing Page Sections (in order)

1. **Nav** — fixed, dual-pill split
2. **Hero** — kinetic headline top-left, live delta chip and CTA bottom-right
3. **The Problem** — full-width statement, what iteration currently loses
4. **The Tree** — genealogy mechanic, marketing preview
5. **The Delta** — the schema's real output shown live
6. **Trust** — B2 and Genblaze provenance metrics
7. **Final CTA**
8. **Footer**

Full section-by-section spec with exact classes, copy and animation values lives in FRONTEND_SPEC.md, this list is the map, not the territory.

---

## Logo and Favicon

Neither exists yet. Leave both as plain comment slots:

```tsx
{/* Logo slot: replace with public/logo.svg once provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, an AI-generated icon or an emoji in either slot.

---

## Genblaze Integration

```
generate (root)      Pipeline("drift-iteration").step(GMICloudImageProvider(),
                      model="seedream-5.0-lite", prompt=..., modality=Modality.IMAGE)
                      .run(sink=storage)
generate (chained)   Pipeline("drift-iteration").from_result(parent_run).step(...)
                      .run(sink=storage)
manifest             result.manifest — SHA-256 canonical hash, .verify() checks integrity
index                ParquetSink writes run/step/asset tables to data/, exact schema
                      unconfirmed, see BUILD_GUIDE.md Step 0, Verify 2
delta                Groq qwen/qwen3.6-27b, schema locked in DRIFT_VALIDATION.md,
                      reasoning_effort default, max_tokens 3000, retry on 429/413
                      at full budget, never shrunk
```

**Step 0 verification is complete:**
- `from_result()` is confirmed to link a live `PipelineResult`. The current replay command reconstructs a pipeline for execution but does not provide a chainable result loader from a stored manifest. Cross-session chaining remains a documented MVP limitation.
- A real local Genblaze `ParquetSink` probe confirmed partitioned `runs/`, `steps/`, and `assets/` tables. The tree reader joins those tables and normalises their fields for the API.

---

## Code Rules (follow without exception)

**Python:**
- Type hints on every function signature
- Docstrings on every function
- Never hardcode the B2 bucket name outside `storage.py`
- The in-memory run cache in `pipeline.py` is a stated MVP limitation, not a caching layer to optimise. Either replace it per Step 0's findings or document it as permanent, never leave it ambiguous

**TypeScript / React:**
- camelCase for all variables and functions
- JSDoc comments on every function and custom hook
- CSS variables from the design system used directly, never hardcoded hex values in component files
- CSS class-based hover states only, no inline `onMouseEnter` or `onMouseLeave`
- Framer Motion for all entrance animations, imported from `motion/react`
- Blur-in entrance as the default: `initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}` animating to `{ opacity: 1, filter: 'blur(0px)', y: 0 }`
- Loading states use skeleton shimmer, never spinners
- Never use `localStorage` or `sessionStorage` anywhere in the frontend

**Writing rules (apply to all copy, labels, code comments, JSDoc, README):**
- British English throughout
- No em dashes anywhere
- Periods only when necessary
- Commas only when necessary
- Short direct sentences, no filler such as "seamlessly", "powerful", "cutting-edge", "unlock"
- No lorem ipsum or placeholder copy anywhere

---

## Never Do These

- Never invent a delta result field or reword the locked schema from DRIFT_VALIDATION.md. If it needs to change, change it there first and propagate the change outward
- Never let the frontend call Groq directly, the API key stays server-side in the backend only
- Never assume `from_result()` persists across a backend restart until Step 0's verification confirms it does
- Never treat a single delta call as final without the retry-and-backoff logic from DRIFT_VALIDATION.md, a bare request can fail silently on the free tier
- Never resize comparison images below what `groq_delta_test.py` validated, 1024px max dimension, smaller hasn't been tested against the schema's accuracy
- Never let `reasoning_effort` quietly get changed to `"none"` for speed. It was tested and rejected, it misses real drift, see DRIFT_VALIDATION.md's production decision

---

## Hackathon Checklist

- Project name: Drift
- Hackathon: Backblaze Generative Media Hackathon, Build with Genblaze on B2, deadline 3 August 2026, 22:00 GMT+1
- Working app URL judges can access
- Public GitHub repository, or private with `b2genblaze` granted contributor access
- Providers and models listed: GMI Cloud (`seedream-5.0-lite`), Groq (`qwen/qwen3.6-27b`)
- Clear explanation of B2 and Genblaze usage for judges, point at the ParquetSink genealogy index and the manifest provenance together, that pairing answers both judging questions at once
- Demo video, roughly 3 minutes, showing a root generation, a chained iteration, and a delta result catching something real
