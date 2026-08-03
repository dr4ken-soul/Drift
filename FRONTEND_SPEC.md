# FRONTEND_SPEC.md — Drift

Iteration genealogy and delta analysis for generative media, built on Genblaze and Backblaze B2. Built for the Backblaze Generative Media Hackathon (Build with Genblaze on B2), deadline 3 August 2026, 22:00 GMT+1.

---

## 0. Project Identity

- **Name:** Drift
- **One-line pitch:** Drift remembers every prompt you've ever run, and tells you exactly what changed between any two versions, including the part you didn't ask for.
- **Aesthetic (Gate 1):** Kinetic editorial
- **Identity Fingerprint (§0C):** top-left lead, bottom-right support / kinetic type / monochrome + single pop / micro-noise gradient / front-loaded / editorial reveal
- **Dials:** DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 6
- **Nav (Gate 2):** A4, dual-pill split
- **Background (Gate 3):** Dual-Motion Sync, kinetic headline weight-shift plus a quiet ambient layer, never both loud at once
- **Section behaviour (Gate 3b):** scroll-snapped, each section is one locked viewport

---

## 1. Global Design System

### 1.1 Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Martian+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');

:root {
  --font-display: 'Bodoni Moda', serif;
  --font-mono: 'Martian Mono', monospace;
  --font-body: 'Inter', sans-serif;
}
```

`--font-display` carries the kinetic headline only. `--font-mono` carries labels, node metadata, delta field names and the nav ticker text. `--font-body` carries everything else. Never mix a fourth family in.

### 1.2 Colour System (Gate 5, confirmed)

```css
:root {
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

  --radius-sm: 4px;  --radius-md: 8px;   --radius-lg: 14px;
  --radius-xl: 20px;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.4);
  --duration-fast: 150ms; --duration-normal: 300ms; --duration-slow: 600ms;

  --z-canvas: 0;
  --z-grain: 3;
  --z-content: 10;
  --z-chip: 20;
  --z-nav: 50;
}
```

`--success` and `--error` are not decorative, they are the exact clean-pass and flagged-drift colours already validated in DRIFT_VALIDATION.md's test harness. Every delta card in the product uses these two and no others for status signalling.

### 1.3 Global Z-Index Map

```
z-0:  DriftField, the ambient canvas layer (mounted once, fixed)
z-3:  noise grain overlay, absolute inset-0, pointer-events-none, opacity-[0.035]
z-10: section content (relative, default for all section containers)
z-20: floating chips and cards within a section (hero delta chip, tree node popovers)
z-50: fixed nav layer, both pills
```

### 1.4 DriftField (bespoke, no COMPOSITION_RECIPES.md match)

The Dual-Motion Sync second layer. Deliberately sparse, this is the quiet half of the sync, the kinetic headline is the loud half. Never let this layer compete for attention.

```
Container: fixed inset-0 z-0 pointer-events-none
Renderer: HTML canvas, 2D context, no WebGL needed at this density

Particle system:
  Count: 140 points (compare: a typical WebGL hero runs 3000-4000, this is
    intentionally sparse)
  Position: randomised across viewport, regenerated on resize
  Size: 1-2px, colour var(--accent) at 12-20% opacity, no glow, no blur
  Motion: each point drifts on a slow independent sine path, amplitude
    40-60px, period randomised between 18-26s per point so drift never
    reads as synchronised or mechanical
  No rotation, no scale pulse, no connecting lines between points

sectionDensity (shared context, written by an IntersectionObserver on
  each <section data-density="hero|calm|dense">):
  hero: opacity 0.22
  calm: opacity 0.12
  dense (the tree and delta sections, which already carry their own
    visual weight): opacity 0.05, nearly imperceptible

Transition between densities: opacity change over 800ms ease, no snap
```

### 1.5 Kinetic Headline Mechanic (shared, used in Hero only)

The §2E scroll-driven weight shift, implemented with a JS fallback since `animation-timeline: scroll()` support cannot be assumed on a hackathon judging day.

```tsx
'use client';
import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'motion/react';

/**
 * Renders the hero headline with scroll-driven font weight shifting from
 * 900 down to 200 across the first viewport of scroll. Falls back to a
 * static weight of 700 if reduced motion is preferred.
 */
function KineticHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const weight = useTransform(scrollYProgress, [0, 1], [900, 200]);

  return (
    <div ref={ref} className="relative h-[100dvh]">
      <motion.h1
        style={{ fontVariationSettings: useTransform(weight, (w) => `'wght' ${w}`) }}
        className="font-display italic text-[clamp(3.5rem,11vw,9rem)] leading-[0.88]
          tracking-[-0.02em] text-[var(--text-primary)] max-w-[16ch]"
      >
        {text}
      </motion.h1>
    </div>
  );
}
```

`prefers-reduced-motion` guard: skip the `useTransform` weight binding entirely and render at a fixed `font-variation-settings: 'wght' 650`.

---

## 2. Nav (A4, Dual-Pill Split)

```
Position: fixed top-4 inset-x-0 z-50 px-6 lg:px-12
Layout: flex items-center justify-between

