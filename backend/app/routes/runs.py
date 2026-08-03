"""Run creation and genealogy endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.schemas import RunCreateRequest, RunResponse, RunsResponse
from app.services.pipeline import create_run, ensure_demo_runs
from app.services.tree import list_runs


router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("", response_model=RunResponse, status_code=status.HTTP_201_CREATED)
def post_run(request: RunCreateRequest) -> RunResponse:
    """Create a real or local-demo image generation run."""
    try:
        _, _, metadata = create_run(request.prompt, request.parent_run_id)
    except ValueError as error:
        raise HTTPException(status_code=409, detail={"detail": str(error), "code": "session_ended"}) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail={"detail": str(error), "code": "provider_error"}) from error
    return RunResponse.model_validate(metadata)


@router.get("", response_model=RunsResponse)
def get_runs() -> RunsResponse:
    """Return the full flat genealogy index for client-side reconstruction."""
    ensure_demo_runs()
    return RunsResponse(runs=[RunResponse.model_validate(run) for run in list_runs()])


@router.get("/{run_id}", response_model=RunResponse)
def get_run(run_id: str) -> RunResponse:
    """Return one run by id or a 404 response."""
    run = next((item for item in list_runs() if item["run_id"] == run_id), None)
    if run is None:
        raise HTTPException(status_code=404, detail={"detail": "Run not found", "code": "not_found"})
    return RunResponse.model_validate(run)
