from types import SimpleNamespace
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


def _build_context() -> WorkflowContext:
    return WorkflowContext(
        patient_id="id_test_001",
        raw_context={"risk": "test"},
        masked_context={
            "get_biomarker_trends": {"trend_flag": "up"},
            "get_clinical_signals": {"signals_fired": ["S1"]},
        },
        ai_output={
            "reasoning_trace": "Patient token tok_abcd1234 requires follow-up.",
            "recommendation_source": "RuleBased",
            "add_ons": [
                {"item_id": "AON001", "priority": "Yellow", "rationale": "keep"},
                {"item_id": "AON002", "priority": "Red", "rationale": "drop"},
            ],
        },
        rehydration_map={"tok_abcd1234": "Jane Doe"},
    )


@pytest.mark.asyncio
async def test_orchestrator_passes_force_rule_based_to_workflow():
    context = _build_context()
    workflow = SimpleNamespace(execute=AsyncMock(return_value=context))
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
        manager.audit_logger.log_recommendation = Mock(return_value="hash_mig3")
        result = await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
            force_rule_based=True,
        )

    workflow.execute.assert_awaited_once_with(
        "id_test_001",
        patient_token="tok_hmac_test_001",
        force_rule_based=True,
        on_stage=None,
    )
    assert result["recommendation_hash"] == "hash_mig3"
    assert result["recommendation_source"] == "RuleBased"


@pytest.mark.asyncio
async def test_orchestrator_injects_security_metadata_after_final_rehydration():
    context = _build_context()
    workflow = SimpleNamespace(execute=AsyncMock(return_value=context))
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
        manager.audit_logger.log_recommendation = Mock(return_value="hash_mig3")
        result = await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
        )

    assert result["reasoning_trace"] == "Patient token Jane Doe requires follow-up."
    assert result["biomarker_trends"] == {"trend_flag": "up"}
    assert result["clinical_signals"] == {"signals_fired": ["S1"]}
    assert result["security_metadata"]["rehydration_map"] == {"tok_abcd1234": "Jane Doe"}
    assert result["security_metadata"]["masked_ai_output"]["reasoning_trace"] == (
        "Patient token tok_abcd1234 requires follow-up."
    )
    assert result["security_metadata"]["is_poc_demo"] is True


@pytest.mark.asyncio
async def test_orchestrator_applies_safety_filtered_add_ons_and_forwards_conflicts():
    context = _build_context()
    workflow = SimpleNamespace(execute=AsyncMock(return_value=context))
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
            return_value={
                "filtered_add_ons": [{"item_id": "AON001", "priority": "Yellow", "rationale": "keep"}],
                "conflict_events": [{"event_type": "safety_add_on_removed", "item_id": "AON002"}],
            }
        )
        manager.audit_logger.log_recommendation = Mock(return_value="hash_mig3")
        result = await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
        )

    assert len(result["add_ons"]) == 1
    assert result["add_ons"][0]["item_id"] == "AON001"
    assert manager.audit_logger.log_recommendation.call_args.kwargs["safety_conflict_events"] == [
        {"event_type": "safety_add_on_removed", "item_id": "AON002"}
    ]


@pytest.mark.asyncio
async def test_orchestrator_forwards_audit_context_dimensions():
    context = _build_context()
    workflow = SimpleNamespace(execute=AsyncMock(return_value=context))
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
            return_value={"filtered_add_ons": context.ai_output["add_ons"], "conflict_events": []}
        )
        manager.audit_logger.log_recommendation = Mock(return_value="hash_mig3")
        await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
            audit_context={
                "user_id": "usr-1",
                "user_role": "physician",
                "client_ip": "127.0.0.1",
                "request_id": "req-123",
                "action_type": "GenerateRecommendation",
            },
        )

    kwargs = manager.audit_logger.log_recommendation.call_args.kwargs
    assert kwargs["user_id"] == "usr-1"
    assert kwargs["user_role"] == "physician"
    assert kwargs["client_ip"] == "127.0.0.1"
    assert kwargs["request_id"] == "req-123"
    assert kwargs["action_type"] == "GenerateRecommendation"


@pytest.mark.asyncio
async def test_orchestrator_retries_rule_based_when_primary_path_raises():
    context = _build_context()
    workflow = SimpleNamespace(execute=AsyncMock(side_effect=[Exception("llm down"), context]))
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
            return_value={"filtered_add_ons": context.ai_output["add_ons"], "conflict_events": []}
        )
        manager.audit_logger.log_recommendation = Mock(return_value="hash_mig3")
        await manager.generate_recommendation(
            patient_id="id_test_001",
            patient_token="tok_hmac_test_001",
        )

    assert workflow.execute.await_count == 2
    first_call = workflow.execute.await_args_list[0].kwargs
    second_call = workflow.execute.await_args_list[1].kwargs
    assert first_call["force_rule_based"] is False
    assert second_call["force_rule_based"] is True
