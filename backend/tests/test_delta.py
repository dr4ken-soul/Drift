"""Unit tests for the locked delta parser and offline fallback."""

import json

from app.services.delta import _clean_response, run_delta


def test_clean_response_accepts_json_with_fences() -> None:
    """The parser should remove model markdown fences before decoding."""
    payload = {
        "composition": "none",
        "subjectTreatment": "none",
        "lightingMoodColour": "none",
        "technicalExecution": "none",
        "unrealisedChanges": None,
        "unintendedDrift": None,
        "recommendation": "accept",
    }
    assert _clean_response(f"```json\n{json.dumps(payload)}\n```") == payload


def test_offline_delta_uses_all_locked_fields(tmp_path, monkeypatch) -> None:
    """Offline mode should return the complete schema without network access."""
    monkeypatch.setattr("app.services.delta.DELTA_CACHE_DIR", tmp_path)
    monkeypatch.setattr("app.services.delta.get_settings", lambda: type("Settings", (), {"has_groq_credentials": False})())
    result = run_delta("file://a", "same", "file://b", "same", "a", "b")
    assert set(result) == {
        "composition", "subjectTreatment", "lightingMoodColour", "technicalExecution",
        "unrealisedChanges", "unintendedDrift", "recommendation",
    }

