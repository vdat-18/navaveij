# Discovery — GAP-F11

**Status:** Complete (pre-implementation analysis)

## Current State

- The overall palette is dominated by Navavej teal (#00ABC7) and light gray backgrounds.
- Risk status badges use pastel/muted colors: soft red, soft orange, soft yellow, soft green.
- CTA buttons (Approve, Reject, Generate Recommendation) use ghost/outline or medium-weight
  fills — not visually dominant.
- Cards use `rounded-2xl` and generous padding (`p-6`), creating a soft, spacious feel.
- Typography for metric values uses `font-medium` or `font-semibold` — not bold enough
  for high-urgency readings.
- Section headers are mixed styles — not consistently uppercase/tracked.

## Target Tone

"Urgent clinical alert" aesthetic:
- High-contrast, saturated risk colors (not pastels)
- Bold/black typography on key metrics
- Tighter card padding — less whitespace, more purposeful density
- Solid-fill primary CTAs with strong box-shadow
- Reduced border-radius on alert/risk cards
- Active ring border on High/Critical risk cards

## Scope of Changes

| Element | Current | Target |
|---------|---------|--------|
| Risk badge colors | Pastel (soft-red, soft-amber) | Saturated (red-500, amber-500, solid fill) |
| Metric typography | `font-medium`, `font-semibold` | `font-bold`, `font-black` |
| Card padding | `p-6` | `p-4` |
| CTA buttons | Ghost/outline or medium fill | Solid fill + `shadow-md` |
| Card border-radius (alert) | `rounded-2xl` | `rounded-lg` |
| Section headers | Mixed | `uppercase tracking-wider text-xs font-bold` |
| Critical card border | None | `ring-2 ring-red-500` |

## Risk Flags

- This is a cross-cutting change affecting many components. Apply in Phase 3 (last) to
  avoid rework during feature development phases.
- Changing `p-6` → `p-4` may break some component internal alignment if elements depend
  on the padding for visual separation. Verify each affected card layout.
- Tailwind config changes (if custom color tokens are updated) affect all usages globally —
  test all 3 screens after applying.
