# Discovery

**Verified:** 2026-03-19

| Item | Status |
|---|---|
| Stray duplicate `Search` import pattern | ✅ Removed bottom-of-file import and consolidated to top import list |
| Static options wrapped in component-level memo | ✅ Replaced with module-level constant in `AuditLogSearchPanel.tsx` |
| Non-interactive card hover-scale inconsistency | ✅ Removed hover scale from non-clickable lab cards |
| Alert pulse on low-value lab states | ✅ Restricted pulse animation to high (`interpretation === "H"`) state only |
| Unknown diagnosis fallback status | ✅ Replaced `"active"` fallback with `"unknown"` |
