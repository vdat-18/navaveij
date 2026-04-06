from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.services.orchestrator import OrchestrationManager
from src.services.workflows.base import WorkflowContext


class _ClientContextManager:
    def __init__(self, session):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, exc_type, exc, tb):
        return None


@pytest.mark.asyncio
async def test_scope2_orchestrator_forwards_resolved_audit_identity():
    context = WorkflowContext(
        patient_id="id_test_001",
        raw_context={},
        masked_context={"get_biomarker_trends": {}, "get_clinical_signals": {}},
        ai_output={"recommendation_source": "AI", "add_ons": []},
        metadata={
            "active_client": "OpenAIClient",
            "model_id": "gpt-5.4-mini",
            "model_provider": "openai",
            "template_version": "openai-v1",
        },
        llm_call_records=[
            {
                "function_name": "AnalyzeClinicalRisks",
                "active_client": "OpenAIClient",
                "model_id": "gpt-5.4-mini",
                "template_version": "openai-v1",
                "prompt_template_key": "analyze_clinical_risks",
                "latency_ms": 11,
                "input_trace_masked": {
                    "system_prompt": "prompt::analyze",
                    "clinical_signals": {"signals_fired": ["bp_elevated"]},
                },
                "output_trace_masked": {
                    "severity_assessment": "Moderate risk requiring monitoring.",
                },
            },
            {
                "function_name": "WriteNarrative",
                "active_client": "OpenAIClient",
                "model_id": "gpt-5.4-mini",
                "template_version": "openai-v1",
                "prompt_template_key": "write_narrative",
                "latency_ms": 29,
                "input_trace_masked": {
                    "system_prompt": "prompt::narrative",
                    "risk_profile": {"severity_assessment": "Moderate risk requiring monitoring."},
                },
                "output_trace_masked": {
                    "summary_headline": "Elevated BP requires monitoring.",
                },
            },
        ],
    )
    workflow = Mock(execute=AsyncMock(return_value=context))
    session = Mock()

    with (
        patch(
            "src.services.orchestrator.MCPClientFactory.get_client",
            return_value=_ClientContextManager(session),
        ),
        patch(
            "src.services.orchestrator.ClinicalReasoningWorkflow",
            return_value=workflow,
        ),
    ):
        manager = OrchestrationManager()
        manager.safety_validator.validate_and_filter = Mock(
            return_value={"filtered_add_ons": [], "conflict_events": []}
        )
        manager.audit_logger.log_recommendation = Mock(return_value="hash_scope2")
        manager.audit_logger.log_llm_request = Mock(return_value="hash_llm")

        result = await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
            audit_context={"request_id": "req-scope2"},
        )

    assert manager.audit_logger.log_recommendation.call_args.kwargs["model_id"] == "gpt-5.4-mini"
    assert manager.audit_logger.log_recommendation.call_args.kwargs["model_provider"] == "openai"
    llm_calls = manager.audit_logger.log_llm_request.call_args_list
    assert len(llm_calls) == 2
    assert llm_calls[0].kwargs["active_client"] == "OpenAIClient"
    assert llm_calls[0].kwargs["model_id"] == "gpt-5.4-mini"
    assert llm_calls[0].kwargs["input_trace_masked"] == {
        "system_prompt": "prompt::analyze",
        "clinical_signals": {"signals_fired": ["bp_elevated"]},
    }
    assert llm_calls[0].kwargs["output_trace_masked"] == {
        "severity_assessment": "Moderate risk requiring monitoring.",
    }
    assert llm_calls[1].kwargs["latency_ms"] == 29
    assert result["metadata"]["template_version"] == "openai-v1"
