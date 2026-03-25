# Risk Summary Overlay Fix Plan

## Problem

The `Risk Summary` floating panel in the dashboard HUD is being visually hidden behind surrounding UI. The current implementation renders the panel as an absolutely positioned child inside the same rounded HUD card, while that card uses `overflow-hidden`. That means the panel can be clipped even when its own z-index is high. A secondary stacking risk exists with the sticky page header, which also uses `z-50`.

Relevant implementation points:

- `frontend/src/components/dashboard/RecommendationPanel.tsx`
- `frontend/src/app/page.tsx`

## Design Options

### Option A — Recommended: move the floating panel outside the clipping container

Keep the current compact floating-panel behavior, but render the panel outside the HUD card’s `overflow-hidden` boundary. The cleanest version is to anchor the trigger button with a ref, measure its viewport position, and render the floating panel in a non-clipped layer with a higher stacking level than the sticky header.

Why this is preferred:

- Fixes the actual clipping cause instead of only raising z-index
- Preserves the existing “small contextual summary” interaction
- Avoids weakening the card’s rounded-mask behavior for other HUD sections
- Gives room to add safe placement logic near viewport edges

### Option B — Faster but riskier: relax HUD overflow clipping

Remove or loosen `overflow-hidden` on the outer HUD card and keep clipping only where individual child sections need it.

Trade-offs:

- Smaller code change
- May visually leak gradients, shadows, or animated content outside the card
- Can introduce regressions in sections that currently rely on the outer rounded clipping

## Planned Implementation

I recommend Option A.

### Step 1 — Isolate the trigger and floating-layer responsibilities

Update `RecommendationPanel.tsx` so the `Risk Summary` trigger button has its own anchor ref and the open state remains controlled locally in the component. Keep the existing text generation and fallback indicator behavior unchanged.

### Step 2 — Render the summary panel outside the clipped HUD shell

Refactor the summary panel so it no longer lives inside the `overflow-hidden` HUD subtree. Render it in a non-clipped layer associated with the page/root content area, while preserving the current styling, motion entry/exit, and compact width.

### Step 3 — Add deterministic placement rules

Position the floating panel from the trigger’s bounding rectangle:

- Default to opening below the trigger
- Flip above when there is not enough room below
- Clamp horizontally so the panel stays inside the viewport
- Use a stacking level above the sticky header when necessary

### Step 4 — Preserve dismissal and accessibility behavior

Keep the existing toggle interaction and add robust close behavior for outside click and Escape so the floating panel behaves like a proper lightweight popover. Preserve `role="status"` only if it still matches the final interaction semantics; otherwise switch to a more appropriate dialog/popover-like role.

### Step 5 — Verify against the reported failure cases

Validate the fix in the dashboard by checking:

- The panel is fully visible over the HUD edge
- The panel is not hidden by the sticky header
- Narrow viewport behavior still keeps the panel on-screen
- The fallback note still appears when `risk_summary.is_fallback === true`
- Motion/transition behavior remains smooth

## Files Expected To Change During Execution

- `frontend/src/components/dashboard/RecommendationPanel.tsx`
- Possibly `frontend/src/app/page.tsx` only if a safer page-level stacking context is needed

## Verification Plan

- Run the frontend locally
- Open the dashboard state that shows `Risk Summary`
- Reproduce the overlap from the provided screenshot reference
- Confirm the summary panel remains fully visible across desktop and narrower widths
- Check for regressions in neighboring HUD sections and sticky header layering

## Expected Outcome

The `Risk Summary` panel remains fully visible and layered above surrounding dashboard UI without breaking the rounded HUD presentation.
