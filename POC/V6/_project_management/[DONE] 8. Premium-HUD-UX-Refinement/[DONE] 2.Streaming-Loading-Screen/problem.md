# Problem Statement

## 1) Static loading screen with no progress feedback

The loading block in `RecommendationPanel.tsx` showed one unchanging screen for the entire 10–30 second recommendation wait:
- Brain icon with wiggle animation
- Fixed text: *"Synthesizing Clinical Intelligence"*
- Fixed sub-text: *"Checking signal store & rulesets..."*

No step information. No color change. No indication of why it was slow.

## 2) Frontend calling the wrong router prefix for SSE

The backend had a working SSE streaming endpoint registered on the `clinical` router at `/api/v1/clinical/recommend/stream`. The frontend used the `contracts` router for all other recommendation calls (`/api/recommend`). The `contracts` router had no `/recommend/stream` endpoint — every SSE request returned **404 Not Found**.

## 3) XAI / Explainability gap

The POC evaluation criteria include explainability (XAI). A static spinner is invisible — it provides zero transparency into what the AI system is doing. Physicians have no way to understand whether the delay is caused by data loading, rule evaluation, or LLM inference.
