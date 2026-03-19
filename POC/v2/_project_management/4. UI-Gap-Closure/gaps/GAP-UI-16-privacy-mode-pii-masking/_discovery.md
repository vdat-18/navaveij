# Discovery

**Identified:** 2026-03-19 (verification audit — new gap, not in original audit)
**Verified:** 2026-03-19

| Area | Status |
|---|---|
| Cross-route consistency | ✅ Privacy mode is shared via a root provider and persisted across navigation |
| Patient list PII | ✅ Patient names are hidden in privacy mode (masked list labels) |
| Dashboard demographics | ✅ Demographics show `"— / — / —"` in privacy mode |
| Trend header identifiers | ✅ Trend subtitle shows `"De-identified Patient • —"` in privacy mode |
| Recommendation package details | ✅ Package name and price are masked in privacy mode |
| Recommendation critical signals | ✅ Alert label/subtitle/value are masked in privacy mode |
| "Last Analysis Run" value | ✅ Shows placeholder (`"—"`) in privacy mode |

**Notes:** Privacy mode is explicitly labeled as partial de-identification to align with POC constraints.
