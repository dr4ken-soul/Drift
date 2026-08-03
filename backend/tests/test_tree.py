"""Tests for the Parquet-backed run normalisation."""

from datetime import datetime, timezone

import pandas as pd

from app.services import tree


def test_list_runs_joins_run_step_and_asset_tables(tmp_path, monkeypatch) -> None:
    """The tree reader should flatten the actual partitioned Genblaze tables."""
    runs_dir = tmp_path / "runs" / "dt=2026-08-03"
    steps_dir = tmp_path / "steps" / "dt=2026-08-03"
    assets_dir = tmp_path / "assets" / "dt=2026-08-03"
    for directory in (runs_dir, steps_dir, assets_dir):
        directory.mkdir(parents=True)
    run_id = "run-1"
    pd.DataFrame([{
        "run_id": run_id,
        "parent_run_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }]).to_parquet(runs_dir / "one.parquet")
    pd.DataFrame([{
        "run_id": run_id, "provider": "local", "model": "demo", "prompt": "a prompt",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }]).to_parquet(steps_dir / "one.parquet")
    pd.DataFrame([{
        "run_id": run_id, "url": "https://example.test/image.png", "sha256": "a" * 64,
    }]).to_parquet(assets_dir / "one.parquet")
    monkeypatch.setattr(tree, "DATA_DIR", tmp_path)
    monkeypatch.setattr(tree, "_metadata_for", lambda _: {})
    records = tree.list_runs()
    assert records[0]["run_id"] == run_id
    assert records[0]["parent_run_id"] is None
    assert records[0]["prompt"] == "a prompt"
    assert records[0]["asset_url"] == "http://localhost:8000/media/run-1"
