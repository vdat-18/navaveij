# Problem Statement

## 1) Static Labels Masquerading as Status

`RecommendationPanel.tsx` currently renders literal text values:
- `Integrity: Valid`
- `Logic: Verified`

There is no conditional branch, score threshold, or payload mapping that can produce alternate states.

## 2) Missing Contract Fields for Status Semantics

`RecommendationResponse` does not include dedicated fields such as:
- `integrity_status`
- `logic_status`
- supporting evidence fields (rule checks, validator result, source metadata)

Without explicit contract fields, frontend cannot truthfully represent dynamic verification states.

## 3) UX Trust and Auditability Gap

Because labels look operational but are static, end users may infer runtime validation that does not actually occur at render time.

This introduces:
- explainability ambiguity for clinicians,
- weak audit narrative during demos,
- risk of misalignment between displayed trust signals and system behavior.
