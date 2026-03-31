# Enhancement 15: Screening & Vaccination Gap Status — Hover-reveal UX

## 1. Description
Refactored `ScreeningGapStatus.tsx` to shift from an always-expanded card layout to a compact, hover-driven information-reveal pattern. This is consistent with the Strategic Add-ons UX pattern introduced in Enhancement 14.

## 2. Key Changes

### Default State (Collapsed)
- Each gap item now shows only the **test/vaccine name** and a **colored priority dot**.
- Dot for `red`/`critical` priority now pulses (`animate-pulse`) to draw attention.
- Dot size reduced to `w-1.5 h-1.5` for a cleaner, less distracting indicator.
- Card padding reduced to `p-3 px-4` (previously `p-4`).

### Hover State (Expanded)
- On hover, a hidden `div` expands via CSS `max-h-0 → max-h-48` and `opacity-0 → opacity-100`.
- Revealed content includes:
  - **Status grid** (Overdue days on left, Last performed date on right) with `text-[8px]` uppercase labels.
  - **Notes** (if present) with italic text, `font-medium`, and a teal left-border accent (`border-l-2 border-navavej-teal/20 pl-3`).
- Transition: `duration-500 ease-in-out` for smooth expansion.
- Card shows `hover:shadow-lg` on hover for visual feedback.
- Cursor changed to `cursor-help` to hint interactivity.

### Existing Color-frame System (Preserved from Previous Enhancement)
- `priorityStyles()` function returns border + background tint per priority level.
- Red/Orange/Yellow/Green frames are maintained.

## 3. Files Changed
- `frontend/src/components/trend-timeline/ScreeningGapStatus.tsx`

## 4. Impact
- Reduces default vertical space of the Screening & Vaccination section by ~50%.
- Full clinical detail still accessible on hover, preserving physician workflow.
- Consistent UX pattern with Strategic Add-ons for a cohesive Dashboard experience.
