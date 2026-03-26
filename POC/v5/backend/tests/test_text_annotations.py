from src.services.text_annotations import annotate_reasoning_lines_fallback


def test_annotate_reasoning_lines_fallback_classifies_sentiment_and_includes_policy():
    clinical_lines = [
        "* Normal BMI for Asian profile – no obesity-related risk.",
        "- Blood pressure within guideline target – no hypertension.",
        "* Colonoscopy overdue > 8 years (screening gap).",
    ]
    policy_reasoning = "Policy Reasoning: package selection aligns with screening goals."

    annotated = annotate_reasoning_lines_fallback(clinical_lines, policy_reasoning)

    assert annotated == [
        {
            "text": "Normal BMI for Asian profile – no obesity-related risk.",
            "scope": "clinical_reasoning",
            "sentiment": "risk",
            "highlight_terms": [],
        },
        {
            "text": "Blood pressure within guideline target – no hypertension.",
            "scope": "clinical_reasoning",
            "sentiment": "neutral",
            "highlight_terms": [],
        },
        {
            "text": "Colonoscopy overdue > 8 years (screening gap).",
            "scope": "clinical_reasoning",
            "sentiment": "risk",
            "highlight_terms": [],
        },
        {
            "text": "package selection aligns with screening goals.",
            "scope": "policy_reasoning",
            "sentiment": "informational",
            "highlight_terms": [],
        },
    ]


def test_annotate_reasoning_lines_fallback_returns_empty_for_blank_inputs():
    assert annotate_reasoning_lines_fallback([], "") == []
