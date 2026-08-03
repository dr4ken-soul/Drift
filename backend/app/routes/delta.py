"""Delta comparison endpoint."""

from fastapi import APIRouter, HTTPException

from app.schemas import DeltaRequest, DeltaResult
from app.services.delta import run_delta
from app.services.tree import get_run


router = APIRouter(prefix="/delta", tags=["delta"])


@router.post("", response_model=DeltaResult)
def post_delta(request: DeltaRequest) -> DeltaResult:
    """Compare two indexed image runs and return the locked schema."""
    run_a = get_run(request.run_id_a)
    run_b = get_run(request.run_id_b)
    if run_a is None or run_b is None:
        raise HTTPException(status_code=404, detail={"detail": "One or both runs were not found", "code": "not_found"})
    if not run_a["asset_url"] or not run_b["asset_url"]:
        raise HTTPException(status_code=422, detail={"detail": "Both runs need an image asset", "code": "validation_error"})
    try:
        result = run_delta(
            run_a["asset_url"],
            run_a["prompt"],
            run_b["asset_url"],
            run_b["prompt"],
            request.run_id_a,
            request.run_id_b,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail={"detail": str(error), "code": "provider_error"}) from error
    return DeltaResult.model_validate(result)

