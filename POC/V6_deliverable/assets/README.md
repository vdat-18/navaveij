# Assets — Clinical Data & Configuration

This folder is the **data layer** for the Navavej V6 health checkup recommendation system. It contains patient identities, pre-computed clinical risk assessments, commercial pricing rules, and operational monitoring configs.

## Directory Structure

```
assets/
├── patient_registry.json          # Master patient roster
├── patient_registry.backup.json   # Backup (full 23-patient set)
├── monitoring.json                # Operational monitoring & audit config
└── synthesis/
    ├── generated/                 # Signal Store — pre-computed patient records
    │   ├── HealthyRoutineCheckup/       (5 records)
    │   ├── MetabolicSyndromeRisk/       (6 records)
    │   ├── SeniorCancerScreeningGap/    (7 records)
    │   ├── UncontrolledHypertension/    (5 records)
    │   └── Test/                        (1 test record)
    ├── seeds/                     # Template seeds for data generation
    │   ├── healthy_routine_checkup_seed.json
    │   ├── metabolic_syndrome_risk_seed.json
    │   ├── senior_cancer_screening_gap_seed.json
    │   └── uncontrolled_hypertension_seed.json
    └── rulesets/                   # Commercial rules & product catalog
        ├── sample_ruleset_tier_config.json
        ├── sample_package_resolution.json
        ├── sample_add_on_items.json
        └── sample_promotions.json
```

## File Descriptions

### `patient_registry.json`

Master patient roster. Currently contains **3 active patients** representing distinct health profiles:

| Patient | Category | Health Profile |
|---------|----------|----------------|
| Boon-Mee Siriwat | Healthy Routine Checkup | Green — all normal biomarkers |
| Fai Siriwat | Metabolic Syndrome Risk | Amber — metabolic syndrome cluster, Stage 1 HTN, prediabetes |
| Jarat Prasert | Uncontrolled Hypertension | Red — Stage 2 HTN, declining eGFR, prediabetes, overdue screenings |

**Schema** (per patient):

| Field | Example | Description |
|-------|---------|-------------|
| `patient_id` | `id_33cc44dd` | Unique identifier |
| `patient_token` | `tok_hmac_33cc44dd` | HMAC-based privacy token used for Signal Store lookups |
| `patient_name` | `Boon-Mee Siriwat (Healthy Routine Checkup)` | Display name with category |
| `age` | `35` | Numeric age |
| `gender` | `Male` | Male / Female |
| `ethnicity` | `Asian` | Ethnic background |
| `mrn` | `MRN-33CC44DD` | Medical Record Number |
| `phone` / `email` | — | Contact info |

> **Note:** `patient_registry.backup.json` contains the original 23-patient set as a fallback.

### `monitoring.json`

Operational monitoring and compliance dashboard configuration.

**Key sections:**
- `snapshot` — Live metrics (active users, sessions, recommendations generated, alerts)
- `anomaly_alerts` — Security anomalies (high volume, out-of-department, off-hours access)
- `audit_logs` — Detailed trail of who accessed what, when, and why
- `rbac_roles` — Role-based access control (Physician, Nurse, Pharmacist, Admin, DPO)
- `mapping_codes` — Terminology mappings (local HIS codes to LOINC, ICD-10, CPT, SNOMED CT)
- `master_programs` — Health checkup package definitions with pricing (BASIC_16, GOLD_ANY, PLATINUM, DIAMOND)

### `synthesis/generated/` — Signal Store

Pre-computed clinical risk assessment records, one JSON file per patient scenario. These are the core data source for biomarker charts, clinical signals, and timeline events.

**Schema version:** `signal_store_record_v1`

Each record contains:

| Section | Purpose |
|---------|---------|
| `hard_constraints` | Demographics, eligibility exclusions, safety flags, tier ceiling |
| `clinical_signals` | Risk flags, applicable signals, screening gaps, vaccination gaps, comorbidity tags |
| `biomarker_trends` | BMI, blood pressure, eGFR, lab histories (FBS, HbA1c, LDL, HDL, etc.), ASCVD risk |
| `metadata` | Data completeness ratio, pipeline run ID, computation timestamp |

**Records are organized by clinical category:**
- **HealthyRoutineCheckup** — Low-risk baseline screening
- **MetabolicSyndromeRisk** — Moderate risk with cardiometabolic focus
- **SeniorCancerScreeningGap** — Seniors with overdue cancer screenings
- **UncontrolledHypertension** — High-risk hypertension management
- **Test** — Development/test record

### `synthesis/seeds/`

Template seeds used as archetypes for generating synthetic patient records. Each seed follows the same `signal_store_record_v1` schema as generated records.

### `synthesis/rulesets/`

Commercial configuration for the recommendation deal-closing layer.

**`sample_ruleset_tier_config.json`** — Tier selection policy:
- Contains `tier_selection_rules` used to determine Standard / Advanced / Premium recommendation boundaries
- Must be present in the V6 deployment bundle; V6 should not depend on `POC/v3` or `doc_outputs` copies in production

**`sample_package_resolution.json`** — Package resolution map:
- Maps tier + demographic age band to the actual package code, name, and price
- Used to resolve the base package shown in the dashboard and billing panel
- Must be present in the V6 deployment bundle; missing this file degrades the recommendation into manual-review state

**`sample_add_on_items.json`** — Catalog of 28 clinical add-on tests:
- Each item links `trigger_signals` (which clinical flags trigger it) to a `navavej_product` (product code, price in THB)
- Includes safety contraindications, guideline references (USPSTF, AHA/ACC), gender/age constraints
- Priority levels: Red (urgent), Yellow (recommended), Green (optional)

**`sample_promotions.json`** — Promotional campaigns and membership offerings:
- Seasonal campaigns (e.g., "5th Anniversary Wellbeing Expo 2026")
- Membership cards (Smart Life Card, Smart Kid Card) with discount mechanics
- Original prices for strikethrough display
- Version: `v2026.03.1`

## Data Flow

```
patient_registry.json          Signal Store (synthesis/generated/)
        │                                │
        │  patient_id / patient_token    │  patient_token lookup
        ▼                                ▼
   ┌─────────┐                  ┌─────────────────┐
   │ Patient  │───── token ────▶│ Signal Store     │
   │ Lookup   │                 │ Record           │
   └─────────┘                  └────────┬────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                   clinical_signals  biomarker_trends  hard_constraints
                          │              │              │
                          ▼              ▼              ▼
                   ┌──────────────────────────────────────┐
                   │     Recommendation Engine             │
                   │  (+ rulesets for pricing/add-ons)     │
                   └──────────────────────────────────────┘
```

## Key Conventions

- **`patient_token`** — All clinical data is accessed via HMAC tokens, never raw patient IDs, for privacy
- **`pipeline_run_id`** — Every record traces back to a specific pipeline execution for auditability
- **`computed_at`** — ISO 8601 timestamp indicating when the clinical assessment was computed
- **`schema_version`** — Currently `signal_store_record_v1`; check this if records fail to parse
- **V6 ruleset bundle is self-contained** — production deployment should include all four files in `assets/synthesis/rulesets/`; runtime should not rely on cross-version fallbacks
