"""Shared Genblaze storage configuration for B2 and local development."""

from genblaze_core import KeyStrategy, ObjectStorageSink, ParquetSink
from genblaze_s3 import S3StorageBackend

from app.config import DATA_DIR, ensure_data_directories, get_settings


def build_storage() -> object:
    """Build the shared sink, using B2 in production and Parquet locally."""
    ensure_data_directories()
    settings = get_settings()
    parquet_sink = ParquetSink(DATA_DIR)
    if not settings.has_b2_credentials:
        return parquet_sink
    backend = S3StorageBackend.for_backblaze(
        settings.b2_bucket,
        key_id=settings.b2_key_id,
        app_key=settings.b2_app_key,
        preflight=False,
    )
    return ObjectStorageSink(
        backend,
        key_strategy=KeyStrategy.HIERARCHICAL,
        parquet_sink=parquet_sink,
    )


storage = build_storage()

