# Evidence Highlight Rules and Formatting Plan

## Scope

This plan covers the current behavior and proposed resolution for:

1. The evidence-highlight cards in the selected `div`
2. The inline text-highlighting chips seen in `Core Health Insights`
3. The whitespace/formatting issue shown in `/Users/nguyen.tran/Documents/GitHub/navavej/navaveij/image.png`
4. The specific case where `135/87 mmHg` is not highlighted while the surrounding text is

## Current Findings

### Exact source locations requested

#### Evidence highlight sentiment: where it is produced

The sentiment for the evidence cards is currently produced directly in frontend code, not by a separate backend field or service.

Current source:

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`
- helper: `getLineSentiment(line)`

Current logic location:

- [RecommendationPanel.tsx:L480-L488](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L480-L488)

What it does:

- lowercases the sentence
- checks hard-coded `badKeywords`
- checks hard-coded `goodKeywords`
- returns `bad`, `good`, or `neutral`

Important clarification:

- this is a **frontend asset**
- it does **not** call an LLM
- it does **not** call a backend endpoint
- it is currently a local keyword matcher embedded in the UI component

The evidence lines themselves are produced from `data.reasoning_trace` and then rendered through that sentiment helper:

- reasoning-trace cleanup/splitting: [RecommendationPanel.tsx:L832-L840](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L832-L840)
- sentiment applied during render: [RecommendationPanel.tsx:L1100-L1128](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L1100-L1128)

#### Inline text highlight regex: where it is stored

The inline highlight regex rules are also stored directly in frontend code inside `renderBoldText(...)`.

Current source:

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`

Rule locations:

