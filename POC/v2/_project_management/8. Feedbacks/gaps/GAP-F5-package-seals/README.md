# GAP-F5 — Package Seal Avatars + Click-to-Reveal + Repeat at Bottom

**Title:** Tier-appropriate visual seals for packages; click-to-reveal detail; repeat at page bottom for consultation flow
**Status:** Not started
**Phase:** 1 (quick wins)

---

## Objective

Give each package tier a distinctive visual identity (Gold / Platinum / Diamond seal badge),
show the package prominently at the top of the recommendation panel with click-to-reveal
detail, and repeat the recommendation at the bottom as a consultation summary CTA so medical
staff see it at both the start and end of the consultation flow.

## Scope

1. Create `PackageSealBadge.tsx` — renders a styled medal/badge SVG in tier-appropriate treatment.
2. At the TOP of `RecommendationPanel.tsx`: prominent package hero block with seal, name, and
   click-to-reveal detail (what's included, price range, AI rationale).
3. At the BOTTOM: "Consultation Summary" block repeating the seal + package name +
   "Proceed with Recommendation" CTA button.
4. Detail reveal uses `useState` toggle with smooth height animation.

## Tier → Seal Mapping

| BAML Tier | Seal | Visual Treatment |
|-----------|------|-----------------|
| `Standard` | Gold Seal | Gold gradient badge |
| `Advanced` | Platinum Seal | Silver-blue gradient badge |
| `Premium` | Diamond Seal | Cyan/crystal gradient badge |

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/types/recommendation.ts` — `ai_recommended_tier: string` (already present)

## New Files

- `POC/v2/frontend/src/components/dashboard/PackageSealBadge.tsx`

## Design Decisions

- **Seal as SVG:** A styled SVG medal shape (circle with star/gem motif) gives the right
  "award" visual without requiring image assets. TailwindCSS gradient classes applied inline.
- **Repeat at bottom:** Client context — the medical consultant uses the dashboard during a
  patient consultation. Seeing the recommendation at the top orients the conversation;
  seeing it again at the bottom serves as a closing CTA before moving to the next step.
- **Click-to-reveal detail:** Package detail (inclusions, price, rationale) is hidden by
  default to keep the primary view clean. Expandable on click.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Package avatar needs to be more pretty (gold seal, platinum seal, diamond seal)"
`feedbacks.md` — "Repeat the package recommendations. Click to reveal package details."
