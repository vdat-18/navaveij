# Discover — Stage 5: Verification

# Discover — Stage 5: Verification

## Bug Found: Markdown Bold Leaking + Missing Highlights

**Symptom:** Raw `**...**` markers visible in the UI; many AI-bolded words lacked highlight styling.

**Root cause (2 issues):**

1. **Text field retained raw markdown** — Neither the BAML path (`workflows/clinical.py` line 316) nor the fallback path (`text_annotations.py` line 208) stripped `**...**` from the `text` field before sending to the frontend. The frontend renderer also didn't strip it.

2. **Missing Pass 3 in `find_highlight_terms()`** — The docstring promised 3 passes but code only had 2 (clinical phrases + BP regex). Pass 3 was supposed to extract inner text of `**...**` markers as highlight terms. Without it, AI-bolded words NOT in `CLINICAL_PHRASES` got zero highlights.

**Fix applied:** See `_development_summary.md`.

## Pre-existing Test Failures (not caused by Stage 1–5)

### Scripts integration tests — 15 failures (66 passed)

| Test | Failure Reason |
|------|---------------|
| `test_clinical_workflow_ai_path` | `AttributeError: 'SimpleNamespace' has no attr 'program_justification'` — mock missing field |
| `test_recommendation_pipeline_profile[*]` (4 tests) | Same mock structure issue |
| `test_frontend_reliability_contract.py` (5 tests) | Source-code string assertions stale after AuthProvider/PrivacyMode additions |
| `test_admin_alias_routes_exist` | Route alias not yet wired |
| `test_gap9_admin_aliases_and_mapping_contract_smoke` | Same route alias issue |
| `test_orchestrator_injects_security_metadata_after_final_rehydration` | Mock structure missing field |
| `test_gap_r7_audit_logger_writes_five_dimensions` | Audit dimension count mismatch |
| `test_mapping_component_renders_target_terminology_columns` | Source assertion stale |

### Frontend vitest — 4 failures (45 passed)

| Test | Failure Reason |
|------|---------------|
| `Sidebar.test.tsx` | Missing `AuthProvider` wrapper |
| `trend-timeline/page.test.tsx` | Missing `AuthProvider` wrapper |
| `AuditLogSearchPanel.test.tsx` | Missing `PrivacyModeProvider` wrapper |
| `page.test.tsx` | Missing `patient-directory-column` testid (layout change) |

All pre-existing — none touch files modified in Stages 1–5.
