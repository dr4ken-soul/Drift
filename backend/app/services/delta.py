"""Validated seven-field visual delta analysis with Groq and caching."""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path
import time
from typing import Any

import requests
from PIL import Image

from app.config import DELTA_CACHE_DIR, get_settings, ensure_data_directories


VISION_MODEL = "qwen/qwen3.6-27b"
SCHEMA_INSTRUCTIONS = """You are a creative director reviewing two sequential iterations of the same generated image. You are given Image A, the prompt that produced A, Image B, the prompt that produced B, and any parameter changes between them.

Compare the images directly. Ground every observation in what you can actually see, and connect it to what the prompt or parameter change intended. Do not use vague adjectives like \"more vibrant\" or \"more saturated\" without naming the specific part of the image and why it matters compositionally or narratively.

Only state something as fact if you can directly verify it in the pixels of the images provided. Do not describe structural features, such as the image being a grid, collage, or composite of multiple panels, unless you are certain. If you are not confident a detail is present, say so explicitly rather than asserting it.

Output shape (JSON only, no markdown fences):

{
  \"composition\": \"specific description of framing/composition change or explicit statement of none\",
  \"subjectTreatment\": \"specific description of how the subject itself changed or explicit statement of none\",
  \"lightingMoodColour\": \"specific description of lighting, colour, or mood change or explicit statement of none\",
  \"technicalExecution\": \"specific description of quality/technical differences or explicit statement of none\",
  \"unrealisedChanges\": \"anything the prompt implied that is NOT visible in the image, or null if none\",
  \"unintendedDrift\": \"anything visually different that the prompt change does not explain, or null if none\",
  \"recommendation\": \"one sentence a creative director could act on: accept, refine, or discard this iteration and why\"
}"""
DELTA_FIELDS = (
    "composition",
    "subjectTreatment",
    "lightingMoodColour",
    "technicalExecution",
    "unrealisedChanges",
    "unintendedDrift",
    "recommendation",
)


def _encode_image_from_url(url: str, max_dimension: int = 1024, jpeg_quality: int = 85) -> str:
    """Fetch and resize an image using the validated payload settings."""
    if url.startswith("file://"):
        content = Path(url[7:]).read_bytes()
    else:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        content = response.content
    image = Image.open(io.BytesIO(content)).convert("RGB")
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=jpeg_quality)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def _clean_response(raw_text: str) -> dict[str, Any] | None:
    """Extract and validate JSON returned by the vision model."""
    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
    first_brace, last_brace = cleaned.find("{"), cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1:
        cleaned = cleaned[first_brace : last_brace + 1]
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    if not all(field in payload for field in DELTA_FIELDS):
        return None
    return {field: payload.get(field) for field in DELTA_FIELDS}


def _cache_path(run_id_a: str, run_id_b: str) -> Path:
    """Return the stable cache path for an unordered comparison pair."""
    ensure_data_directories()
    pair = "__".join(sorted((run_id_a, run_id_b)))
    return DELTA_CACHE_DIR / f"{pair}.json"


def _local_delta(prompt_a: str, prompt_b: str) -> dict[str, Any]:
    """Return a clearly labelled deterministic result for offline demos."""
    same_prompt = prompt_a.strip() == prompt_b.strip()
    return {
        "composition": "No structural change can be established from the stored demo prompts." if same_prompt else "The second iteration keeps the subject direction while changing the requested framing language.",
        "subjectTreatment": "No subject treatment change noted in the prompt pair." if same_prompt else "The subject remains consistent while the iteration asks for a more deliberate visual treatment.",
        "lightingMoodColour": "The demo pair keeps the same lighting and colour instruction." if same_prompt else "The iteration introduces a new mood or colour direction in its prompt.",
        "technicalExecution": "No technical difference is claimed in offline demo mode." if same_prompt else "No technical failure is claimed without a live vision comparison.",
        "unrealisedChanges": None,
        "unintendedDrift": "Offline demo mode does not inspect pixels. Run with GROQ_API_KEY for a grounded visual verdict.",
        "recommendation": "Accept the stored lineage for the demo, then run the live comparison before making a creative decision.",
    }


def run_delta(image_url_a: str, prompt_a: str, image_url_b: str, prompt_b: str, run_id_a: str, run_id_b: str) -> dict[str, Any]:
    """Compare two images with the locked Groq request and retry policy."""
    cache_path = _cache_path(run_id_a, run_id_b)
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))
    settings = get_settings()
    if not settings.has_groq_credentials:
        result = _local_delta(prompt_a, prompt_b)
        cache_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result
    payload = {
        "model": VISION_MODEL,
        "temperature": 0.2,
        "max_tokens": 3000,
        "reasoning_effort": "default",
        "reasoning_format": "parsed",
        "messages": [
            {"role": "system", "content": SCHEMA_INSTRUCTIONS},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Image A:"},
                    {"type": "image_url", "image_url": {"url": _encode_image_from_url(image_url_a)}},
                    {"type": "text", "text": "Image B:"},
                    {"type": "image_url", "image_url": {"url": _encode_image_from_url(image_url_b)}},
                    {"type": "text", "text": f"Prompt A: {prompt_a}\nPrompt B: {prompt_b}\nParameter changes: none noted"},
                ],
            },
        ],
    }
    backoff_seconds = 25
    for attempt in range(5):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=90,
            )
        except requests.RequestException:
            if attempt == 4:
                break
            time.sleep(backoff_seconds)
            continue
        if response.status_code in (429, 413):
            if attempt == 4:
                break
            retry_after = int(response.headers.get("retry-after", "0") or 0)
            time.sleep(max(retry_after, backoff_seconds))
            backoff_seconds = int(backoff_seconds * 1.5)
            continue
        response.raise_for_status()
        raw_text = response.json()["choices"][0]["message"].get("content", "")
        result = _clean_response(raw_text)
        if result is not None:
            cache_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            return result
        break
    raise RuntimeError("Groq returned no valid delta result after five attempts")

