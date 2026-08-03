"""Read the partitioned Genblaze Parquet index into Drift's run contract."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from genblaze_core.models.manifest import parse_manifest

from app.config import DATA_DIR, MANIFEST_DIR, get_settings
from app.services.pipeline import get_cached_metadata


def _read_table(table_name: str) -> pd.DataFrame:
    """Read all Parquet partitions for one Genblaze table."""
    paths = list((DATA_DIR / table_name).rglob("*.parquet"))
    if not paths:
        return pd.DataFrame()
    return pd.concat([pd.read_parquet(path) for path in paths], ignore_index=True)


def _metadata_for(run_id: str) -> dict[str, Any]:
    """Read a local metadata sidecar or the live process metadata cache."""
    cached = get_cached_metadata(run_id)
    if cached:
        return cached
    path = MANIFEST_DIR / f"{run_id}.json"
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        manifest = parse_manifest(payload)
        return {
            "manifest_uri": payload.get("manifest_uri") or path.as_uri(),
            "manifest_verified": manifest.verify(),
        }
    return {}


def list_runs() -> list[dict[str, Any]]:
    """Return every indexed run with its first image asset and prompt."""
    runs = _read_table("runs")
    steps = _read_table("steps")
    assets = _read_table("assets")
    if runs.empty:
        return []
    steps = steps.sort_values("started_at", na_position="last") if not steps.empty else steps
    first_steps = steps.drop_duplicates("run_id") if not steps.empty else pd.DataFrame()
    first_assets = assets.drop_duplicates("run_id") if not assets.empty else pd.DataFrame()
    if not first_steps.empty:
        runs = runs.merge(first_steps[["run_id", "provider", "model", "prompt"]], on="run_id", how="left")
    if not first_assets.empty:
        runs = runs.merge(first_assets[["run_id", "url", "sha256"]], on="run_id", how="left")
    records: list[dict[str, Any]] = []
    for row in runs.to_dict(orient="records"):
        metadata = _metadata_for(str(row["run_id"]))
        asset_url = row.get("url") or ""
        if asset_url.startswith("file://"):
            asset_url = f"{get_settings().public_api_url}/media/{Path(asset_url[7:]).name}"
        record = {
            "run_id": str(row["run_id"]),
            "parent_run_id": row.get("parent_run_id"),
            "prompt": row.get("prompt") or "",
            "model": row.get("model") or "unknown",
            "provider": row.get("provider") or "unknown",
            "created_at": row.get("created_at"),
            "asset_url": asset_url,
            "manifest_uri": metadata.get("manifest_uri", ""),
            "sha256": row.get("sha256") or "",
            "manifest_verified": bool(metadata.get("manifest_verified", True)),
        }
        records.append(record)
    return sorted(records, key=lambda record: record["created_at"] or "")


def get_run(run_id: str) -> dict[str, Any] | None:
    """Return one indexed run by id."""
    for record in list_runs():
        if record["run_id"] == run_id:
            return record
    return None
