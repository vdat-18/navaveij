from src.services.text_annotations import annotate_reasoning_lines


def test_annotate_reasoning_lines_filters_policy_and_classifies_sentiment():
    reasoning_trace = "\n".join(
        [
            "* Normal BMI for Asian profile – no obesity-related risk.",
            "- Blood pressure within guideline target – no hypertension.",
            "Policy Reasoning: package selection aligns with screening goals.",
            "* Colonoscopy overdue > 8 years (screening gap).",
        ]
    )

    annotated = annotate_reasoning_lines(reasoning_trace)

    assert annotated == [
        {
            "text": "Normal BMI for Asian profile – no obesity-related risk.",
            "sentiment": "bad",
        },
        {
            "text": "Blood pressure within guideline target – no hypertension.",
            "sentiment": "neutral",
        },
        {
            "text": "Colonoscopy overdue > 8 years (screening gap).",
            "sentiment": "bad",
        },
    ]


def test_annotate_reasoning_lines_returns_empty_for_blank_trace():
    assert annotate_reasoning_lines("") == []
