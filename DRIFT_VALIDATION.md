# DRIFT — Delta Analysis Schema Validation

## Purpose
Pre-spec validation of DRIFT's core feature, the creative delta comparison between two generation iterations. This runs before APP_BLUEPRINT.md so the schema going into the spec is proven, not hoped for. Once validation is complete this file is folded into APP_BLUEPRINT.md's technical architecture section unchanged.

## Status
Validation complete. Schema locked, calibration instruction added, production model decided: Groq `qwen/qwen3.6-27b` with `reasoning_effort: "default"`. Next step is MVP confirmation, then the design gates, then APP_BLUEPRINT.md.

## Confirmed schema

**System instructions:**

You are a creative director reviewing two sequential iterations of the same generated image. You are given Image A, the prompt that produced A, Image B, the prompt that produced B, and any parameter changes between them.

Compare the images directly. Ground every observation in what you can actually see, and connect it to what the prompt or parameter change intended. Do not use vague adjectives like "more vibrant" or "more saturated" without naming the specific part of the image and why it matters compositionally or narratively.

Only state something as fact if you can directly verify it in the pixels of the images provided. Do not describe structural features, such as the image being a grid, collage, or composite of multiple panels, unless you are certain. If you are not confident a detail is present, say so explicitly rather than asserting it.

**Output shape (JSON only, no markdown fences):**

```json
{
  "composition": "specific description of framing/composition change or explicit statement of none",
  "subjectTreatment": "specific description of how the subject itself changed or explicit statement of none",
  "lightingMoodColour": "specific description of lighting, colour, or mood change or explicit statement of none",
  "technicalExecution": "specific description of quality/technical differences or explicit statement of none",
  "unrealisedChanges": "anything the prompt implied that is NOT visible in the image, or null if none",
  "unintendedDrift": "anything visually different that the prompt change does not explain, or null if none",
  "recommendation": "one sentence a creative director could act on: accept, refine, or discard this iteration and why"
}
```

## Test protocol
Three pairs, each testing a different failure mode: a compositional change, a lighting and mood change, and a stress test using an identical prompt run twice, to check whether the schema invents a false difference when none was requested.

---

## Pair 1 — Compositional change (bicycle)
Prompt A: *A single vintage bicycle leaning against a brick wall on an empty street, wide establishing shot, overcast daylight, photorealistic*
Prompt B: *A single vintage bicycle leaning against a brick wall on an empty street, close up on the handlebars and front wheel, overcast daylight, photorealistic*

**Claude result:** Correctly flagged an unrealised change, Prompt B asked for a close up and the image delivered a wide shot instead, the framing relationship came back inverted. Correctly flagged unintended drift, a multi-storey building, drainpipe, and storefronts appeared that neither prompt specified. Composition, subject treatment, and technical execution all named specific physical detail (rust on the stem, spring coils, tread texture) rather than vague adjectives.

**Verdict:** Pass. The schema caught a genuine generator-side failure accurately. Open question, worth checking whether the two files were swapped on upload or the generator itself ignored the framing instruction on one version.

**Groq result:** Ran twice due to a script fix mid-testing (see Known issues below). First run, before `reasoning_format` was set, the model's reasoning explicitly described both Image A and Image B as four-panel collages rather than single shots, and stated this as fact in the final JSON with no hedging. Second run, same two image files, after the format fix, made no mention of any collage at all, described both as clean single shots. Composition, subject treatment, and technical execution were specific and grounded in both runs (rust on the handlebars, tread texture, depth of field).

Confirmed against the actual files, neither `pair1_A.png` nor `pair1_B.png` is a collage, both are single clean images. The first run's collage claim was a hallucination, not a catch.

**Verdict:** Fail on the first run, pass on the second. The model can state a fabricated visual detail as confident fact with no hedging, which is a more serious failure mode than vague filler, since it reads as trustworthy and isn't. This is a reliability risk to weigh against Groq as the production choice, not just a formatting bug.

---

## Pair 2 — Lighting and mood change (coffee)
Prompt A: *A cup of coffee on a wooden table beside a window, soft morning light, calm mood, photorealistic*
Prompt B: *same scene, dramatic golden hour side lighting, moody atmosphere, photorealistic*

**Claude result:** Composition, subject treatment, and lighting all specific and grounded (steam definition, glaze warmth, directional light source). Unrealised changes correctly flagged as partial, the "moody atmosphere" instruction was only partly delivered since the result reads as warm and inviting rather than genuinely moody. Unintended drift correctly flagged, the dried flower colour shift goes beyond what a colour temperature change alone would explain.

**Verdict:** Pass.

**Groq result:** Hit one rate limit, waited, then succeeded on the second run. Composition correctly noted the framing stayed identical while lighting changed. Lighting, mood, and colour was specific and grounded (shadow length, raking light on wood grain, contrast increase). Unintended drift correctly flagged, the dried flowers shifted from pale green and white to golden brown, a colour and texture change larger than a lighting shift alone would explain, mirroring what Claude caught on the same pair. This is also the run that confirmed `max_tokens: 3000` is enough when the request actually gets through, the output was complete and well-formed with no truncation.

**Verdict:** Pass. Result is consistent with Claude's on the same pair.

---

## Pair 3 — Stress test, identical prompt run twice (vase)
Prompt A and B: *A ceramic vase with dried flowers on a plain grey background, studio lighting, minimalist, photorealistic* (no wording changed between runs)

**Claude result:** Unrealised changes correctly returned clean, "none noted", since the prompt did not change. Unintended drift correctly flagged a detailed, specific list of real visual differences (vase proportions, glaze speckle density, pampas grass position, filler colour) and explicitly stated these represent unexplained generative variance rather than attributing them to any intent. This is the critical pass condition, the model did not invent a false narrative to justify visual differences that had no prompt-side cause.

