"""Pydantic request and response contracts for Drift's API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class RunCreateRequest(BaseModel):
    """Request body for a new root or chained image generation."""

    prompt: str = Field(min_length=3, max_length=2000)
    parent_run_id: str | None = None


class RunResponse(BaseModel):
    """Normalised run shape returned to the frontend."""

    run_id: str
    parent_run_id: str | None
    prompt: str
    model: str
    provider: str
    created_at: datetime
    asset_url: str
    manifest_uri: str
    sha256: str
    manifest_verified: bool = True


class RunsResponse(BaseModel):
    """Collection response for the genealogy tree."""

    runs: list[RunResponse]


class DeltaRequest(BaseModel):
    """Request body for a comparison between two stored runs."""

    run_id_a: str
    run_id_b: str


class DeltaResult(BaseModel):
    """The locked seven-field creative delta schema."""

    composition: str
    subjectTreatment: str
    lightingMoodColour: str
    technicalExecution: str
    unrealisedChanges: str | None
    unintendedDrift: str | None
    recommendation: str


class ErrorResponse(BaseModel):
    """Consistent error payload for expected API failures."""

    detail: str
    code: Literal["not_found", "session_ended", "provider_error", "validation_error"]

