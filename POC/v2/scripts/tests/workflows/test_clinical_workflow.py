"""Tests for the Clinical Reasoning Workflow."""

from unittest.mock import AsyncMock, patch

import pytest

from src.services.workflows.base import WorkflowContext
from src.services.workflows.clinical import ClinicalReasoningWorkflow


@pytest.fixture
def mock_session():
    """Mock MCP Client session."""
    session = AsyncMock()
    session.call_tool = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_clinical_workflow_execution(mock_session):
    """Verify the full execution loop of the clinical workflow."""
    patient_id = "id_1aa1b504"
    patient_token = "tok_hmac_1aa1b504"

    # Mock MCP tool responses
    mock_session.call_tool.side_effect = [
        # fetch_baseline (2 tools)
        AsyncMock(
            content=[
                AsyncMock(
                    text='{"patient_demographics":{"gender":"male","age":35,"ethnicity":"asian"},"eligibility_exclusions":[]}'
                )
            ]
        ),
        # analyze_signals (1 tool)
        AsyncMock(
            content=[
                AsyncMock(
                    text='{"signals_fired":["signal_1"],"missing_signals":[],"rule_preliminary_tier":"Advanced"}'
                )
            ]
        ),
        # evaluate_trends (1 tool)
        AsyncMock(content=[AsyncMock(text='{"bmi":{"current":24.5}}')]),
        # ruleset (1 tool)
        AsyncMock(content=[AsyncMock(text='{"rule_preliminary_tier":"Advanced","add_on_library":[]}')]),
    ]

    # Mock BAML GenerateRecommendation
    mock_recommendation = AsyncMock()
    mock_recommendation.ai_recommended_tier.value = "Advanced"
    mock_recommendation.reasoning_trace = "Reasoning"
    mock_recommendation.additional_tests = ["Test A"]
    mock_recommendation.confidence_score = 0.95
    mock_recommendation.follow_up_advice = "Advice"

    with patch("baml_client.async_client.b.GenerateRecommendation", return_value=mock_recommendation):
        workflow = ClinicalReasoningWorkflow(mock_session)
        result = await workflow.execute(patient_id, patient_token=patient_token)

        assert isinstance(result, WorkflowContext)
        assert result.patient_id == patient_id
        assert result.ai_output["ai_recommended_tier"] == "Advanced"
        assert mock_session.call_tool.call_count == 4
        for call in mock_session.call_tool.call_args_list:
            assert "patient_token" in call.args[1]