**Verdict:** Pass. This is the strongest result of the three since it's the one most likely to produce filler, and it didn't.

**Groq result:** Hit two rate limits in a row, then on the third attempt returned a response with empty content, no JSON, nothing to parse. Likely cause, no `max_tokens` was set on the request, and this model's reasoning is unusually long (its pair 1 and pair 2 reasoning ran to several hundred words each), so it plausibly used its entire token budget thinking and had nothing left to write the actual answer. Fixed by setting `max_tokens: 8192` explicitly. Not yet re-run.

**Verdict:** Pair 3 specifically wasn't re-run clean after all the pacing fixes, not needed now, the production decision below is based on pair 2's clean results under both reasoning settings, which is the comparison that actually mattered.

---

## Known issues found on Groq (`qwen/qwen3.6-27b`)
This model reasons out loud before answering, and its reasoning is long, several hundred words even on a simple two-image comparison. Three practical problems followed from that, all relevant to how DRIFT calls this model in production, not just to testing:

1. **Reasoning leaks into content by default.** Without `reasoning_format: "parsed"`, the `<think>...</think>` block comes back inline in the same field as the final answer, breaking JSON parsing. Fixed by setting `reasoning_format: "parsed"`, which returns reasoning in a separate field.
2. **Free tier rate limits hit fast.** A single long reasoning response can burn most of a per-minute token allowance, causing the next request to come back 429. Fixed with retry-and-backoff logic reading the `retry-after` header, plus a fixed pause between requests.
3. **Long reasoning can exhaust the token budget before the answer is written.** With no `max_tokens` set, pair 3 returned an empty response, likely because the model was still reasoning when generation was cut off. Fixed by setting `max_tokens: 8192` explicitly.

4. **Confirmed hallucination on pair 1's first run.** The model stated both images were four-panel collages, with no hedging, and this was false, confirmed against the actual files. Unlike the three issues above this isn't a script bug, it's evidence the model can state a fabricated visual detail as confident fact. The re-run on the same files did not repeat this, so it did not reproduce on a second pass, but a single clean run is not proof of reliability. Two mitigations now applied: a calibration instruction added to the system prompt telling the model not to assert structural details like grids or collages unless certain, and the script now runs every pair twice automatically so disagreement between runs is visible in one execution rather than requiring a manual second pass.
5. **413 Payload Too Large, twice, for two different reasons, and one wrong fix along the way.** First occurrence, a large base64-encoded image exceeded Groq's real base64 image limit of 4MB per request, not the 20MB figure logged here earlier, that number was for image URL input, a different method than the one this script uses. Fixed by resizing images before sending. Second occurrence, after that fix, a 413 happened again because `max_tokens` had been set to 8192, above this model's roughly 6,000 tokens-per-minute free tier budget on its own. The first attempt at fixing this halved `max_tokens` automatically on a 413, which avoided the error but produced empty responses instead, the shrunk budget wasn't enough for the model to finish reasoning and still write an answer. Confirmed the 413 is inconsistent at the same `max_tokens` value, meaning it reflects a rolling per-minute budget shared across recent calls, not a fixed per-request ceiling. Corrected fix: keep `max_tokens` at 3000 throughout, treat 413 the same as 429, wait and retry at full budget rather than shrinking it, and space calls further apart (30s) so the rolling window has genuine room to recover.

If DRIFT ships on this model, all five of these need to be handled in the production request path exactly as here, not just in the test script.

**Worth flagging separately:** Groq's own documentation lists `qwen/qwen3.6-27b` as a preview model, intended for evaluation rather than production use, and recommends checking their vision documentation for production-ready options before deploying. This matters directly for the hackathon's production readiness judging criterion and should factor into the final provider decision, not just cost and output quality.

**Also worth flagging:** the free tier's roughly 6,000 tokens per minute budget is tight for this specific task, two images plus a verbose reasoning model easily approaches that ceiling in a single request. This isn't just a testing inconvenience, it's a real constraint on how many delta comparisons DRIFT could serve per minute in production on the free tier, worth weighing alongside the preview-model status above when deciding whether Groq is the right shipping choice or just the right testing budget.

---

## Production model decision — CLOSED

Claude Sonnet, called via the Anthropic API from inside the Claude.ai artifact environment, confirmed as the working baseline at zero cost during testing. This is a testing convenience only, it does not work outside Claude.ai and cannot be what DRIFT ships with.

Groq (`qwen/qwen3.6-27b`) tested under both reasoning settings on pair 2:
- `reasoning_effort: "default"` (thinking mode): correctly caught the dried flower colour and texture shift as unintended drift, consistent with Claude's independent finding on the same pair. Token-hungry, needed the full 3000-token budget and occasionally hit the free tier's per-minute ceiling under rapid back-to-back calls.
- `reasoning_effort: "none"` (no thinking): fit comfortably inside the budget, single call, first try, no retries needed. But missed the exact drift catch above, attributed the flower change entirely to lighting. Faster and cheaper at the cost of the thing DRIFT actually exists to catch.

**Decision:** ship on `reasoning_effort: "default"`. The rate limit friction seen during testing came from an adversarial six-call batch run for consistency checking, not from how a person actually uses DRIFT, one comparison at a time with natural pauses to read the result and decide the next prompt change. The retry-and-backoff logic already built into the script is the production pattern for this, not a workaround, show a brief loading state if a request has to wait its turn. Accuracy on the drift catch matters more than shaving a few seconds off response time.

Schema, calibration instruction, and this production decision are ready to go into APP_BLUEPRINT.md as written, no further Groq-specific testing needed before moving to MVP confirmation.
