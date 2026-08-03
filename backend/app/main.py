"""FastAPI application entry point for Drift."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import MEDIA_DIR, ensure_data_directories, get_settings
from app.routes.delta import router as delta_router
from app.routes.runs import router as runs_router


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
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.include_router(runs_router)
app.include_router(delta_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Return a lightweight service health response."""
    return {"status": "ok", "mode": "live" if settings.has_generation_credentials and settings.has_b2_credentials else "demo"}
