"""Genblaze image generation, provenance, and local demo pipeline service."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import random
from typing import Any
from uuid import uuid4

from genblaze_core import Asset, Manifest, Modality, Pipeline, StepBuilder, RunBuilder
from genblaze_core.testing import MockProvider
from genblaze_gmicloud import GMICloudImageProvider
from PIL import Image, ImageDraw

from app.config import DATA_DIR, MANIFEST_DIR, MEDIA_DIR, ensure_data_directories, get_settings
from app.services.storage import storage, sync_index_artifacts


_run_cache: dict[str, object] = {}
_run_metadata: dict[str, dict[str, Any]] = {}


def _write_demo_image(prompt: str, run_id: str) -> Path:
    """Create a deterministic abstract demo image for offline development."""
    ensure_data_directories()
    seed = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8], 16)
    random.seed(seed)
    base = (random.randrange(18, 50), random.randrange(16, 38), random.randrange(40, 82))
    accent = (random.randrange(100, 180), random.randrange(88, 160), 255)
    image = Image.new("RGB", (1024, 768), base)
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            ratio = (x + y) / (image.width + image.height)
            pixels[x, y] = tuple(int(base[index] * (1 - ratio * 0.34) + accent[index] * ratio * 0.34) for index in range(3))
    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(9):
        left = random.randint(-180, 800)
        top = random.randint(-120, 600)
        size = random.randint(140, 420)
        draw.ellipse((left, top, left + size, top + size), fill=accent + (random.randint(18, 58),), outline=(236, 236, 238, 80), width=2)
    draw.rectangle((48, 48, 976, 720), outline=(236, 236, 238, 90), width=2)
    path = MEDIA_DIR / f"{run_id}.png"
    image.save(path, format="PNG", optimize=True)
    return path


def _save_manifest(manifest: Manifest, run_id: str) -> str:
    """Save a local manifest sidecar and return its URI."""
    ensure_data_directories()
    path = MANIFEST_DIR / f"{run_id}.json"
    path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    return path.as_uri()


def _normalise_result(result: object, provider: str) -> tuple[object, Manifest, dict[str, Any]]:
    """Extract the run, manifest, and API metadata from a Genblaze result."""
    run = result.run
    manifest = result.manifest
    step = run.steps[0]
    asset = step.assets[0]
    verified = manifest.verify()
    metadata = {
        "run_id": run.run_id,
        "parent_run_id": run.parent_run_id,
        "prompt": step.prompt or "",
        "model": step.model,
        "provider": provider,
        "created_at": run.created_at,
        "asset_url": asset.url,
        "manifest_uri": manifest.manifest_uri or "",
        "sha256": asset.sha256 or "",
        "manifest_verified": verified,
    }
    return run, manifest, metadata


def _create_local_run(prompt: str, parent_run_id: str | None) -> tuple[object, Manifest, dict[str, Any]]:
    """Run Genblaze locally with a deterministic image when keys are absent."""
    run_id = str(uuid4())
    image_path = _write_demo_image(prompt, run_id)
    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
    asset = Asset(
        url=image_path.as_uri(),
        media_type="image/png",
        sha256=digest,
        size_bytes=image_path.stat().st_size,
        width=1024,
        height=768,
    )
    provider = MockProvider(assets=[asset])
    pipeline = Pipeline("drift-iteration")
    if parent_run_id:
        parent = _run_cache.get(parent_run_id)
        if parent is None:
            raise ValueError(
                f"parent run {parent_run_id} is not available in this backend session"
            )
        pipeline = pipeline.from_result(parent)
    result = pipeline.step(
        provider,
        model="drift-demo-local",
        prompt=prompt,
        modality=Modality.IMAGE,
    ).run(sink=storage, timeout=30, raise_on_failure=True)
    run, manifest, metadata = _normalise_result(result, "local-demo")
    _run_cache[run.run_id] = result
    metadata["asset_url"] = f"{get_settings().public_api_url}/media/{image_path.name}"
    metadata["manifest_uri"] = _save_manifest(manifest, run.run_id)
    sync_index_artifacts()
    return run, manifest, metadata


def create_run(prompt: str, parent_run_id: str | None = None) -> tuple[object, Manifest, dict[str, Any]]:
    """Create a root or chained image generation run through Genblaze."""
    settings = get_settings()
    if not (settings.has_generation_credentials and settings.has_b2_credentials):
        if not settings.demo_mode:
            raise RuntimeError("GMI Cloud and B2 credentials are required for generation")
        result = _create_local_run(prompt, parent_run_id)
    else:
        pipeline = Pipeline("drift-iteration")
        if parent_run_id:
            parent = _run_cache.get(parent_run_id)
            if parent is None:
                raise ValueError(
                    f"parent run {parent_run_id} is not available in this backend session"
                )
            pipeline = pipeline.from_result(parent)
        provider = GMICloudImageProvider(api_key=settings.gmi_api_key)
        result = pipeline.step(
            provider,
            model="seedream-5.0-lite",
            prompt=prompt,
            modality=Modality.IMAGE,
        ).run(sink=storage, timeout=120, raise_on_failure=True)
        _run_cache[result.run.run_id] = result
        result = _normalise_result(result, "gmicloud")
        _save_manifest(result[1], result[0].run_id)
        sync_index_artifacts()
    run, manifest, metadata = result
    _run_metadata[run.run_id] = metadata
    return run, manifest, metadata


def get_cached_run(run_id: str) -> object | None:
    """Return a live chainable run object if it exists in this process."""
    return _run_cache.get(run_id)


def get_cached_metadata(run_id: str) -> dict[str, Any] | None:
    """Return metadata captured during the current process."""
    return _run_metadata.get(run_id)


def ensure_demo_runs() -> None:
    """Create a small local lineage for a fresh demo installation."""
    settings = get_settings()
    if not settings.demo_mode or settings.has_generation_credentials or list((DATA_DIR / "runs").rglob("*.parquet")):
        return
    root, _, _ = create_run("A ceramic vase with dried flowers on a plain grey background, studio lighting")
    create_run("A ceramic vase with dried flowers, warmer side light, and a deeper shadow", root.run_id)
