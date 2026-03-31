# Clinical BAML Domain

This directory contains the BAML definitions for the Navaveij clinical reasoning engine.

## Agent Architecture

The pipeline runs three agents:

- **Agent 1 — `AnalyzeClinicalRisks`** (`recommendation_output.baml`): Produces a `ClinicalRiskProfile` from raw patient signals. This output feeds all three Agent 2 tasks.
- **Agent 2a — `MatchPolicy`** (`recommendation_output.baml`): Runs in parallel after Agent 1. Determines the optimal care package, selects add-ons, and produces a `PolicyMatchResult` with a nested `PolicyScript`.
- **Agent 2b — `WriteNarrative`** (`recommendation_output.baml`): Runs in parallel with Agent 2a. Writes the patient-facing narrative (`NarrativeScript`) from the risk profile alone — no ruleset dependency.
- **Agent 2c — `AnnotateReasoningLines`** (`recommendation_output.baml`): Runs in parallel with Agent 2a and 2b. Classifies each clinical summary bullet with a `LineSentiment` and extracts meaningful `highlight_terms`.

Total latency shape: `AnalyzeClinicalRisks + max(MatchPolicy, WriteNarrative, AnnotateReasoningLines)`

## Structure

- `entities.baml`: Legacy domain models (`RecommendationResponse`, `SafetyCheckResponse`). The `Tier` enum is defined in `recommendation_output.baml` and shared across this domain.
- `recommendation_output.baml`: All active agent functions, output types, and the `LineSentiment` enum.
- `safety_critic.baml`: Function and prompt for the Safety Critic agent (`ValidateRecommendation`).

## Usage

These functions are called from the Python orchestrator via the generated `baml_client`. The three Agent 2 tasks are dispatched with `asyncio.gather` in `backend/src/services/workflows/clinical.py`.
