# Latest Test Results — Round 2: Additional Requests

| Check | Status | Notes |
|-------|--------|-------|
| Transparency Metric tooltip not clipped | ✅ PASS | Removed `overflow-hidden` from Clinical Logic card |
| Client-side recommendation cache (5 min TTL) | ✅ PASS | Module-level Map with `recCacheKey(token, ruleBased)`, 5 min TTL |
| Biomarker "?" help tooltips on all 6 charts | ✅ PASS | HelpCircle icon + dark tooltip with "what/interpret" for FBS, HbA1c, LDL, BMI, BP Systolic, eGFR |
| Biomarker tooltip visible in ClinicalDrawer | ✅ PASS | Repositioned to `top-full left-0`; no longer clipped by `overflow-y-auto` |
| Clinical timeline date groups collapsible | ✅ PASS | ChevronDown/Right toggle, default expanded, click to collapse |
| Clinical timeline type-aware badges | ✅ PASS | Medications: STARTED/STOPPED/ESCALATED/TAPERED/CONTINUED/MODIFIED; Dx: ACTIVE/RESOLVED/NOTED; Screens: ALERT/CLEAR/PENDING; Labs: ALERT/WATCH/OPTIMAL |
| Lab severity FHIR code mapping | ✅ PASS | N→OPTIMAL, H/HH/L/LL→ALERT, A→WATCH; no labs showing "—" for known codes |
| BAML sentiment casing normalized | ✅ PASS | `item.sentiment.lower()` at `clinical.py:318`; risk lines now match frontend `'risk'` comparison |
| BAD_KEYWORDS expanded (fallback path) | ✅ PASS | +15 clinical compound phrases; no false positives on negations |
| BAML annotation tests (3/3) | ✅ PASS | Assertions updated to capitalized enum variants (`"Risk"`, `"Reassuring"`) |
| AuditLogSearchPanel HTTPS warning text | ✅ PASS | Full message restored; previously failing test now passes |
| `npm run build` exits 0 | ✅ PASS | 7 routes compiled, all static pages generated |
| Backend pytest passes | ✅ PASS | 12/12 tests passed (8 new: clinical workflow parallelization) |
| Frontend vitest passes | ✅ PASS | 49/49 tests passed across 12 files |

## Round 3: AI Reasoning Parallelization

| Check | Status | Notes |
|-------|--------|-------|
| Opt 1: annotation non-blocking (result used when done) | ✅ PASS | `test_opt1_annotation_used_when_completes_during_gather` |
| Opt 1: annotation non-blocking (fallback when raises) | ✅ PASS | `test_opt1_deterministic_fallback_when_annotation_raises` |
| Opt 1: annotation non-blocking (fallback when in-flight) | ✅ PASS | `test_opt1_deterministic_fallback_when_annotation_in_flight` |
| Opt 2: RuleEvaluator concurrent with Agent 1 | ✅ PASS | `test_opt2_rule_tier_correctly_applied` |
| Opt 2: Agent 1 failure cancels rule_task, sync fallback | ✅ PASS | `test_opt2_agent1_failure_falls_back_to_rule_based` |
| Regression: force_rule_based skips all LLM calls | ✅ PASS | `test_regression_force_rule_based_skips_llm` |
| Regression: both Agent 2 fail → rule-based fallback | ✅ PASS | `test_regression_both_agent2_fail_falls_back_to_rule_based` |
| Regression: cache hit skips AnalyzeClinicalRisks | ✅ PASS | `test_regression_cache_hit_skips_agent1` |
| Backend pytest full suite | ✅ PASS | 12/12 passed |
