# Plan: POC Deliverables — UI Mockup Screens + Missing Schema Contracts

## Context

The backend architecture, all schema contracts for the Recommendation Platform, and sample data are complete (15 documents, checkpoint v3). The POC requires 3 minimum UI mockup screens for the evaluation committee presentation.

Two gaps block screen production:
1. **Screen 2 needs a 5th MCP tool** — `get_patient_event_timeline` — to provide the structured historical events (diagnoses with dates, hospitalizations, significant lab events) required for the Trend & Timeline view. The existing tools return computed metrics, not event-structured history.
2. **Screen 3 has no schema contract at all** — TOR §3.4 specifies 6 sub-features for the Admin/DPO Access Monitoring Dashboard but none have been designed.

Decision: Full schema contracts first (same rigour as existing contracts), then screens.

---

## Deliverables in Order

### 1. `event-timeline-contract.md` — New 5th MCP Tool

**File:** `doc_outputs/architecture/AI/Recommendation Engine/v3/schema-contracts/event-timeline-contract.md`

**Tool:** `get_patient_event_timeline(patient_token)`

**Purpose:** Returns structured historical event data for the Trend & Timeline screen. The existing `get_biomarker_trends` tool returns computed metrics (slope, velocity, trend direction) and short history arrays — it does NOT return a structured clinical event timeline needed for the timeline track on Screen 2.

**Response structure (5 arrays):**

```
diagnoses[]
  date, icd10_code, snomed_code, label, clinical_status, onset_type (acute/chronic), onset_year
  source: FHIR Condition.onsetDateTime + code

hospitalizations[]
  date_admit, date_discharge, length_of_stay_days, reason_label, encounter_class
  source: FHIR Encounter (class: inpatient)

significant_lab_events[]
  date, lab_id, loinc_code, label, value, unit, interpretation (H/L/HH/LL), threshold_crossed
  — Only abnormal results (interpretation != N); max last 5 years
  source: FHIR Observation where interpretation != Normal

screening_procedure_history[]
  date, procedure_code, cpt_code, label, status (completed/cancelled), days_ago
  — All completed screenings relevant to screening gap calculation
  source: FHIR Procedure (completed)

medication_changes[]
  date, drug_name, rxnorm_code, change_type (started/stopped/dose_change), dose
  source: FHIR MedicationStatement + MedicationRequest

timeline_span:
  earliest_event_date, latest_event_date, total_years_covered
```

**Contract format:** Same as `signal-store-contract.md` — purpose, full JSON example (Somchai W.), JSON Schema, field dictionary.

**Somchai W. example events to include:**
- Dyslipidemia diagnosis 2022
- HTN diagnosis 2025 (on Amlodipine)
- Prediabetes confirmed 2024
- Hyperuricemia 2026
- Colonoscopy 2019-06-12 (last performed)
- Statin started 2022
- Significant labs: FBS crossing 100 in 2024, HbA1c crossing 5.7% in 2024

---

### 2. `access-monitoring-contract.md` — Admin/DPO Dashboard Schema

**File:** `doc_outputs/architecture/AI/Recommendation Engine/v3/schema-contracts/access-monitoring-contract.md`

**Covers all 6 TOR §3.4 sub-features:**

#### 2a. Audit Log Record (TOR §3.4.3 + §5.3)
Already described architecturally in `component-inventory §2.7`. This contract formalises the actual record schema.

```
audit_log_entry {
  entry_id:         UUID
  sha256_hash:      string  (this entry's hash)
  prev_entry_hash:  string  (chain link — tamper evident)

  who:   { user_id, user_role, smart_fhir_session_token }
  when:  { iso_timestamp_utc }
  where: { service_id, source_ip, request_id }
  what:  { action_type (View/Generate/Export/Admin),
           patient_token (masked),
           prompt_hash, context_hash, response_hash,
           model_id, template_version, latency_ms,
           safety_validator_result }
  why:   { request_context, indication_code }

  retention_expiry: date
}
```

**Search API spec:** `search_audit_logs(filters)` — filters by user_id, patient_token, date_range, action_type; returns paginated entries.

#### 2b. Anomaly Detection (TOR §3.4.2)
Define:
- **User baseline model**: rolling 30-day window per user — avg records/session, typical access hours, department affinity
- **Anomaly signals** (3 types):
  - `high_volume`: records accessed in session > 3× user's 30-day average
  - `out_of_department`: patient's department != user's primary department AND access count > threshold
  - `off_hours`: access outside user's typical hour band (computed from baseline)
- **AnomalyAlert record**: alert_id, user_id, alert_type, severity (Low/Medium/High/Critical), triggered_at, detail, status (Open/Acknowledged/Resolved)

#### 2c. Real-Time Monitoring Metrics (TOR §3.4.1)
```
monitoring_snapshot {
  active_users_now:      integer
  sessions_today:        integer
  patient_records_accessed_today: integer
  alert_counts: { critical, high, medium, low }
  snapshot_at: ISO timestamp
}
```

#### 2d. RBAC Data Model (TOR §3.4.4)
```
role { role_id, role_name, department, permissions[] }
permission { resource_type (Patient/AuditLog/MasterData/MappingTable),
             actions[] (View/Generate/Export/Edit) }
user_role_assignment { user_id, role_id, assigned_at, expires_at? }
```

