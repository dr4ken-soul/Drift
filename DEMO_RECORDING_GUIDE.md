# Drift demo recording guide

This is a plain screen recording. Do not add voiceover, captions, subtitles, text overlays, music, or narration.

## Before recording

1. Open the frontend: `https://drift-webhub.vercel.app/tree`
2. Confirm the page has no `Failed to fetch` message.
3. Confirm the backend health endpoint returns `status: ok`:
   `https://drift-iw6515717-psycho-projects.vercel.app/health`
4. Confirm the backend runs endpoint loads:
   `https://drift-iw6515717-psycho-projects.vercel.app/runs`
5. Use a clean browser window at 100% zoom. Close unrelated tabs and notifications.
6. Keep the cursor still when waiting and move it deliberately when selecting controls.

## Recording sequence

1. Start on the Drift landing page and open **Try Drift**.
2. On the Tree page, enter a clear root prompt, for example:
   `A quiet editorial still life with a ceramic vase and dried flowers, soft studio light.`
3. Click **Generate root** and wait for the image and root node to appear.
4. Select the root node.
5. Change the prompt to a meaningful refinement, for example:
   `A quiet editorial still life with a ceramic vase and dried flowers, warmer side light and a deeper shadow.`
6. Choose the existing root in **Iterate from** and click **Generate iteration**.
7. Wait for the child image and connected genealogy node to appear.
8. Click the child node to show its prompt, manifest/provenance details, and delta result.
9. Let the delta card remain visible long enough to show the comparison fields.
10. Finish on the complete tree with the child selected.

## Pass criteria

- The frontend loads without an error banner.
- A root run is created.
- A child run is connected to the root.
- Both generated images are visible.
- Selecting a node shows its prompt and provenance.
- The delta panel displays the grounded comparison result.
- No API keys or dashboard tabs appear in the recording.

## If the demo uses fallback mode

If GMI generation fails because the account has no credit, set `DRIFT_DEMO_MODE=true`, clear `GMI_API_KEY`, redeploy the backend, and repeat the same recording sequence. Keep `GROQ_API_KEY` only if you want live delta analysis.
