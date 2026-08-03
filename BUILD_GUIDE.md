# Drift — Build Guide

## Before You Write a Single Line of Code

Read FRONTEND_SPEC.md in full, every class value and animation timing for the landing page lives there. This guide covers what that file does not: the backend, the Genblaze integration, and how the two talk to each other. Where this guide references DRIFT_VALIDATION.md for the delta schema, use that file's exact system prompt and settings, do not re-derive them, they are already proven against real test pairs.

Genblaze's API below is confirmed against the live repository (backblaze-labs/genblaze), not reconstructed from memory. Where this guide is genuinely uncertain about something the repo didn't show directly, it says so rather than inventing a plausible-looking function call.

---

## Step 0: Two Things to Verify Before Writing Phase 1

Both are flagged because the Genblaze README confirms the capability exists in principle but doesn't show the exact mechanism needed. Resolve both before writing Steps 1.3 and 1.4, don't build on an assumption either way.

### Verify 1: Can `from_result()` chain from a stored manifest, not just a live object?

**The question:** Step 1.3's `create_run()` keeps chainable Run objects in an in-memory dict that resets on every backend restart, meaning a user can only iterate from a run created in the same, still-running process. Whether Genblaze has a way to reconstruct a chainable reference from a stored manifest, so iteration survives restarts, is not confirmed.

**Check in this order:**
1. `docs/features/iteration.md` in the genblaze repo, linked directly from the README's Iteration section
2. `ARCHITECTURE.md` in the repo root
3. The `genblaze replay manifest.json` CLI command's actual source, the README describes it as reconstructing a run from its manifest, which is the exact capability needed here
4. If none of those confirm it, check `libs/core/` directly for how `from_result()` and `Run` are defined

**Finding:** the current replay command reconstructs a pipeline for re-execution but does not expose a chainable `PipelineResult` loader from a stored manifest. Drift therefore keeps the live-process cache and surfaces the restart limitation in the API and UI.

**If it doesn't exist:** the in-memory cache is the correct scope-down, not a bug, but it needs to be visible to the user, not silent. Add an explicit error state to the iteration form: if a user tries to iterate from a run whose parent isn't in the live cache, show "this run's session has ended, start a new lineage from it" rather than a generic failure. Add this to CLAUDE.md's MVP limitations list too, the same way Wraith documented its own scoping decisions instead of leaving them to be discovered by accident.

**Who resolves this:** the coding agent, research and implement whichever path applies. Come back to Paul only if the answer is genuinely ambiguous after checking all four sources above.

### Verify 2: What does ParquetSink actually write?

**The question:** the README confirms ParquetSink writes "run/step/asset tables" but not the exact file names, paths, or column schema. Step 1.4's `list_runs()` guesses at `data/runs.parquet` and this needs confirming against real output, not assumed from the docs.

**How to verify, concretely:**
1. Write and run a tiny standalone script, not the full FastAPI app yet, doing one real `Pipeline().step(...).run(sink=storage)` call
2. After it completes, run `ls -R data/` and look at what actually got created
3. Load whatever parquet file appears with `pd.read_parquet(path)`, print `.columns` and `.head()`
4. Confirm `run_id`, `parent_run_id`, `prompt`, and a timestamp are present at the top level, or work out the join if run/step/asset are genuinely separate tables

**If the real schema differs from what Step 1.4 assumes:** update `list_runs()` to match the actual column names, and add join logic if the tables are separate.

**Who resolves this:** the coding agent, this is a five-minute empirical check, not a research task. Do it before writing anything that depends on the result.

---

## Prerequisites

```bash
python --version   # 3.11 or higher, Genblaze requires it
node --version      # 18 or higher
npm --version       # 9 or higher
```

Accounts needed before starting:
- Backblaze B2 account with a bucket created, and an application key from `secure.backblaze.com/app_keys.htm`
- GMI Cloud account and API key from `console.gmicloud.ai`, the hackathon's first 270 eligible signups get credits, worth checking if you've claimed yours
- Groq account and API key, already have this from validation

---

## Repository Setup

```bash
mkdir drift && cd drift
git init
mkdir -p backend/app/{routes,services}
mkdir -p web/src/{app,components/{ui,layout,sections,tree,delta},lib,hooks,styles}
```

Root `.env` (copied into `backend/.env`, never committed):

```
GMI_API_KEY=
B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET=drift-media
GROQ_API_KEY=
```

`web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Phase 1 — Backend: Genblaze Pipeline Service

### Step 1.1: Python project setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install genblaze-core genblaze-gmicloud genblaze-s3 fastapi uvicorn python-dotenv requests pillow pandas pyarrow
```

`genblaze-core` and `genblaze-s3` give you `Pipeline`, `Step`, `ObjectStorageSink`, `ParquetSink`. `genblaze-gmicloud` gives the image provider. Genblaze is library-only, no daemon, it embeds directly into FastAPI handlers, which is exactly how this backend uses it.

### Step 1.2: Storage sink, shared across every route

Create `backend/app/services/storage.py`:

