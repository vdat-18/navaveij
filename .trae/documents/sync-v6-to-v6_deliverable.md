# Plan: Sync V6 to V6_deliverable with Backup

## Overview
Sync changes from `POC/V6` (development) to `POC/V6_deliverable` (production deliverable) while creating a backup first.

## Key Observations

### V6 has that V6_deliverable needs:
- `frontend/src/app/configuration/page.tsx` - New configuration page
- `frontend/src/components/configuration/ConfigurationScreen.tsx` - New configuration component

### V6_deliverable has that should be preserved:
- `assets/synthesis/generated/` - Multiple generated record folders (HealthyRoutineCheckup, MetabolicSyndromeRisk, SeniorCancerScreeningGap, UncontrolledHypertension)
- `assets/synthesis/seeds/` - Additional seeds (senior_cancer_screening_gap_seed.json, uncontrolled_hypertension_seed.json)
- `scripts/` - Test scripts and helper scripts
- `shared/` - Shared Python utilities
- Docker files (.dockerignore, Dockerfile, docker-compose.yml)
- Root config files (pyproject.toml, requirements.txt, uv.lock, vercel.json, CLAUDE.md)
- `frontend/src/components/access-monitoring/SystemConfigTab.tsx`

### Exclude from sync:
- `frontend/.next/` - Next.js build cache
- `frontend/coverage/` - Test coverage reports
- `_project_management/` - Internal project management files
- `__pycache__/` - Python cache
- `.env` files with secrets

---

## Execution Steps

### Step 1: Create Backup
Create a timestamped backup of V6_deliverable:
```bash
cp -r POC/V6_deliverable "POC/V6_deliverable_backup_$(date +%Y%m%d_%H%M%S)"
```

### Step 2: Sync Backend Files
Copy backend Python files (preserving V6_deliverable structure):
- `backend/src/` → All Python source files
- `backend/tests/` → All test files

### Step 3: Sync BAML Files
Copy BAML source files:
- `baml_src/` → All .baml files and prompt configs

### Step 4: Sync Assets (Selective)
- `assets/synthesis/rulesets/` → Update ruleset configs
- `assets/synthesis/seeds/` → **SKIP** (V6_deliverable has more seeds)
- `assets/synthesis/generated/` → **SKIP** (V6_deliverable has production data)
- `assets/monitoring.json` → Update if changed
- `assets/patient_registry.json` → **SKIP** (production data)

### Step 5: Sync Frontend Source Files
Copy frontend source, excluding build artifacts:
- `frontend/src/app/` → All pages including new `configuration/`
- `frontend/src/components/` → All components
- `frontend/src/data/` → Data files
- `frontend/src/services/` → API services
- `frontend/src/shared/` → Shared utilities
- `frontend/src/test/` → Test setup
- `frontend/src/types/` → TypeScript types
- `frontend/public/` → Static assets

**Exclude:**
- `frontend/.next/`
- `frontend/coverage/`
- `frontend/node_modules/`

### Step 6: Sync Frontend Config Files
Update config files if newer in V6:
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/next.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/postcss.config.mjs`
- `frontend/eslint.config.mjs`
- `frontend/vitest.config.ts`
- `frontend/README.md`

### Step 7: Sync Root Level Files
Update root level files:
- `.env.example`
- `README.md`

---

## Files to Copy (Detailed List)

### New Files to Add:
```
POC/V6/frontend/src/app/configuration/page.tsx
POC/V6/frontend/src/components/configuration/ConfigurationScreen.tsx
```

### Directories to Sync (overwrite):
```
POC/V6/backend/src/ → POC/V6_deliverable/backend/src/
POC/V6/backend/tests/ → POC/V6_deliverable/backend/tests/
POC/V6/baml_src/ → POC/V6_deliverable/baml_src/
POC/V6/assets/synthesis/rulesets/ → POC/V6_deliverable/assets/synthesis/rulesets/
POC/V6/frontend/src/app/ → POC/V6_deliverable/frontend/src/app/
POC/V6/frontend/src/components/ → POC/V6_deliverable/frontend/src/components/
POC/V6/frontend/src/data/ → POC/V6_deliverable/frontend/src/data/
POC/V6/frontend/src/services/ → POC/V6_deliverable/frontend/src/services/
POC/V6/frontend/src/shared/ → POC/V6_deliverable/frontend/src/shared/
POC/V6/frontend/src/test/ → POC/V6_deliverable/frontend/src/test/
POC/V6/frontend/src/types/ → POC/V6_deliverable/frontend/src/types/
POC/V6/frontend/public/ → POC/V6_deliverable/frontend/public/
```

### Files to Sync (overwrite):
```
POC/V6/assets/monitoring.json → POC/V6_deliverable/assets/monitoring.json
POC/V6/assets/README.md → POC/V6_deliverable/assets/README.md
POC/V6/frontend/package.json → POC/V6_deliverable/frontend/package.json
POC/V6/frontend/package-lock.json → POC/V6_deliverable/frontend/package-lock.json
POC/V6/frontend/tsconfig.json → POC/V6_deliverable/frontend/tsconfig.json
POC/V6/frontend/next.config.ts → POC/V6_deliverable/frontend/next.config.ts
POC/V6/frontend/tailwind.config.ts → POC/V6_deliverable/frontend/tailwind.config.ts
POC/V6/frontend/postcss.config.mjs → POC/V6_deliverable/frontend/postcss.config.mjs
POC/V6/frontend/eslint.config.mjs → POC/V6_deliverable/frontend/eslint.config.mjs
POC/V6/frontend/vitest.config.ts → POC/V6_deliverable/frontend/vitest.config.ts
POC/V6/frontend/README.md → POC/V6_deliverable/frontend/README.md
POC/V6/.env.example → POC/V6_deliverable/.env.example
POC/V6/README.md → POC/V6_deliverable/README.md
```

### Directories/Files to SKIP (V6_deliverable specific):
```
POC/V6_deliverable/assets/synthesis/generated/ (preserve production data)
POC/V6_deliverable/assets/synthesis/seeds/ (has additional seeds)
POC/V6_deliverable/assets/patient_registry.json (production data)
POC/V6_deliverable/assets/patient_registry.backup.json
POC/V6_deliverable/scripts/ (V6 doesn't have this)
POC/V6_deliverable/shared/ (V6 doesn't have this)
POC/V6_deliverable/frontend/src/components/access-monitoring/SystemConfigTab.tsx (V6_deliverable only)
POC/V6_deliverable/.dockerignore
POC/V6_deliverable/Dockerfile
POC/V6_deliverable/docker-compose.yml
POC/V6_deliverable/pyproject.toml
POC/V6_deliverable/requirements.txt
POC/V6_deliverable/uv.lock
POC/V6_deliverable/vercel.json
POC/V6_deliverable/CLAUDE.md
POC/V6_deliverable/.gitignore
POC/V6_deliverable/start_backend.sh
POC/V6_deliverable/start_frontend.sh
POC/V6_deliverable/.env.production.example
POC/V6_deliverable/frontend/.env.production.example
POC/V6_deliverable/frontend/next-env.d.ts
POC/V6_deliverable/frontend/logo-2.png
```

---

## Verification Steps

After sync:
1. Verify backup exists with timestamp
2. Verify new files exist (`configuration/page.tsx`, `configuration/ConfigurationScreen.tsx`)
3. Verify V6_deliverable-specific files are preserved
4. Compare file counts before/after