- quote cleanup regex: [RecommendationPanel.tsx:L128-L129](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L128-L129)
- measurement/unit regex (`unitRegex`): [RecommendationPanel.tsx:L131-L133](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L131-L133)
- dictionary-term regex application: [RecommendationPanel.tsx:L135-L143](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L135-L143)
- snake_case clinical-token regex: [RecommendationPanel.tsx:L145-L145](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L145-L145)
- marker cleanup/fixup regexes: [RecommendationPanel.tsx:L147-L156](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L147-L156)
- final split regex for chip rendering: [RecommendationPanel.tsx:L163-L163](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx#L163-L163)

Related source:

- the clinical term dictionary used by this logic is in [clinical-dictionary.ts:L1-L65](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v5/frontend/src/shared/clinical-dictionary.ts#L1-L65)

#### Could the regex rules be modified separately from the code?

Not in the current implementation.

Today:

- sentiment keywords are embedded in `RecommendationPanel.tsx`
- highlight regex rules are embedded in `RecommendationPanel.tsx`
- dictionary mappings are embedded in `clinical-dictionary.ts`

So:

- they cannot currently be changed through a separate config file, CMS, JSON ruleset, or admin screen
- changing them today requires a code change

Possible future refactor, if desired:

- extract sentiment keywords into a dedicated constants/config module
- extract highlight regex patterns into a dedicated formatter-rules module
- optionally move dictionary and token rules into a standalone JSON or TS config file

## Architecture Assessment

### Sentiment classifier: current vs desired architecture

Current state:

- line-level sentiment is computed in the frontend inside `RecommendationPanel.tsx`
- it is purely deterministic keyword matching
- it is not an LLM task today

Assessment:

- this is not ideal architecture for a growing UI
- it couples presentation with classification logic
- it makes consistency and parallelization harder

Preferred direction:

- move sentiment production to the backend
- let the backend return structured line annotations together with recommendation text
- keep the frontend render-only

Best current backend fit:

- `POC/v5/backend/src/api/routes/contracts.py`
- specifically the existing Stage-2 normalization flow used by both `/recommend` and `/recommend/stream`

Why this is the right place:

- both sync and streaming recommendation responses already pass through backend normalization
- it allows one canonical sentiment decision instead of duplicating UI logic
- it can be parallelized or precomputed alongside recommendation shaping

Recommended backend response shape:

- annotated evidence lines such as `{ text, sentiment, highlights }`
- or a broader `text_annotations` / `communication_script_annotated` field

### Regex rules: current vs desired architecture

Current state:

- regex rules are embedded inside `renderBoldText(...)` in `RecommendationPanel.tsx`
- dictionary mappings are in `clinical-dictionary.ts`

Assessment:

- they are too tightly coupled to a very large component
- they are not independently maintainable today

Preferred direction:

- separate regex/token rules from `RecommendationPanel`
- extract them into either:
  - a dedicated frontend formatter module, or
  - preferably a backend normalization/config layer if the product wants centralized behavior

Best separation options:

#### Option 1 — Better short-term separation

- move regex helpers and dictionaries into dedicated frontend utility files
- keep behavior the same, but remove formatting logic from the panel

#### Option 2 — Recommended long-term separation

- move text normalization/highlight annotation to the backend
- store rules in dedicated backend config or rule modules
- have the frontend only render structured annotations

## Revised Recommendation

Given your feedback, the improved target architecture is:

1. **Backend-owned evidence sentiment**
   - no longer produced inside the panel
   - computed in backend normalization flow
   - returned as structured annotations

2. **RecommendationPanel becomes render-only**
   - no embedded keyword sentiment lists
   - no embedded formatting regex rules

3. **Regex/highlight rules separated from the panel**
   - immediate step: extract to dedicated module
   - better step: centralize in backend normalization/config

### 1. Evidence highlight cards: current rules

The selected evidence-highlight block is rendered from the `Clinical Logic & Rationale` section in:

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`

The line-level sentiment for each evidence sentence is determined by a sentiment classifier before rendering:

- Negative / risk-heavy lines use red styling
- Positive / reassuring lines use teal styling
- Neutral lines use gray styling

Current visual rules:

- **Bad / risk-heavy**
  - container: `bg-navavej-red/[0.03] border-navavej-red/10`
  - dot: `bg-navavej-red`
  - text: `text-navavej-red/90`
- **Good / reassuring**
  - container: `bg-navavej-teal/[0.03] border-navavej-teal/10`
  - dot: `bg-navavej-teal`
  - text: `text-navavej-teal/90`
- **Neutral**
  - container: `bg-navavej-gray-light/40 border-navavej-border/20`
  - dot: `bg-navavej-gray-med/60`
  - text: `text-navavej-gray-dark`

Important behavioral rule:

- These colors are sentence-level, not token-level
- A whole sentence card gets one sentiment treatment based on its content
- Individual inline chips inside the sentence are then colored separately by `renderBoldText`

### 2. Inline text highlights: current rules

Inline chips are generated by the `renderBoldText` helper in the same file.

Current chip-generation rules:

1. Remove quote characters
2. Auto-wrap measurement strings in `**...**` using a unit regex
3. Auto-wrap known clinical dictionary tokens in `**...**`
4. Auto-wrap snake_case clinical tokens in `**...**`
5. Split the string by `**...**` markers and render each marked segment as a chip

Current chip color rules:

- **Bad sentiment chip**
  - text: `text-navavej-red`
  - background/border: `bg-navavej-red/10 border-navavej-red/20`
- **Good sentiment chip**
  - text: `text-emerald-700`
  - background/border: `bg-emerald-50 border-emerald-100`
- **Neutral/default chip**
  - text: `text-navavej-teal`
  - background/border: `bg-navavej-teal/10 border-navavej-teal/20`

Current chip formatting rules:

- `inline-flex`
- `whitespace-nowrap`
- `mx-0.5`
- `px-1.5 py-0.5`
- rounded border chip styling

That means chips intentionally add side margins and refuse line-breaking inside themselves.

### 3. Why the whitespace looks wide

The wide spacing in the screenshot is most likely caused by a combination of:

- paragraph text using `text-justify`
- chips rendered as `inline-flex`
- chips adding `mx-0.5`
- some generated content already containing awkward spacing around punctuation and parentheses

This creates visible “gaps” around highlighted tokens, especially when the browser justifies the line and the chip cannot collapse or break naturally like normal text.

### 4. Why `135/87 mmHg` may not highlight

The current measurement regex supports:

- `140/90 mmHg`
- `5.5 mg/dL`
- `23%`

But it only matches a slash-form value when the slash has **no spaces around it**.

Likely failure cases:

- `135 / 87 mmHg`
- `135/87 mm Hg`
- text broken by extra punctuation or formatting markers

So if the source sentence becomes:

- `Stage 1 Hypertension (BP 135 / 87 mmHg)`

then `135/87 mmHg` no longer matches the current regex and does not become a chip.

## Design Options

### Option A — Recommended: normalize formatting without changing the overall visual language

Keep the current chip-based highlight style, but make it more robust and readable by:

- relaxing the measurement regex to accept spaces around `/`
- optionally accepting `mm Hg` as well as `mmHg`
- reducing artificial chip spacing
- avoiding justified text in chip-heavy paragraphs

Why this is preferred:

- preserves the current product look
- directly addresses the observed bug
- minimizes regression risk

### Option B — Broader typography refactor

Rework highlighted text rendering to use a more token-aware inline layout system with less dependence on regex and less reliance on paragraph justification.

Trade-offs:

- cleaner long-term typography behavior
- more invasive
- higher risk for other recommendation text blocks

## Recommended Resolution

I recommend **Option A**.

## Planned Implementation

### Step 1 — Document the current rule sets in code review notes

Before changing behavior, explicitly confirm the two layers of highlighting:

- sentence-level sentiment cards for evidence rows
- token-level chips for inline highlights

This ensures the final change preserves intended semantics while fixing formatting issues.

### Step 2 — Move evidence-line sentiment out of the panel

Refactor the architecture so the line-level sentiment classifier is no longer a frontend-local helper.

Planned direction:

- add backend-owned sentiment annotation in the recommendation normalization path
- return structured sentiment with the evidence lines
- remove frontend ownership of keyword classification

### Step 3 — Separate regex/highlight rules from `RecommendationPanel`

Extract inline highlight logic from the bloated panel into a dedicated rules/formatter layer.

Preferred sequence:

- first isolate the formatter logic into a dedicated module
- then, if approved in scope, move normalization responsibility to backend

### Step 4 — Update the inline measurement matching rules

Refine the measurement regex in `renderBoldText` so it supports:

- blood-pressure values with optional spaces around `/`
- common unit spacing variants where clinically appropriate

Primary target:

- make `135/87 mmHg` and `135 / 87 mmHg` highlight consistently

### Step 5 — Reduce awkward spacing around inline chips

Adjust chip formatting to reduce visible whitespace inflation:

- review `mx-0.5`
- review `inline-flex` usage
- review interaction with `whitespace-nowrap`

The goal is to preserve readable chips without creating exaggerated gaps around punctuation and adjacent text.

### Step 6 — Revisit justification for chip-heavy text blocks

For `Core Health Insights` and any similar blocks, assess whether `text-justify` should be replaced with left-aligned text where inline chips are heavily used.

Reason:

- justified text + non-breaking chips is the strongest likely cause of the “very wide whitespace” visible in the screenshot

### Step 7 — Keep evidence-card visual semantics stable while changing ownership

Do not materially alter the red/teal/gray meaning unless needed.

Change the ownership of sentiment production, not the meaning of the colors.

Expected preserved rules:

- red for risk-heavy lines
- teal for reassuring lines
- gray for neutral lines

This isolates the bug fix to inline-token behavior rather than reworking the broader evidence panel.

### Step 8 — Add focused regression checks

Add or update tests for:

- `135/87 mmHg` highlighting
- `135 / 87 mmHg` highlighting
- punctuation around highlighted values
- sentence rendering without malformed spacing side effects
- backend annotation behavior if sentiment is moved server-side

### Step 9 — Verify against the screenshot behavior

After implementation, validate that:

- highlighted values are consistently chip-rendered
- `Stage 1 Hypertension (BP 135/87 mmHg)` highlights the measurement correctly
- chip-heavy paragraphs no longer show exaggerated justification gaps
- existing good/bad/neutral color semantics still read correctly
- frontend no longer owns sentiment/regex logic if the backend-owned path is executed

## Likely Files To Change During Execution

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- likely new frontend formatter utility if doing the first separation step
- likely backend normalization files if moving sentiment/highlight annotation server-side, especially:
  - `POC/v5/backend/src/api/routes/contracts.py`
  - a new backend annotation/formatting helper module

## Expected Outcome

After execution:

- the evidence-card color rules remain clear and predictable
- the inline chip rules become easier to reason about
- blood-pressure values such as `135/87 mmHg` highlight consistently
- the wide whitespace issue in the screenshot is reduced or eliminated