```python
"""
Shared Genblaze storage sink. One ObjectStorageSink writes both the
media asset and its manifest to B2, and simultaneously writes structured
run/step/asset rows to Parquet for the tree to read back later.
"""

from genblaze_core import ObjectStorageSink, KeyStrategy, ParquetSink
from genblaze_s3 import S3StorageBackend

storage = ObjectStorageSink(
    S3StorageBackend.for_backblaze("drift-media"),
    key_strategy=KeyStrategy.HIERARCHICAL,
    parquet_sink=ParquetSink("data/"),
)
```

This is the one sink every pipeline run in Drift uses. HIERARCHICAL layout groups each run's manifest and asset together under `runs/{tenant}/{date}/{run_id}/`, which is what the tree UI walks.

### Step 1.3: Run creation, root and chained

Create `backend/app/services/pipeline.py`:

```python
"""
Wraps Genblaze pipeline execution for both a fresh root generation and a
chained iteration off an existing run. Session-scoped in-memory cache
holds recent RunResult objects so from_result() has something live to
chain against, this is a known MVP simplification, not a solved general
case, see the note below.
"""

from genblaze_core import Pipeline, Modality
from genblaze_gmicloud import GMICloudImageProvider
from app.services.storage import storage

# MVP simplification: from_result() needs a live RunResult object, not
# just a stored run_id. This cache holds every run created in the
# current backend process and resets on restart. See BUILD_GUIDE.md
# Step 0, Verify 1, before assuming this is the permanent answer.
_run_cache: dict[str, object] = {}


def create_run(prompt: str, parent_run_id: str | None = None):
    """Create a new image generation run, optionally chained from a
    parent run already held in the session cache."""
    pipeline = Pipeline("drift-iteration")

    if parent_run_id:
        parent = _run_cache.get(parent_run_id)
        if parent is None:
            raise ValueError(
                f"parent run {parent_run_id} not found in this session, "
                "chaining across backend restarts is not yet supported"
            )
        pipeline = pipeline.from_result(parent)

    run, manifest = pipeline.step(
        GMICloudImageProvider(),
        model="seedream-5.0-lite",
        prompt=prompt,
        modality=Modality.IMAGE,
    ).run(sink=storage, timeout=120)

    _run_cache[run.run_id] = run
    return run, manifest
```

### Step 1.4: Run listing, reading the tree back

Create `backend/app/services/tree.py`:

```python
"""
Reads the Parquet index ParquetSink wrote to reconstruct the genealogy
tree. Uses pandas since the index is small for a hackathon's worth of
runs, no need for a database yet.
"""

import pandas as pd

RUNS_PARQUET_PATH = "data/runs/"  # confirmed partitioned path from the Step 0 probe


def list_runs() -> list[dict]:
    """Return every run as a flat list with parent_run_id pointers, the
    frontend reconstructs the tree structure client-side from this."""
    df = pd.read_parquet(RUNS_PARQUET_PATH)
    return df.to_dict(orient="records")
```

Run one real pipeline call locally first and inspect what lands in `data/` before wiring this up blind, the exact table and column names need confirming against actual output, not assumed from the docs alone.

### Step 1.5: Delta analysis, using the validated schema exactly

Create `backend/app/services/delta.py`. This is the same schema, retry logic, and image handling already proven in DRIFT_VALIDATION.md and groq_delta_test.py, moved into the backend rather than a standalone script.

```python
"""
Runs the validated delta analysis schema against two runs' images. Same
system prompt, same reasoning_effort, same retry-and-backoff behaviour
as the test harness in DRIFT_VALIDATION.md, this is the production path
that schema was validated for.
"""

import base64
import io
import json
import os
import time
import requests
from PIL import Image

VISION_MODEL = "qwen/qwen3.6-27b"

# Copy this verbatim from DRIFT_VALIDATION.md's "Confirmed schema"
# section rather than retyping it from memory here.
SCHEMA_INSTRUCTIONS = """<paste the exact locked system instructions from DRIFT_VALIDATION.md>"""


def _encode_image_from_url(url: str, max_dimension: int = 1024, jpeg_quality: int = 85) -> str:
    """Fetch an image from its B2 URL and encode it the same way
    groq_delta_test.py does, resized to stay inside the free tier's
    payload limit."""
    response = requests.get(url, timeout=30)
    img = Image.open(io.BytesIO(response.content)).convert("RGB")
    img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=jpeg_quality)
    data = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{data}"


def run_delta(image_url_a: str, prompt_a: str, image_url_b: str, prompt_b: str) -> dict | None:
    """Same retry-and-backoff behaviour validated in groq_delta_test.py:
    429 and 413 both mean insufficient room in the rolling per-minute
    budget right now, wait and retry at full max_tokens rather than
    shrinking it."""
    api_key = os.environ["GROQ_API_KEY"]
    user_text = f"Prompt A: {prompt_a}\nPrompt B: {prompt_b}\nParameter changes: none noted"

    payload = {
        "model": VISION_MODEL,
        "temperature": 0.2,
        "max_tokens": 3000,
        "reasoning_effort": "default",
        "reasoning_format": "parsed",
        "messages": [
            {"role": "system", "content": SCHEMA_INSTRUCTIONS},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Image A:"},
                    {"type": "image_url", "image_url": {"url": _encode_image_from_url(image_url_a)}},
                    {"type": "text", "text": "Image B:"},
                    {"type": "image_url", "image_url": {"url": _encode_image_from_url(image_url_b)}},
                    {"type": "text", "text": user_text},
                ],
            },
        ],
    }

    backoff_seconds = 25
    for attempt in range(5):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=60,
            )
        except requests.exceptions.RequestException:
            time.sleep(backoff_seconds)
            continue

        if response.status_code in (429, 413):
            wait_time = max(int(response.headers.get("retry-after", 0)), backoff_seconds)
            time.sleep(wait_time)
            backoff_seconds = int(backoff_seconds * 1.5)
            continue

        response.raise_for_status()
        raw_text = response.json()["choices"][0]["message"]["content"]
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        first_brace, last_brace = cleaned.find("{"), cleaned.rfind("}")
        if first_brace != -1 and last_brace != -1:
            cleaned = cleaned[first_brace:last_brace + 1]
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None

    return None
```

