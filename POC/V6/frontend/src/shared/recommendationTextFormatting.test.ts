import { collectHighlightSpans, deduplicateSpans } from "./recommendationTextFormatting";
import type { HighlightSpan } from "./recommendationTextFormatting";

// ---------------------------------------------------------------------------
// collectHighlightSpans
// All matching rules have moved to the backend; the FE function now only
// applies the API-supplied highlight_terms to find span positions in text.
// ---------------------------------------------------------------------------

describe("collectHighlightSpans", () => {
  it("matches an LLM-supplied term case-insensitively (priority 0)", () => {
    const spans = collectHighlightSpans(
      "Blood pressure is 135/87 mmHg.",
      ["135/87 mmHg"],
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
    );
    const hit = spans.find((s) => s.priority === 0);
    expect(hit).toBeDefined();
    // display reflects the actual text casing
    expect(hit?.display).toBe("Stage 2 Hypertension");
  });

  it("returns multiple non-overlapping spans for multiple supplied terms", () => {
    const spans = collectHighlightSpans(
      "Stage 2 Hypertension and Prediabetes are both present.",
      ["Stage 2 Hypertension", "Prediabetes"],
    );
    const h = spans.find((s) => s.display === "Stage 2 Hypertension");
    const p = spans.find((s) => s.display === "Prediabetes");
    expect(h).toBeDefined();
    expect(p).toBeDefined();
    expect(h!.end).toBeLessThanOrEqual(p!.start);
  });

  it("deduplicates repeated terms from highlightTerms", () => {
    const spans = collectHighlightSpans(
      "Hypertension confirmed.",
      ["Hypertension", "Hypertension"],
    );
    // Only one span for the single occurrence
    expect(spans.filter((s) => s.display === "Hypertension")).toHaveLength(1);
  });

  it("returns empty array when no terms supplied", () => {
    const spans = collectHighlightSpans("Patient is doing well.", []);
    expect(spans).toHaveLength(0);
  });

  it("returns empty array when supplied terms do not appear in text", () => {
    const spans = collectHighlightSpans("No matching terms here.", ["Stage 2 Hypertension"]);
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
    const input = [span(0, 5, 0), span(10, 15, 0)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(10);
  });

  it("drops a lower-priority span that overlaps a higher-priority one", () => {
    // priority 0 wins over priority 2 at same position
    const input = [span(5, 20, 2), span(5, 20, 0)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(0);
  });

  it("prefers longer span over shorter at same start and priority", () => {
    const longer = { start: 0, end: 21, display: "Prediabetes Confirmed", priority: 0 };
    const shorter = { start: 0, end: 11, display: "Prediabetes", priority: 0 };
    const result = deduplicateSpans([shorter, longer]);
    expect(result).toHaveLength(1);
    expect(result[0].display).toBe("Prediabetes Confirmed");
  });

  it("drops an overlapping span that starts before the accepted span ends", () => {
    // [0,10] accepted; [8,15] overlaps → dropped; [15,20] accepted
    const input = [span(0, 10, 0), span(8, 15, 0), span(15, 20, 0)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(15);
  });

  it("allows a shorter term to appear standalone later in the text", () => {
    const pConfirmed = { start: 0, end: 21, display: "Prediabetes Confirmed", priority: 0 };
    const pAlone = { start: 30, end: 41, display: "Prediabetes", priority: 0 };
    const pInsideLong = { start: 3, end: 14, display: "Prediabetes", priority: 0 }; // overlaps pConfirmed
    const result = deduplicateSpans([pConfirmed, pInsideLong, pAlone]);
    expect(result).toHaveLength(2);
    expect(result[0].display).toBe("Prediabetes Confirmed");
    expect(result[1].display).toBe("Prediabetes");
    expect(result[1].start).toBe(30);
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateSpans([])).toHaveLength(0);
  });

  it("accepts spans in any order and returns them sorted by start position", () => {
    const input = [span(10, 20, 0), span(0, 5, 0)];
    const result = deduplicateSpans(input);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].start).toBe(10);
  });
});
