# Enhancement Plan

## Decision Required Before Implementation

Choose one product direction for the two status chips.

### Option A — Keep Static Labels Explicitly

- Keep current visual chips as fixed trust badges.
- Rename wording to reduce implication of runtime checks (example: `Integrity: Baseline`, `Logic: Baseline`).
- Add a short tooltip or helper text clarifying they are static UI trust indicators.

**Pros**
- Lowest effort and no backend contract change.
- Zero API or workflow risk.

**Cons**
- Does not provide real dynamic verification signal.
- Weaker demonstration for explainability and audit readiness.

### Option B — Backend-Derived Deterministic Statuses

- Add explicit response fields, for example:
  - `integrity_status: "valid" | "warning" | "invalid"`
  - `logic_status: "verified" | "review_required" | "failed"`
  - `integrity_reasons: string[]`
  - `logic_reasons: string[]`
- Compute statuses server-side using deterministic checks:
  - integrity: required payload completeness, schema conformance, fallback integrity checks
  - logic: rule-to-tier alignment, fallback activation, supporting signal sufficiency
- Map chip color/icon/text in frontend from these fields.

**Pros**
- Highest product clarity and trust.
- Stronger demo evidence for explainability and governance.
- Auditable semantics aligned with actual runtime state.

**Cons**
- Requires backend and frontend contract updates.
- Requires test updates for contract and rendering behavior.

### Option C — Hybrid Rollout (Transitional)

- Phase 1: keep static chips but add explicit `source` subtitle (for example `Static UI`).
- Phase 2: introduce backend-derived statuses behind a feature flag.

**Pros**
- Controlled rollout with lower immediate risk.
- Avoids sudden contract dependency during active demo cycles.

**Cons**
- Temporary complexity and dual behavior.
- Requires follow-up phase discipline.

## Recommendation

Recommend **Option B** if the goal is true explainability and governance-aligned UX.
Recommend **Option A** only if the immediate priority is minimal change before a fixed demo deadline.

## High-Level Decision Gate

Please select one implementation direction:
- **A**: Keep static labels, clarify copy
- **B**: Implement backend-derived deterministic statuses
- **C**: Hybrid two-phase rollout

After decision, implementation work will be scoped into concrete backend/frontend tasks and tests.
