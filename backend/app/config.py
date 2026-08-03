"""Application configuration loaded from environment variables."""

from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
_configured_data_dir = os.getenv("DRIFT_DATA_DIR", "")
if _configured_data_dir:
    DATA_DIR = Path(_configured_data_dir)
elif os.getenv("VERCEL"):
    DATA_DIR = Path("/tmp/drift-data")
else:
    DATA_DIR = BACKEND_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
MANIFEST_DIR = DATA_DIR / "manifests"
DELTA_CACHE_DIR = DATA_DIR / "delta_cache"

load_dotenv(BACKEND_DIR / ".env")


class Settings:
    """Runtime settings for the API and provider integrations."""

    def __init__(self) -> None:
        self.gmi_api_key = os.getenv("GMI_API_KEY", "")
        self.b2_key_id = os.getenv("B2_KEY_ID", "")
        self.b2_app_key = os.getenv("B2_APP_KEY", "")
        self.b2_bucket = os.getenv("B2_BUCKET", "drift-media")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.public_api_url = os.getenv("PUBLIC_API_URL", "http://localhost:8000")
        self.demo_mode = os.getenv("DRIFT_DEMO_MODE", "true").lower() == "true"

    @property
    def has_b2_credentials(self) -> bool:
        """Return whether B2 storage can be used for a real run."""
        return bool(self.b2_key_id and self.b2_app_key and self.b2_bucket)

    @property
    def has_generation_credentials(self) -> bool:
        """Return whether the GMI Cloud image provider can be called."""
        return bool(self.gmi_api_key)

    @property
    def has_groq_credentials(self) -> bool:
        """Return whether Groq delta analysis can be called."""
        return bool(self.groq_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings instance."""
    return Settings()


def ensure_data_directories() -> None:
    """Create local data directories used by the demo and cache layers."""
    for directory in (DATA_DIR, MEDIA_DIR, MANIFEST_DIR, DELTA_CACHE_DIR):
        directory.mkdir(parents=True, exist_ok=True)
