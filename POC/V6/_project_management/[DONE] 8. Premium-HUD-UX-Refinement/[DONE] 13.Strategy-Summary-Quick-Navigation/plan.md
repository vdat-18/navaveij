# Plan — Implement Anchor Navigation

**Date:** 2026-03-25

## Strategy
1. Use React `useRef` to target the main HUD container.
2. Add a `scrollToHUD` function using `.scrollIntoView({ behavior: 'smooth' })`.
3. Make the summary card interactive with hover states.
