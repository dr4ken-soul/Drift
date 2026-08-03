"""Shared Genblaze storage configuration for B2 and local development."""

from genblaze_core import KeyStrategy, ObjectStorageSink, ParquetSink
from genblaze_s3 import S3StorageBackend

from app.config import DATA_DIR, MANIFEST_DIR, ensure_data_directories, get_settings


index_backend: S3StorageBackend | None = None


def build_storage() -> object:
    """Build the shared sink, using B2 in production and Parquet locally."""
    ensure_data_directories()
    settings = get_settings()
    parquet_sink = ParquetSink(DATA_DIR)
    if not settings.has_b2_credentials:
        return parquet_sink
    backend = S3StorageBackend.for_backblaze(
        settings.b2_bucket,
        region=settings.b2_region,
        key_id=settings.b2_key_id,
        app_key=settings.b2_app_key,
        preflight=False,
    )
    global index_backend
    index_backend = backend
    return ObjectStorageSink(
        backend,
        key_strategy=KeyStrategy.HIERARCHICAL,
        parquet_sink=parquet_sink,
    )


storage = build_storage()


def sync_index_artifacts() -> None:
    """Copy local Parquet partitions and manifests into the B2 index prefix."""
    if index_backend is None:
        return
    for path in DATA_DIR.rglob("*.parquet"):
        relative = path.relative_to(DATA_DIR).as_posix()
        index_backend.put(
            f"drift-index/{relative}",
            path.read_bytes(),
            content_type="application/octet-stream",
        )
    for path in MANIFEST_DIR.glob("*.json"):
        index_backend.put(
            f"drift-index/manifests/{path.name}",
            path.read_bytes(),
            content_type="application/json",
        )


def hydrate_index_artifacts() -> None:
    """Restore the B2-backed index into the function's temporary filesystem."""
    if index_backend is None:
        return
    ensure_data_directories()
    token: str | None = None
    while True:
        page = index_backend.list("drift-index/", continuation_token=token)
        for entry in page.entries:
            relative = entry.key.removeprefix("drift-index/")
            if relative.startswith("manifests/"):
                target = MANIFEST_DIR / relative.removeprefix("manifests/")
            elif relative.endswith(".parquet"):
                target = DATA_DIR / relative
            else:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(index_backend.get(entry.key))
        if page.next_token is None:
            break
        token = page.next_token