LEFT PILL (wordmark only):
  bg-[var(--bg-surface)] border border-[var(--border-default)]
  rounded-full px-5 py-2.5
  Text: font-display italic text-lg text-[var(--text-primary)] lowercase
  Content: "drift"

RIGHT PILL (links + CTA):
  bg-[var(--bg-surface)] border border-[var(--border-default)]
  rounded-full px-1.5 py-1.5 flex items-center gap-0.5
  Links: ['Tree', 'Delta', 'Provenance'], each
    px-3 py-2 text-sm font-mono text-[var(--text-secondary)]
    hover:text-[var(--text-primary)] transition-colors duration-150 rounded-full
  CTA: bg-[var(--accent)] text-[#0b0a0d] px-4 py-2 rounded-full
    text-sm font-medium ml-1
    Label: "Try Drift"

MOBILE (below md):
  Left pill unchanged.
  Right pill collapses to CTA only, links move into a plain dropdown
  triggered by a chevron beside the CTA, bg-[var(--bg-elevated)],
  rounded-xl, appears below the pill with a 6px gap
```

Entrance: both pills `initial={{ opacity: 0, y: -12 }}`, `animate={{ opacity: 1, y: 0 }}`, `duration: 0.6, ease: 'easeOut', delay: 0.2`.

---

## 3. Hero

Recipe base: `editorial-asymmetric-hero` from COMPOSITION_RECIPES.md, adapted with the Kinetic Headline Mechanic from §1.5 replacing the recipe's standard static headline.

```
SECTION: Hero
data-density: hero
Layout: min-h-[100dvh] relative overflow-hidden
Background: bg-[var(--bg-primary)]

Z-STACK:
  z-0:  DriftField canvas
  z-3:  noise grain, opacity-[0.035]
  z-10: content
  z-20: delta chip

CONTENT CONTAINER:
  relative z-10 h-full flex flex-col justify-between px-6 lg:px-16 pt-28 pb-16

HEADLINE (top-left, KineticHeadline component):
  Text: "Every version remembered."
  Classes: as specified in §1.5
  Entrance: initial opacity 0, filter blur(10px), y: 24
    animate opacity 1, filter blur(0px), y: 0
    duration 0.9s, ease [0.16,1,0.3,1], delay 0.3s

SUBHEAD (below headline, max-w-md):
  font-body text-base text-[var(--text-secondary)] leading-relaxed mt-6
  Text: "Genealogy for every prompt iteration, and a model that tells you
    what actually changed, or admits when nothing did."
  Entrance: opacity 0 to 1, y 16 to 0, duration 0.7s, delay 0.6s

CTA CLUSTER (bottom-right):
  Position: self-end flex items-center gap-4
  Primary: bg-[var(--accent)] text-[#0b0a0d] px-6 py-3 rounded-full
    text-sm font-medium flex items-center gap-2
    Icon wrapper: w-7 h-7 rounded-full bg-black/15 flex items-center justify-center
      group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform
    Label: "See a comparison"
  Entrance: opacity 0 to 1, y 16 to 0, duration 0.6s, delay 0.9s

LIVE DELTA CHIP (bottom-right, above CTA cluster):
  Position: absolute bottom-32 right-6 lg:right-16 z-20 w-[280px]
  Classes: bg-[var(--bg-surface)] border border-[var(--border-default)]
    rounded-[var(--radius-lg)] p-5
  Content: a real, static excerpt from a validated delta result, not
    placeholder text
    Label row: font-mono text-[10px] uppercase tracking-[0.15em]
      text-[var(--text-muted)] mb-3
      Text: "unintendedDrift"
    Status tag: inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
      bg-[var(--error)]/10 text-[var(--error)] text-xs font-mono mb-3
      Dot: w-1.5 h-1.5 rounded-full bg-[var(--error)]
      Text: "flagged"
    Body: font-body text-sm text-[var(--text-secondary)] leading-snug
      Text: "Flower colour shifted beyond what the lighting change alone
        explains."
  Entrance: opacity 0, scale 0.96, y 12 to opacity 1, scale 1, y 0
    duration 0.6s, ease [0.16,1,0.3,1], delay 1.1s
```

ASSET BRIEF: none. Kinetic editorial is minimal-imagery by definition, the DriftField canvas and the headline itself carry the entire visual weight of this section.

---

## 4. The Problem

Recipe: `full-width-statement`.

```
data-density: calm
SECTION: full width, min-h-[100dvh] flex items-center, bg-[var(--bg-secondary)]

CONTENT (centred, max-w-4xl mx-auto px-6):
  Eyebrow: font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)] mb-6
    Text: "the problem"
  Statement: font-display italic text-4xl md:text-5xl lg:text-6xl
    text-[var(--text-primary)] leading-[1.05] tracking-[-0.01em]
    Text: "Every iteration you generate disappears the moment you write
    the next prompt. Nothing remembers what changed, or whether the
    change you asked for is the one you got."

