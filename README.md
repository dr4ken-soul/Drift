# Drift

Drift remembers every prompt iteration and explains what changed between versions, including changes that were never requested.

Built for the Backblaze Generative Media Hackathon. The core flow is:

1. Generate an image through Genblaze and GMI Cloud
2. Link the next prompt with `from_result()`
3. Store assets and manifests in Backblaze B2
4. Read the Parquet genealogy index
5. Compare two images through Groq vision with the locked seven-field schema

## Stack

- Backend: Python 3.11+, FastAPI, Genblaze
- Generation: GMI Cloud `seedream-5.0-lite`
- Delta analysis: Groq `qwen/qwen3.6-27b`
- Storage: Backblaze B2 through Genblaze `ObjectStorageSink`
- Index: Genblaze `ParquetSink`, partitioned `runs/`, `steps/`, and `assets/` tables
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, Motion

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

With no provider keys, Drift runs a local Genblaze demo mode. The first `GET /runs` creates a root and a chained sample. This makes the tree and delta surface immediately usable for review.

For live generation, fill in `GMI_API_KEY`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, and `GROQ_API_KEY` in `backend/.env`. The backend never exposes those values to the frontend.

### Frontend

```powershell
cd web
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The live tool is at `/tree`.

## Verification

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q

cd ..\web
npm run build
```

The backend tests cover schema parsing, offline delta caching, and the real partitioned Parquet join shape. The production build checks the landing page and live tool routes.

## Submission notes

The B2 and Genblaze integration is in `backend/app/services/storage.py` and `backend/app/services/pipeline.py`. The Parquet index is read by `backend/app/services/tree.py`. The locked delta system instructions and retry behaviour are in `backend/app/services/delta.py` and documented in `DRIFT_VALIDATION.md`.

The live `from_result()` cache is process scoped. Genblaze manifests can be replayed after a restart, but the current SDK does not expose a chainable `PipelineResult` loader from a stored manifest. If a user selects a parent from a session that has ended, the API returns a clear session error and asks them to start a new lineage.

