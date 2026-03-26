# Enhancement 14: Discount Feature Integration & 7/5 Layout Transformation

## 1. Description
Comprehensive refactor of the `RecommendationPanel` to introduce horizontal space utilization, seamlessly integrating real-time discount (Privilege) and Add-on pricing logic with the physician's final decision module.

## 2. Key Changes

### Grid-Based Split Layout (7/12 & 5/12)
- Transformed the panel from a stacked vertical layout to a horizontal layout separating **Billing Resolution** (left: 7 columns) and **Final Review** (right: 5 columns).
- Puts clinical reasoning and final financial outcome on the same vertical viewing plane, preventing unnecessary scrolling.

### Integrated execution workflow
- Shifted the decision buttons (Confirm Strategy, Reject) and immediate clinical context (Internal Notes, validation checklists) directly into the right-hand **Final Review** column.
- Styled the execution panel with a dark aesthetic, highlighted by a **shimmering** "Confirm Strategy" button and a highly visible "Reject" button (red background, icon).

### Real-time Discount & Add-on Logic
- Implemented real-time dynamic total estimation that aggregates base package price, selected add-ons, bundled deductions, and percentage-based discounts.
- Highlighted "Saved" amounts and crossed-out original prices with an `emerald-400` color for immediate financial impact.
- Placed "Privileges" prominently in the Billing Resolution panel with its own sub-menu toggle.

### Legibility, Typography & Aesthetics
- Refined `renderBoldText()` function to remove surrounding background and border classes from bold text strings. Clinical indicators now render purely as heavy-weight (`font-black`) colored text.
- Overhauled dark mode text classes from recessed opacity values (e.g. `text-white/40`) to high-visibility pure white (`text-white/80` or `text-[9px] text-white/90`) so headings like "Final Settlement" and "Clinical Justification" stand out properly on dark backgrounds.
- Converted input fields (textarea) to utilize glassmorphism effects (`bg-white/[0.08]`) to deepen the HUD aesthetic without hurting readability.

## 3. Impact
- **Consultation Velocity**: The layout drastically reduces scrolling. Physicians can scan packages, add-ons, privileges, and finalize the decision from the same viewport.
- **Improved Hierarchy**: Clean bolding without background chips makes long blocks of text completely legible.
- **Financial Clarity**: Shows clear impact of toggleable Add-Ons and Discounts instantly on total and "Saved" amounts, establishing the dashboard as a powerful sales/consultation instrument.
