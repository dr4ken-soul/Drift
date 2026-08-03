"""FastAPI application entry point for Drift."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import ensure_data_directories, get_settings
from app.routes.delta import router as delta_router
from app.routes.runs import router as runs_router
from app.services.storage import read_asset_url
from app.services.tree import get_asset_source_url


ensure_data_directories()
settings = get_settings()
app = FastAPI(title="Drift API", version="1.0.0", description="Prompt iteration genealogy and grounded visual delta analysis")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_origin_regex=r"https://([a-z0-9-]+\.)*vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(runs_router)
app.include_router(delta_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Return a lightweight service health response."""
    return {"status": "ok", "mode": "live" if settings.has_generation_credentials and settings.has_b2_credentials else "demo"}


@app.get("/media/{run_id}")
def media(run_id: str) -> Response:
    """Proxy a run's private B2 asset to the authenticated backend runtime."""
    source_url = get_asset_source_url(run_id)
    if not source_url:
        raise HTTPException(status_code=404, detail="Asset not found")
    try:
        content, media_type = read_asset_url(source_url)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail="Asset not found") from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Asset storage unavailable") from error
    return Response(content=content, media_type=media_type, headers={"Cache-Control": "public, max-age=300"})
