import type { RecommendationOutput } from '../types';

const BASE = '/api';

export async function fetchRecommendation(
  patientToken = 'tok_hmac_56291047'
): Promise<RecommendationOutput> {
  const res = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_token: patientToken }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST /api/recommend failed (${res.status}): ${err}`);
  }
  return res.json();
}
