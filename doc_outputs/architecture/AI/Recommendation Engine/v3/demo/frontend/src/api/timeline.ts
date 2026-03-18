import type { PatientTimeline } from '../types';

const BASE = '/api';

export async function fetchTimeline(
  patientToken = 'tok_hmac_56291047'
): Promise<PatientTimeline> {
  const res = await fetch(`${BASE}/timeline/${patientToken}`);
  if (!res.ok) throw new Error(`GET /api/timeline failed (${res.status})`);
  return res.json();
}