Cache the result in B2 after computing it (a JSON file alongside the two runs' manifests) so the tree UI doesn't re-trigger a Groq call every time someone reopens the same comparison. Exact caching key and write path is an open implementation detail, not specified further here.

### Step 1.6: FastAPI routes

Create `backend/app/routes/runs.py` and `backend/app/routes/delta.py` wiring the three endpoints:
- `POST /runs` — body `{prompt: str, parent_run_id: str | null}`, calls `create_run`, returns the run's id, B2 asset URL, and manifest URI
- `GET /runs` — calls `list_runs`, returns the flat array for tree reconstruction
- `POST /delta` — body `{run_id_a: str, run_id_b: str}`, resolves both runs' asset URLs and prompts from the Parquet index, calls `run_delta`, returns the seven-field result

Wire these into `backend/app/main.py` with FastAPI's standard router pattern, CORS open to `NEXT_PUBLIC_API_URL` in development.

---

## Phase 2 — Frontend

### Step 2.1: Next.js setup

```bash
cd web
npx create-next-app@latest . --typescript --tailwind --app
npm install motion lucide-react
```

Translate the colour system and font imports from FRONTEND_SPEC.md Sections 1.1 and 1.2 into `tailwind.config.ts` and `src/styles/globals.css` exactly as written there.

### Step 2.2: Landing sections

One component per section in `src/components/sections/`, built exactly as specified in the matching numbered section of FRONTEND_SPEC.md: `Hero.tsx` (Section 3, including the KineticHeadline mechanic from Section 1.5), `Problem.tsx` (4), `Tree.tsx` (5, the marketing preview, not the live tool), `Delta.tsx` (6), `Trust.tsx` (7), `FinalCta.tsx` (8), `Footer.tsx` (9). Assemble in `src/app/page.tsx` in that order, nav mounted once in `layout.tsx`.

### Step 2.3: DriftField canvas

Create `src/components/layout/DriftField.tsx` implemented exactly as specified in FRONTEND_SPEC.md Section 1.4, mounted once at the app root so it persists across the whole page rather than remounting per section.

### Step 2.4: Live tree tool

Create `src/app/tree/page.tsx`, the actual product surface, separate from the marketing preview in the landing page's Tree section. Fetches `GET /runs`, renders nodes and edges (a simple force-directed or manually-positioned layout is enough for a hackathon demo, this doesn't need a graph library). Clicking a node opens its manifest and, if it has a parent, triggers `POST /delta` and renders the result using the same field-row pattern specified in FRONTEND_SPEC.md Section 6.

### Step 2.5: New iteration form

A prompt input plus an optional "iterate from" node selector, calling `POST /runs`. Keep this minimal, a text field and a submit button is enough, this is not the section to spend remaining time polishing.

---

## Phase 3 — Quality Audit

**Backend audit:**
- A real run through the full chain, root generation then one chained iteration, produces two manifests in B2 and `manifest.verify()` returns true for both
- The Parquet index actually contains both runs with the correct `parent_run_id` pointer before building the tree UI against it
- Delta analysis against a known pair returns the same shape of result seen in DRIFT_VALIDATION.md, not a truncated or empty response

**Frontend audit:** run through the FRONTEND_SPEC.md Section 11 self-check in full, plus confirm the hero's delta chip and the delta section's portal are pulling from a real cached result by the time this ships, not the static example values used while the backend was still being wired up

**Schema audit:** confirm `reasoning_effort: "default"` and `max_tokens: 3000` match DRIFT_VALIDATION.md's final decision exactly, this is not a place to quietly retune for speed under deadline pressure

**Hackathon submission checklist** (from the hackathon's own requirements):
- Working app URL judges can access
- Public GitHub repo, or private with `b2genblaze` granted contributor access
- Providers and models listed: GMI Cloud (`seedream-5.0-lite`), Groq (`qwen/qwen3.6-27b`)
- A clear explanation of how B2 and Genblaze are used, point directly at the ParquetSink genealogy index and the manifest provenance, that pairing is the actual answer to both judging questions at once
- Demo video, roughly 3 minutes, showing a root generation, a chained iteration, and the delta result catching something real
