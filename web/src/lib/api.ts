/** A single normalised run returned by the Drift API. */
export type Run = {
  run_id: string;
  parent_run_id: string | null;
  prompt: string;
  model: string;
  provider: string;
  created_at: string;
  asset_url: string;
  manifest_uri: string;
  sha256: string;
  manifest_verified: boolean;
};

/** The locked seven-field result returned by the delta endpoint. */
export type DeltaResult = {
  composition: string;
  subjectTreatment: string;
  lightingMoodColour: string;
  technicalExecution: string;
  unrealisedChanges: string | null;
  unintendedDrift: string | null;
  recommendation: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Fetch all runs from the genealogy index. */
export async function fetchRuns(): Promise<Run[]> {
  const response = await fetch(`${apiUrl}/runs`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load the genealogy index');
  const body = (await response.json()) as { runs: Run[] };
  return body.runs;
}

/** Create a root run or a chained iteration. */
export async function createRun(prompt: string, parentRunId?: string | null): Promise<Run> {
  const response = await fetch(`${apiUrl}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, parent_run_id: parentRunId ?? null }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: { detail?: string } } | null;
    throw new Error(body?.detail?.detail ?? 'Unable to create the run');
  }
  return (await response.json()) as Run;
}

/** Ask the backend to compare two stored assets. */
export async function fetchDelta(runIdA: string, runIdB: string): Promise<DeltaResult> {
  const response = await fetch(`${apiUrl}/delta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id_a: runIdA, run_id_b: runIdB }),
  });
  if (!response.ok) throw new Error('Unable to analyse this comparison');
  return (await response.json()) as DeltaResult;
}

