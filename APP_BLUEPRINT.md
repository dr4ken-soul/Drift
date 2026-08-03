# APP_BLUEPRINT.md — Drift

This is a scoped version of the standard blueprint. Market validation, monetisation, competitor pricing tables, distribution strategy and a launch checklist are the generic SKILL.md template's SaaS sections, and none of them move the needle on how the Backblaze Generative Media Hackathon actually scores a submission. What's here instead is the technical contract BUILD_GUIDE.md's prose descriptions were missing, exact data structures and exact API shapes, so nothing downstream is built against a guess.

---

## What This Solves, Mapped to Judging Criteria

The hackathon scores four things. Every MVP feature earns its place against at least one of them, nothing is built for its own sake.

| Judging criterion | How Drift answers it |
|---|---|
| Real-World Utility | Prompt iteration currently has no memory. Drift gives it one, and catches drift a quick glance would miss |
| Production Readiness | The delta schema is validated against real failure modes, hallucination, rate limits, payload limits, documented in DRIFT_VALIDATION.md, not assumed to work |
| B2 Storage and Data Orchestration | Every asset, manifest, and the genealogy index itself all live in B2 through Genblaze's `ObjectStorageSink` and `ParquetSink` together, not bolted on separately |
| Use of Genblaze | `from_result()` chaining and manifest provenance are the actual product mechanic, not a checkbox integration |

---

## MVP Feature Detail

### 1. Iteration genealogy
**Story:** as a person iterating on a generative prompt, I want every attempt linked to the one before it, so that I never lose the thread of how I got to a result.
**Acceptance:** a chained run's manifest carries a `parent_run_id` pointing at its parent, confirmed by reading two linked runs back from the Parquet index and seeing the pointer.
**Complexity:** low, this is Genblaze's own `from_result()` mechanic, not custom logic.

### 2. Delta analysis engine
**Story:** as a person comparing two iterations, I want a specific, grounded explanation of what changed, so that I can decide whether the iteration actually worked.
**Acceptance:** given two runs, the seven-field schema from DRIFT_VALIDATION.md returns, matches the validated format, and correctly returns null fields rather than inventing content when nothing changed.
**Complexity:** medium, the schema is proven, the engineering risk is entirely in the retry and payload handling already solved in `groq_delta_test.py`.

### 3. Provenance manifest
**Story:** as a person reviewing Drift's output, I want proof of exactly how each asset was generated, so that I can trust what I'm looking at.
**Acceptance:** `manifest.verify()` returns true for every stored run.
**Complexity:** low, this is Genblaze's default behaviour, not something Drift builds.

### 4. Tree inspection UI
**Story:** as a person with a history of iterations, I want to click any node and see its manifest and its delta from its parent, so that I can navigate my own history rather than remembering it.
**Acceptance:** clicking a non-root node triggers a delta call against its parent and renders the result.
**Complexity:** medium, mostly frontend work, the data it renders is already correct by the time it reaches this layer.

What's explicitly not being built, and why it's not a gap: multi-provider generation (GMI Cloud image only keeps the demo reliable), video and audio modalities (the schema is validated for images specifically, extending it unvalidated is the exact half-baked pattern this whole build avoided), user auth (single-tenant is enough to prove the mechanic), cross-session chaining (Step 0 in BUILD_GUIDE.md covers this directly).

---

## Data Structures

**Run** (returned by `POST /runs`, `GET /runs`, `GET /runs/{run_id}`):

```json
{
  "run_id": "string",
  "parent_run_id": "string | null",
  "prompt": "string",
  "model": "seedream-5.0-lite",
  "provider": "gmicloud",
  "created_at": "ISO 8601 timestamp",
  "asset_url": "string, durable B2 URL",
  "manifest_uri": "string, B2 manifest location",
  "sha256": "string"
}
```

Exact field names depend on what BUILD_GUIDE.md Step 0's Parquet verification actually finds, this is the target shape the API normalises to regardless of what the underlying columns are called.

**DeltaResult** (returned by `POST /delta`), verbatim from DRIFT_VALIDATION.md's locked schema:

```json
{
  "composition": "string",
  "subjectTreatment": "string",
  "lightingMoodColour": "string",
  "technicalExecution": "string",
  "unrealisedChanges": "string | null",
  "unintendedDrift": "string | null",
  "recommendation": "string"
}
```

---

## API Architecture

| Endpoint | Method | Request body | Response | Notes |
|---|---|---|---|---|
| `/runs` | POST | `{ "prompt": "string", "parent_run_id": "string \| null" }` | `Run` | Triggers a real Genblaze pipeline call, expect several seconds, not instant |
| `/runs` | GET | none | `{ "runs": [Run, ...] }` | Reads the Parquet index, full list, no pagination needed at hackathon scale |
| `/runs/{run_id}` | GET | none | `Run` | 404 if not found |
| `/delta` | POST | `{ "run_id_a": "string", "run_id_b": "string" }` | `DeltaResult` | Can take up to roughly two minutes on a bad rate-limit day, worst case five retries. The frontend must show a loading state here, skeleton shimmer per CLAUDE.md's code rules, never a spinner, and never let this read as hung |

No auth on any endpoint for MVP, single-tenant hackathon scope, matching the "not in MVP" list above. CORS restricted to `NEXT_PUBLIC_API_URL` only.

---

## Not Covered Here

Everything else in the standard SKILL.md blueprint, market sizing, pricing tiers, distribution channels, launch checklist, is deliberately absent. If Drift continues past the hackathon and monetisation becomes a real question, that's the point to write those sections properly, not before.