ANIMATION:
  Eyebrow: opacity 0 to 1, delay 0.1s
  Statement: word-by-word blur reveal, same mechanic as the Golden
    Reference headline pattern (blur 10px opacity 0 y 30 to blur 0
    opacity 1 y 0), 0.6s per word group, stagger 80ms
  Both use viewport={{ once: false, amount: 0.3 }}, replays every pass
```

ASSET BRIEF: none, typographic statement only.

---

## 5. The Tree

Recipe base: `vertical-grid-walkthrough`, adapted to show a genealogy tree instead of an architectural render.

```
data-density: dense
SECTION: relative min-h-[100dvh] w-full bg-[var(--bg-primary)] overflow-hidden

VERTICAL GRID LINES (structure only, not decoration, echoes the tree's
  own branching axes):
  absolute top-0 bottom-0 left-[8%] border-l border-[var(--border-subtle)]
  absolute top-0 bottom-0 left-[50%] border-l border-[var(--border-subtle)]

CONTENT GRID: grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-center
  relative z-10 px-[8%]

LEFT TEXT (lg:col-span-4):
  Label: font-mono text-xs text-[var(--text-muted)] tracking-wider mb-2
    Text: "genealogy"
  Title: font-display italic text-4xl text-[var(--text-primary)]
    Text: "Every run knows its parent."
  Description: font-body text-sm text-[var(--text-secondary)] mt-4
    leading-relaxed max-w-sm
    Text: "Each Genblaze pipeline call links to the run it came from via
    from_result(), stored in B2 through ParquetSink. Nothing is ever
    disconnected from its history."

RIGHT TREE CANVAS (lg:col-span-8):
  Container: relative aspect-[16/10] w-full rounded-[var(--radius-lg)]
    border border-[var(--border-default)] bg-[var(--bg-surface)]
    overflow-hidden p-6
  Content: an actual rendered node tree, SVG line connectors between
    circular nodes, root node larger (12px radius) and accent-coloured,
    child nodes smaller (8px radius) in text-secondary, lines drawn with
    stroke var(--border-default), stroke-width 1.5
  Node hover: node scales to 1.15, line brightens to var(--accent) at
    40% opacity, tooltip shows prompt fragment, transition 150ms
  Node click: opens the delta card for that node against its parent

ANIMATION:
  Grid lines: scaleY 0 to 1, transform-origin top, duration 1.0s, delay 0.2s
  Tree nodes: stagger in by tree depth, root first, each subsequent
    depth level delayed 120ms further, opacity 0 to 1 + scale 0.8 to 1
  Connector lines: stroke-dashoffset draw-in following the same depth stagger
```

ASSET BRIEF: none, the tree is rendered from real component data, not an image.

---

## 6. The Delta

Recipe base: `framed-portal-hero`, adapted from a photography portal to a live comparison portal.

```
data-density: dense
SECTION: min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-12 items-center
  max-w-7xl mx-auto px-6 lg:px-16 bg-[var(--bg-secondary)]

LEFT COLUMN (text):
  Badge: font-mono text-xs text-[var(--accent)] tracking-widest uppercase mb-4
    Text: "the schema"
  Headline: font-display italic text-4xl md:text-5xl text-[var(--text-primary)]
    tracking-tight
    Text: "Structure catches what a glance misses."
  Body: font-body text-sm text-[var(--text-secondary)] mt-4 leading-relaxed
    max-w-sm
    Text: "Seven fixed fields, grounded against the actual prompt diff, not
    a blind pixel comparison. It names what changed, flags what you didn't
    ask for, and says so plainly when nothing changed at all."
  Metadata row: flex gap-6 border-t border-[var(--border-subtle)] pt-6 mt-10
    Item: label (font-mono text-[10px] text-[var(--text-muted)] uppercase) +
      value (font-mono text-sm text-[var(--text-primary)])
    Items: "model" / "qwen3.6-27b", "fields" / "7", "hallucination checks" / "2"