#### 2e. Mapping Table Schema (TOR §3.4.5)
```
mapping_entry {
  local_code:    string   (HIS internal code)
  local_label:   string
  target_system: enum (LOINC/SNOMED_CT/ICD10/CPT/CVX/NAVAVEJ_PRODUCT)
  target_code:   string
  target_label:  string
  status:        enum (active/pending_review/deprecated)
  last_updated_by, last_updated_at
}
```

#### 2f. Master Data Record Types (TOR §3.4.6)
Enumerate the 5 admin-managed master data types:
- `checkup_program` — maps to Ruleset Store package_resolution_map
- `alert_threshold` — lab ULN overrides per hospital policy
- `screening_interval` — admin-configurable interval overrides per guideline
- `vaccine_schedule` — active vaccine list with CVX codes
- `safety_rule` — admin-configurable safety rules (gender/age eligibility overrides)

---

### 3. UI Mockup Screens (3 screens)

**Format:** Markdown files with ASCII wireframe layout + field-by-field annotation mapping each UI element to its data contract source field. This is consistent with all other project documents and is self-contained for the POC presentation.

**Files:**
- `doc_outputs/poc-screens/screen-1-individual-summary.md`
- `doc_outputs/poc-screens/screen-2-trend-timeline.md`
- `doc_outputs/poc-screens/screen-3-access-monitoring.md`

#### Screen 1: Individual Summary & Recommendation

Key display areas (all from `recommendation-output-schema.md`):
- **Header bar**: patient identifier (rehydrated), resolved package name + price, `recommendation_source` badge
- **Patient High Alert panel** (top, red band): `patient_high_alert.critical_signals[]` + `missing_data_alerts[]`
- **Tier comparison row**: `rule_preliminary_tier` vs `ai_recommended_tier` side-by-side; `tier_deviation_justification` if different
- **Confidence Score widget**: `confidence_score` gauge (0–1) + `confidence_tier` label (High/Medium/Low)
- **Explainable AI panel**: `reasoning_trace` (scrollable text, full chain-of-thought)
- **Add-on list**: `add_ons[]` sorted by priority_level (Red → Orange → Yellow → Green), each card showing label, rationale, Navavej product name + price
- **Screening Gap / Overdue list**: extracted from `add_ons[]` where category = cancer_screening or vaccination
- **Communication Script panel**: tabbed sections (health_summary / recommendation_explanation / add_on_highlights / next_steps)

#### Screen 2: Trend & Timeline

Key display areas:
- **Biomarker trend charts** (from `get_biomarker_trends`): line charts for FBS, HbA1c, LDL, BMI, BP (systolic), eGFR — each with reference range band and trend arrow
- **Timeline track** (horizontal, chronological, from `get_patient_event_timeline`):
  - Diagnosis events (blue markers)
  - Hospitalizations (red markers)
  - Significant abnormal labs (orange markers)
  - Completed screenings (green markers)
  - Medication changes (grey markers)
- **Screening gap status bar**: overdue items from `get_clinical_signals.screening_gaps[]` with `priority_color` and `overdue_days`
- **Vaccination status row**: `vaccination_gaps[]` with color badges

#### Screen 3: Access Monitoring Dashboard

Key display areas (from `access-monitoring-contract.md`):
- **Live metrics bar**: active users, sessions today, records accessed today, open alert count
- **Anomaly Alert table**: `AnomalyAlert[]` filtered to Open/Unacknowledged, sortable by severity; inline acknowledge action
- **Audit Log Search panel**: filter form (user, patient_token, date range, action_type) + paginated results table showing Who/When/Where/What/Why columns
- **User Activity heatmap**: per-user access volume vs baseline (for anomaly visualization)
- **Navigation tabs** (shown but not detailed in POC): Role Management | Mapping Tool | Master Data

---

### 4. Update `__checkpoint.md`

Add documents 16–19 (event-timeline-contract, access-monitoring-contract, 3 screen files) and update Next Steps to: POC presentation deck.

---

## File Locations Summary

| # | File | New/Update |
|---|------|-----------|
| 16 | `schema-contracts/event-timeline-contract.md` | New |
| 17 | `schema-contracts/access-monitoring-contract.md` | New |
| 18 | `poc-screens/screen-1-individual-summary.md` | New |
| 19 | `poc-screens/screen-2-trend-timeline.md` | New |
| 20 | `poc-screens/screen-3-access-monitoring.md` | New |
| — | `__checkpoint.md` | Update |

All files under `doc_outputs/architecture/AI/Recommendation Engine/v3/`.

---

## Execution Order

1. `event-timeline-contract.md` — unblocks Screen 2
2. `access-monitoring-contract.md` — unblocks Screen 3
3. Screen 1 (no dependencies, can be written in parallel with #1–2)
4. Screen 2 (after #1)
5. Screen 3 (after #2)
6. Checkpoint update

---

## Verification

- Each schema contract follows the same structure as `signal-store-contract.md`: purpose → example JSON (Somchai W. or equivalent) → JSON Schema → field dictionary
- Each screen mockup maps every UI element to a named field in a contract doc (no orphaned UI elements)
- All 4 POC evaluation criteria are visually represented across the 3 screens:
  - 35% Hybrid mechanism → Screen 1 (rule_preliminary_tier vs ai_recommended_tier side-by-side)
  - 25% Pluggable AI + FHIR → Screen 1 metadata + Screen 2 data labels with LOINC codes
  - 20% XAI + Trend → Screen 1 reasoning_trace + confidence_score + Screen 2 charts
  - 20% Security/Audit → Screen 3
