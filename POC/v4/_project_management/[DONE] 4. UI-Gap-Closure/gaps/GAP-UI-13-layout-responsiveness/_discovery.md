# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| Hardcoded sidebar layout coupling (`pl-64` vs `w-64`) | ✅ Replaced with shared `--sidebar-width` variable in layout + sidebar |
| Alert counts shown as ambiguous slash string | ✅ Replaced with labeled severity badges (Critical/High/Medium/Low) |
| LiveMetricsBar loading layout shift | ✅ Replaced with structure-matching skeleton to prevent CLS |
