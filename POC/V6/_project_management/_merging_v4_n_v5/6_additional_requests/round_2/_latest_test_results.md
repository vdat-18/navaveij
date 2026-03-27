# Latest Test Results — Round 2: Additional Requests

| Check | Status | Notes |
|-------|--------|-------|
| Transparency Metric tooltip not clipped | ✅ PASS | Removed `overflow-hidden` from Clinical Logic card |
| Client-side recommendation cache (5 min TTL) | ✅ PASS | Module-level Map with `recCacheKey(token, ruleBased)`, 5 min TTL |
| Biomarker "?" help tooltips on all 6 charts | ✅ PASS | HelpCircle icon + dark tooltip with "what/interpret" for FBS, HbA1c, LDL, BMI, BP Systolic, eGFR |
| Biomarker tooltip visible in ClinicalDrawer | ✅ PASS | Repositioned to `top-full left-0`; no longer clipped by `overflow-y-auto` |
| Clinical timeline date groups collapsible | ✅ PASS | ChevronDown/Right toggle, default expanded, click to collapse |
| Clinical timeline type-aware badges | ✅ PASS | Medications: STARTED/STOPPED/ESCALATED/TAPERED/CONTINUED/MODIFIED; Dx: ACTIVE/RESOLVED/NOTED; Screens: ALERT/CLEAR/PENDING; Labs: ALERT/WATCH/OPTIMAL |
| BAML sentiment casing normalized | ✅ PASS | `item.sentiment.lower()` at `clinical.py:318`; risk lines now match frontend `'risk'` comparison |
| BAD_KEYWORDS expanded (fallback path) | ✅ PASS | +15 clinical compound phrases; no false positives on negations |
| BAML annotation tests (3/3) | ✅ PASS | Assertions updated to capitalized enum variants (`"Risk"`, `"Reassuring"`) |
| AuditLogSearchPanel HTTPS warning text | ✅ PASS | Full message restored; previously failing test now passes |
| `npm run build` exits 0 | ✅ PASS | 7 routes compiled, all static pages generated |
| Backend pytest passes | ✅ PASS | 4/4 tests passed |
| Frontend vitest passes | ✅ PASS | 49/49 tests passed across 12 files |
