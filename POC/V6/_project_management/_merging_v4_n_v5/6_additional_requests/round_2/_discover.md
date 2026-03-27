# Discover — Round 2: Additional Requests

## R2a — Tooltip Clipping Bug

**Root cause:** The Clinical Logic & Rationale card (`RecommendationPanel.tsx` ~line 914) uses `overflow-hidden` to clip a decorative background circle. This same constraint clips the Transparency Metric tooltip which extends upward from the Confidence Indicator.

**CSS chain:**
- Parent: `navavej-card p-12 border-none bg-white shadow-xl ... relative overflow-hidden group`
- Tooltip: `absolute bottom-full left-0 mb-3 z-50` — extends above the card, gets clipped

**Fix:** Remove `overflow-hidden`. The decorative circle (`bg-navavej-teal/[0.02]`, 2% opacity) bleeding out is invisible. `rounded-[24px]` still applies to the card background.

## R2b — Recommendation Caching

**Current data flow:**
1. `RecommendationPanel` mounts or `patientToken`/`isRuleBasedForced` changes
2. `useEffect` triggers `fetchRecommendation()`
3. Calls `clinicalService.streamRecommendation()` → POST `/recommend/stream`
4. Streaming endpoint (`contracts.py:850`) does NOT use server-side cache
5. Full AI inference runs every time

**Server-side cache (exists but unused by streaming):**
- `cache_service.get/set` in `contracts.py:790-846` — only for POST `/recommend`
- TTL: `settings.cache_recommendation_ttl_seconds = 300` (5 min)
- Key: SHA256 of `patient_token + pipeline_run_id + ruleset_version + force_rule_based + auth_mode`

**Client-side cache (to be added):**
- Module-level `Map<string, CacheEntry>` in `RecommendationPanel.tsx`
- Key: `patientToken:isRuleBasedForced` (simpler — same patient+mode = same result)
- TTL: 5 minutes (matches backend)
- Check before streaming; store after result received
- Cache survives component unmount/remount (module-level) but not page reload

## R2c — Biomarker Chart Help Tooltips

**Current state:** `BiomarkerTrendGrid.tsx` renders 6 biomarker cards with: label, LOINC code, trend direction, line chart, status banner. No explanation of what the metric means.

**Data structure:** `BiomarkerSeries` has `label`, `loinc_code`, `unit`, `reference`, etc. but no description field. Using client-side map instead of backend change.

**Biomarkers to document:**
| Label | What it measures | Interpretation ranges |
|-------|-----------------|----------------------|
| FBS | Fasting blood sugar after 8+ hrs | <100 normal, 100–125 pre-diabetes, ≥126 diabetes |
| HbA1c | Average blood sugar over 2–3 months | <5.7% normal, 5.7–6.4% pre-diabetes, ≥6.5% diabetes |
| LDL | "Bad" cholesterol | <100 optimal, 100–129 near-optimal, 130–159 borderline, ≥160 high |
| BMI | Weight relative to height | 18.5–22.9 normal (Asian), 23–24.9 overweight, ≥25 obese |
| BP Systolic | Pressure when heart beats | <120 normal, 120–129 elevated, 130–139 Stage 1, ≥140 Stage 2 |
| eGFR | Kidney filtration rate | ≥90 normal, 60–89 mild (G2), 30–59 moderate (G3), <30 severe |

**Existing patterns:** `Info` icon already imported in BiomarkerTrendGrid. Group-hover tooltips used extensively in codebase.

## R2d — Collapsible Timeline Dates

**Current state:** `ClinicalEventTimeline.tsx` groups events by date (newest first). Date headers are sticky with event count badge. All groups are always expanded.

**Grouping logic:** `useMemo` at line 23-106 creates `{ date, events }[]` sorted descending.

**Existing collapse patterns:**
- `MasterDataTab.tsx`: `useState<string | null>` + `ChevronDown`/`ChevronRight` toggle
- `TierRulesTab.tsx`: Similar card expansion with show more/less

**Design:** Use `Set<string>` for collapsed dates (empty = all expanded = current behavior). Click handler on date header. Chevron icon indicates state.

## R2e — BAML Sentiment Casing Mismatch (Risk Lines Grey Instead of Red)

**Symptom:** All clinical reasoning lines in the "Clinical Logic & Rationale" section render grey/neutral, even lines with clear risk indicators like "Stage 2 Hypertension" or "LDL 158.5 mg/dL significantly above target". The fallback keyword path works correctly (risk lines show red), but the BAML agent path does not.

**Root cause — casing mismatch through the full pipeline:**

1. BAML defines: `enum LineSentiment { Risk @alias("risk") Reassuring @alias("reassuring") Neutral @alias("neutral") }`
2. LLM outputs lowercase alias: `"risk"` (as instructed by `@alias`)
3. BAML runtime parses alias back to the **capitalized variant name**: `"Risk"`
4. Backend passes it through unchanged: `"sentiment": item.sentiment` → `"Risk"` (in `clinical.py:318`)
5. Frontend compares: `sentiment === 'risk'` → **false** for `"Risk"` → falls through to grey/neutral styling

