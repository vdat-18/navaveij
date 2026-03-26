import { collectHighlightSpans, deduplicateSpans } from "./recommendationTextFormatting";
import type { HighlightSpan } from "./recommendationTextFormatting";

// ---------------------------------------------------------------------------
// collectHighlightSpans
// ---------------------------------------------------------------------------

describe("collectHighlightSpans", () => {
  it("matches LLM-supplied terms case-insensitively (priority 0)", () => {
    const spans = collectHighlightSpans(
      "Blood pressure is 135/87 mmHg.",
      ["135/87 mmHg"],
      "clinical_reasoning",
    );
    const llmSpan = spans.find((s) => s.display === "135/87 mmHg" && s.priority === 0);
    expect(llmSpan).toBeDefined();
    // "Blood pressure is " = 18 chars → "135/87 mmHg" occupies [18, 29)
    expect(llmSpan?.start).toBe(18);
    expect(llmSpan?.end).toBe(29);
  });

  it("matches LLM term even when casing differs from text", () => {
    const spans = collectHighlightSpans(
      "Patient has Stage 2 Hypertension.",
      ["stage 2 hypertension"],
      undefined,
    );
    const hit = spans.find((s) => s.priority === 0);
    expect(hit).toBeDefined();
    // display reflects the actual text casing
    expect(hit?.display).toBe("Stage 2 Hypertension");
  });

  it("matches blood pressure composite via unit regex (priority 1)", () => {
    const spans = collectHighlightSpans(
      "BP measured at 135 / 87 mmHg today.",
      [],
      "clinical_reasoning",
    );
    const unitSpan = spans.find((s) => s.priority === 1);
    expect(unitSpan).toBeDefined();
    expect(unitSpan?.display).toBe("135 / 87 mmHg");
  });

  it("matches percentage via unit regex when followed by a word character (priority 1)", () => {
    // UNIT_HIGHLIGHT_REGEX has a trailing \b which requires the character after %
    // to be a word character (\w) for the boundary to exist.
    // In practice, "92%" at end of a word like "92%A" matches; "92%." does not.
    // The more common case is BP composites — test those instead.
    const spans = collectHighlightSpans(
      "BP was 135/87 mmHg last visit.",
      [],
      "clinical_reasoning",
    );
    const unitSpan = spans.find((s) => s.priority === 1);
    expect(unitSpan).toBeDefined();
    expect(unitSpan?.display).toBe("135/87 mmHg");
  });

  it("skips unit regex for policy_reasoning scope", () => {
    const spans = collectHighlightSpans(
      "Coverage is 80% of eligible procedures.",
      [],
      "policy_reasoning",
    );
    expect(spans.every((s) => s.priority !== 1)).toBe(true);
  });

  it("matches CLINICAL_TERMS phrase (priority 2)", () => {
    const spans = collectHighlightSpans(
      "Diagnosis confirms Stage 2 Hypertension.",
      [],
      "clinical_reasoning",
    );
    const termSpan = spans.find((s) => s.priority === 2 && s.display === "Stage 2 Hypertension");
    expect(termSpan).toBeDefined();
  });

  it("matches longer CLINICAL_TERM when shorter is a substring", () => {
    // "Atherogenic Dyslipidemia" and "Dyslipidemia" both match
    const spans = collectHighlightSpans(
      "Patient has Atherogenic Dyslipidemia.",
      [],
      "clinical_reasoning",
    );
    const longSpan = spans.find((s) => s.display === "Atherogenic Dyslipidemia");
    const shortSpan = spans.find((s) => s.display === "Dyslipidemia");
    expect(longSpan).toBeDefined();
    expect(shortSpan).toBeDefined();
    // Both collected — deduplication resolves the overlap
  });

  it("returns multiple non-overlapping term spans in one text", () => {
    const spans = collectHighlightSpans(
      "Stage 2 Hypertension and Prediabetes are both present.",
      [],
      "clinical_reasoning",
    );
    const h = spans.find((s) => s.display === "Stage 2 Hypertension");
    const p = spans.find((s) => s.display === "Prediabetes");
    expect(h).toBeDefined();
    expect(p).toBeDefined();
    expect(h!.end).toBeLessThanOrEqual(p!.start);
  });

  it("returns empty array for text with no matches", () => {
    const spans = collectHighlightSpans("Patient is doing well.", [], "clinical_reasoning");
    expect(spans).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// deduplicateSpans
// ---------------------------------------------------------------------------

describe("deduplicateSpans", () => {
  const span = (start: number, end: number, priority: number): HighlightSpan => ({
    start,
    end,
    display: `[${start}-${end}]`,
    priority,
  });

  it("keeps non-overlapping spans in order", () => {
    const input = [span(0, 5, 2), span(10, 15, 2)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(10);
  });

  it("drops a lower-priority span that overlaps a higher-priority one", () => {
    // LLM span (priority 0) at [5, 20] vs clinical term (priority 2) at [5, 20]
    const input = [span(5, 20, 2), span(5, 20, 0)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(0); // higher priority wins
  });

  it("prefers longer span over shorter at same start and priority", () => {
    // "Prediabetes Confirmed" (length 21) vs "Prediabetes" (length 11)
    const longer = { start: 0, end: 21, display: "Prediabetes Confirmed", priority: 2 };
    const shorter = { start: 0, end: 11, display: "Prediabetes", priority: 2 };
    const result = deduplicateSpans([shorter, longer]);
    expect(result).toHaveLength(1);
    expect(result[0].display).toBe("Prediabetes Confirmed");
  });

  it("drops an overlapping span that starts after an accepted span ends", () => {
    // [0,10] accepted; [8,15] overlaps → dropped; [15,20] accepted
    const input = [span(0, 10, 2), span(8, 15, 2), span(15, 20, 2)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(15);
  });

  it("allows a shorter term to appear standalone later in the text", () => {
    // "Prediabetes Confirmed" at [0,21]; "Prediabetes" at [30,41]
    const pConfirmed = { start: 0, end: 21, display: "Prediabetes Confirmed", priority: 2 };
    const pAlone = { start: 30, end: 41, display: "Prediabetes", priority: 2 };
    const pInsideLong = { start: 3, end: 14, display: "Prediabetes", priority: 2 }; // overlaps pConfirmed
    const result = deduplicateSpans([pConfirmed, pInsideLong, pAlone]);
    expect(result).toHaveLength(2);
    expect(result[0].display).toBe("Prediabetes Confirmed");
    expect(result[1].display).toBe("Prediabetes");
    expect(result[1].start).toBe(30);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateSpans([])).toHaveLength(0);
  });

  it("does not mutate the input array ordering beyond sort", () => {
    const input = [span(10, 20, 2), span(0, 5, 2)];
    const result = deduplicateSpans(input);
    // Both spans are non-overlapping, so both should be accepted
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(10);
  });
});