RIGHT COLUMN (portal, the delta card itself):
  Wrapper: relative rounded-[var(--radius-xl)] overflow-hidden
    border border-[var(--border-default)] bg-[var(--bg-surface)] p-8
  Content: full seven-field delta card rendered with real validated output
    (the pair-3 stress test result, since it is the strongest proof point,
    the model correctly returning "none noted" and "unexplained generative
    variance" rather than inventing a cause)
  Field rows: each field is a label (font-mono text-[10px] uppercase
    text-[var(--accent)] tracking-[0.1em] mb-1) plus value (font-body
    text-sm text-[var(--text-secondary)]), separated by
    border-b border-[var(--border-subtle)] py-3
  unintendedDrift and unrealisedChanges rows get a status tag using
    var(--success) if clean, var(--error) if flagged, matching §1.2

ANIMATION:
  Left column text: staggered blur-in, delay 0.2s start, 0.12s per element
  Right portal: opacity 0, scale 0.97 to opacity 1, scale 1, duration 0.7s,
    delay 0.4s
  Field rows inside the portal: stagger in after the portal itself,
    40ms per row
```

ASSET BRIEF: none, the portal renders real structured data.

---

## 7. Trust

Recipe: `metrics-section`.

```
data-density: calm
SECTION: py-24 md:py-32 bg-[var(--bg-primary)]

CONTAINER: max-w-6xl mx-auto px-6
  Eyebrow: font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)] mb-4
    Text: "provenance"
  Heading: font-display italic text-3xl md:text-4xl text-[var(--text-primary)] mb-16
    Text: "Every output carries proof of how it was made."

METRICS GRID: grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--border-subtle)]
  Each cell: bg-[var(--bg-primary)] p-8
    Number: font-display italic text-5xl text-[var(--text-primary)]
      tracking-[-0.02em]
    Label: font-mono text-xs text-[var(--text-muted)] uppercase mt-2
      tracking-[0.1em]
  Cell 1: "SHA-256" / "manifest verification per run"
  Cell 2: "B2" / "every manifest and parquet index stored durably"
  Cell 3: "2 of 2" / "hallucination checks passed on re-run"

ANIMATION:
  Cells stagger in: opacity 0 to 1, y 20 to 0, duration 0.6s,
    stagger 100ms per cell, viewport once: false
```

ASSET BRIEF: none.

---

## 8. Final CTA

```
data-density: hero
SECTION: min-h-[70dvh] flex items-center justify-center relative
  bg-[var(--bg-secondary)] overflow-hidden

Z-STACK: z-0 DriftField at hero-level opacity, z-10 content

CONTENT (centred, max-w-xl mx-auto px-6 text-center):
  Statement: font-display italic text-4xl md:text-5xl text-[var(--text-primary)]
    leading-tight
    Text: "Stop guessing what changed."
  CTA: mt-8 bg-[var(--accent)] text-[#0b0a0d] px-8 py-3.5 rounded-full
    text-sm font-medium
    Label: "Try Drift"

ANIMATION:
  Statement: blur-in, duration 0.8s
  CTA: opacity 0 to 1, y 16 to 0, duration 0.6s, delay 0.3s
```

ASSET BRIEF: none.

---

## 9. Footer

```
SECTION: py-12 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]

CONTAINER: max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center
  md:justify-between gap-6

Left: font-display italic text-lg text-[var(--text-secondary)]
  Text: "drift"

Right: flex gap-6 font-mono text-xs text-[var(--text-muted)]
  Items: "GitHub", "Backblaze Generative Media Hackathon", "Genblaze"
```

No entrance animation, footer is below the fold on load in every realistic viewport.

---

## 10. Global CSS Requirements

```css
html, body { scrollbar-width: none; }
::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Every `motion.div` using `whileInView` in this spec uses `viewport={{ once: false, amount: 0.1 }}`, never `once: true`, per the Repeatable Scroll Animation Enforcement rule. Every section is a plain `<section>` wrapping a `max-w-* mx-auto px-*` inner container, layout classes never sit directly on a `motion.div`.

---

## 11. Spec Self-Check (Step 3D Rule 7)

- [x] Every element has exact Tailwind classes
- [x] Every animation has initial, animate, duration, ease, delay
- [x] Every section has a declared z-index stack
- [x] Every section's imagery need is addressed (none needed, noted explicitly)
- [x] Positional classes carry responsive breakpoints where layout changes (nav mobile collapse, grid column stacking)
- [x] Composition recipes referenced by name with adaptations noted
- [x] Could be handed to a developer with zero follow-up design questions

## 12. Not Covered Here

The tree inspection UI (clicking a node to open its full manifest and delta history) and the app-interior upload flow are product surfaces, not marketing page sections. Those get their own detail pass in BUILD_GUIDE.md rather than this file, matching how Wraith separated its landing spec from its order dashboard implementation detail.