**Why fallback works:** `text_annotations.py:_normalize_line_sentiment()` returns hardcoded lowercase strings (`"risk"`, `"reassuring"`, `"neutral"`), which match the frontend's expectations.

**Fix:** Normalize sentiment to lowercase at the backend boundary (`clinical.py:318`):
```python
"sentiment": item.sentiment.lower() if isinstance(item.sentiment, str) else str(item.sentiment).lower(),
```

**Additional improvements:**
- Expanded `BAD_KEYWORDS` in `text_annotations.py` with clinical compound phrases ("stage 1 hypertension", "stage 2 hypertension", "prediabetes", "obesity", etc.) — used specific compounds instead of bare "hypertension" to avoid false positives on "no hypertension"
- Fixed `annotation_tests.baml` assertions from lowercase aliases (`"risk"`) to capitalized enum variants (`"Risk"`) to match actual BAML output

## R2f — Type-Aware Status Badges in Clinical Event Timeline

**Problem:** `ClinicalEventTimeline.tsx` used a flat 4-value severity scale (normal/borderline/abnormal/info) mapped to ALERT/OPTIMAL/CHECK/STABLE badges for all event types. All medication events were hardcoded to `severity: "info"` → always showed "STABLE" regardless of clinical significance. "STABLE" for a discontinued medication is meaningless noise.

**Root cause:** No concept of event-type-specific status semantics. Labs, diagnoses, screenings, and medications all share the same badge logic despite having fundamentally different status vocabularies.

**Fix:** Added `changeType?: string` to `TimelineRow`, populated from `medication.change_type`. Added `MED_CHANGE_MAP` for 14 known change types. Added `getEventBadge(row)` function that returns type-aware `{ label, colorClass }`:
- Medications: keyed off `change_type` (started→STARTED/teal, discontinued→STOPPED/red, increased→ESCALATED/amber, etc.)
- Diagnoses: ACTIVE (abnormal), RESOLVED (normal), NOTED (info)
- Screenings: ALERT (abnormal), CLEAR (normal), PENDING (info)
- Labs: ALERT (abnormal), WATCH (borderline), OPTIMAL (normal), — (info)

## R2g — Biomarker Tooltip Clipping in ClinicalDrawer

**Problem:** The biomarker "?" tooltip was positioned `bottom-full left-1/2 -translate-x-1/2` (centered above the icon). The ClinicalDrawer wraps content in `overflow-y-auto`, which clips anything extending above the scroll area. The left edge was also cut off at small icon positions.

**Fix:** Changed to `top-full left-0 mt-2` (drops below the icon, left-aligned). Arrow changed from downward-pointing (`border-t-`) to upward-pointing (`border-b-`), placed before the dark box div.

## R2i — Lab Severity FHIR Code Mismatch

**Symptom:** All lab events in the Clinical Event Timeline showed "—" after R2f introduced type-aware badges (where "—" is the explicit `info` fallback for labs). Even clearly normal labs like "89 mg/dL (N)" rendered with no badge.

**Who determines severity? Rules only — no AI.** Full pipeline:
1. Signal store (pre-computed synthesis) stores `interpretation` using FHIR short codes per `baml_src/synthesis/signal_store_types.baml`: `"N"` | `"H"` | `"L"` | `"HH"` | `"LL"` | `"A"`
2. Backend timeline builder (`mcp_server/utils.py:564`) copies `interpretation` verbatim and hardcodes `threshold_crossed: ""`
3. Frontend severity mapping checks full English words: `item.interpretation === "Normal"`, `=== "High"`, `=== "Low"`, `=== "Borderline"` — none match FHIR codes
4. `threshold_crossed === "normal"` / `"above_high"` / `"below_low"` — also always false since backend always sends `""`

**Result:** Every lab → `severity = "info"` → badge "—".

**FHIR code → severity mapping:**
| Code | Meaning | Severity |
|------|---------|----------|
| `"N"` | Normal | normal → OPTIMAL |
| `"H"` / `"HH"` | High / Critical High | abnormal → ALERT |
| `"L"` / `"LL"` | Low / Critical Low | abnormal → ALERT |
| `"A"` | Abnormal (non-numeric) | borderline → WATCH |

**Fix:** Replaced full-word comparisons with FHIR-code-aware mapping using `interp = item.interpretation?.toUpperCase()`, with backwards-compat fallback for full-word forms.

## R2h — AuditLogSearchPanel HTTPS Warning Text

**Problem:** `verifyResult === "no-https"` rendered "Requires HTTPS" — an abbreviated string that didn't match the vitest test expectation ("Hash verification requires a secure (HTTPS) connection") and was insufficiently descriptive for end users.

**Fix:** Expanded to the full informative message. This also resolved the previously-failing `AuditLogSearchPanel` test (1 of 49 tests).
