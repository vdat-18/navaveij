# POC v5 Touch-ups Plan

## Scope

This plan combines the previous requirement and the newly added UI touch-ups for `/Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5`.

Included items:

1. Fix the `Risk Summary` panel so it is no longer hidden behind surrounding UI
2. Audit whether the selected `div` / `span` / `span` elements are placeholder or hard-coded
3. Rename the selected `h4` label to `Medical Screening Add-ons`
4. Replace textual severity suffixes like `(Red)`, `(Yellow)`, `(Orange)` with real visual color treatment
5. Track these touch-ups against `/Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/_project_management/_merging_v2_n_v4/touch-ups`

## Discovery Outcomes

### Confirmed hard-coded elements

These selected UI labels are currently hard-coded literal JSX strings in `frontend/src/components/dashboard/RecommendationPanel.tsx`:

- `Safety OK`
- `Integrity: Valid`
- `Logic: Verified`
- `Special Highlights`
- `Strategic Add-ons`

### Data-driven elements

These visible content areas are not placeholders; they are rendered from recommendation payload data:

- The items under `Special Highlights`
- The add-on content list in the right-hand add-ons column
- Recommendation narrative sections sourced from `data.communication_script`

That means the section titles are hard-coded, but most of the content under them is data-driven.

### Project-management path status

The touch-ups directory currently appears empty:

- `/Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/_project_management/_merging_v2_n_v4/touch-ups`

## Relevant Implementation Targets

- `frontend/src/components/dashboard/RecommendationPanel.tsx`
- Possibly `frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- Possibly supporting documentation under the touch-ups project-management path after execution is allowed

## Design Options

### Option A — Recommended

Keep the current layout structure, but refine the existing UI semantics:

- Keep the `Risk Summary` interaction as a compact contextual overlay
- Rename hard-coded labels in place
- Replace textual severity suffixes with styled semantic color treatment in the existing highlight list
- Keep the recommendation payload contract unchanged unless a stronger backend severity field is needed

Why this is preferred:

- Lowest risk to overall layout
- Fastest path to clearer UX
- Preserves existing data flow
- Avoids unnecessary backend contract changes unless severity metadata is missing

### Option B — Stronger semantic refactor

Convert the highlight and validation badges into small reusable status components with structured severity mapping:

- Centralize status badge styling
- Normalize severity parsing from strings into UI tokens
- Apply the same visual language across `Safety OK`, `Integrity: Valid`, `Logic: Verified`, and the highlight list

Trade-offs:

- More consistent system-wide result
- Higher implementation scope
- Slightly more regression surface than the focused in-place refinement

## Planned Resolution

I recommend **Option A**, with light internal helper extraction only where needed.

### Step 1 — Re-open and resolve the `Risk Summary` visibility issue

Update the `Risk Summary` overlay behavior in `RecommendationPanel.tsx` so it remains visible above nearby content without being clipped by the HUD card. Prefer a placement strategy that works within the current component structure and avoids hidden/failed render states.

Implementation target:

- Keep the interaction discoverable and reliable on desktop
- Ensure the overlay is actually visible when the button is clicked
- Verify it no longer sits behind adjacent content

### Step 2 — Replace hard-coded validation badge copy with explicit product-ready wording

Review the three selected status labels:

- `Safety OK`
- `Integrity: Valid`
- `Logic: Verified`

Resolve whether they should remain static status badges or become data-driven. If no backend state exists for them, keep them intentionally static but rename/re-style them so they are clearly product UI, not placeholders.

Expected outcome:

- No ambiguous “prototype-looking” wording
- Clear decision documented in code and touch-up notes

### Step 3 — Rename `Strategic Add-ons` to `Medical Screening Add-ons`

Update the hard-coded `h4` label in `RecommendationPanel.tsx`:

- From `Strategic Add-ons`
- To `Medical Screening Add-ons`

Also verify whether any nearby references or test expectations depend on the old label.

### Step 4 — Replace textual severity suffixes with real visual color semantics

Refactor the `Special Highlights` list so strings like:

- `(Red)`
- `(Yellow)`
- `(Orange)`

are no longer shown as literal text to the user.

Preferred UX treatment:

- Parse known severity suffixes from highlight text
- Strip the suffix from the display copy
- Render the severity via actual color styling

Recommended visual pattern:

- Red highlight text/accent for critical items
- Amber/orange accent for caution items
- Yellow/gold accent for moderate items
- Neutral fallback when no severity suffix is present

### Step 5 — Keep data flow stable unless severity metadata is missing

Before changing contracts, first implement the color system by parsing existing display strings already returned in `add_on_highlights`. Only escalate to backend contract changes if the current payload is too inconsistent to support deterministic UI mapping.

This keeps the first pass frontend-only unless evidence shows otherwise.

### Step 6 — Add touch-up tracking artifacts

Once execution is allowed, add/update documentation under:

- `/Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/_project_management/_merging_v2_n_v4/touch-ups`

Recommended artifacts:

- A brief touch-up plan or summary file
- A short outcomes note covering what was hard-coded, what stayed static by design, and what UX text/colors were changed

### Step 7 — Verify the final UI behavior

Validation after implementation should include:

- Clicking `Risk Summary` visibly opens the panel
- The panel is not clipped or hidden behind neighboring UI
- `Medical Screening Add-ons` appears correctly
- Highlight items no longer display literal `(Red)/(Yellow)/(Orange)` suffixes
- Visual colors map correctly and remain legible
- No obvious regression in the surrounding recommendation panel

## File-Level Execution Plan

### Primary file

`frontend/src/components/dashboard/RecommendationPanel.tsx`

Planned edits:

- Fix the `Risk Summary` popover behavior
- Update selected hard-coded badge copy as needed
- Rename `Strategic Add-ons`
- Parse and visually encode highlight severities

### Supporting verification file

`frontend/src/components/dashboard/RecommendationPanel.test.tsx`

Potential updates:

- Add or revise assertions for renamed labels
- Add regression coverage for highlight rendering behavior if practical

### Documentation path

`POC/v5/_project_management/_merging_v2_n_v4/touch-ups`

Potential additions after approval:

- Touch-up summary/outcome notes

## Expected Outcomes

After execution, the UI should behave and read more intentionally:

- `Risk Summary` becomes visible and reliable
- The questioned labels are clearly identified as either static product badges or true dynamic data
- `Strategic Add-ons` becomes `Medical Screening Add-ons`
- Severity is communicated visually instead of with raw suffix text
- Touch-up outcomes are documented in the project-management area
