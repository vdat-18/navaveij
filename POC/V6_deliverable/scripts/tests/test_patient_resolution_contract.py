import json
from pathlib import Path

import src.mcp_server.tools.biomarker_trends as biomarker_trends_module
import src.mcp_server.tools.clinical_signals as clinical_signals_module
import src.mcp_server.tools.hard_constraints as hard_constraints_module
import src.mcp_server.tools.patient_event_timeline as patient_event_timeline_module
import src.mcp_server.tools.program_ruleset as program_ruleset_module
from src.mcp_server.tools.biomarker_trends import get_biomarker_trends
from src.mcp_server.tools.clinical_signals import get_clinical_signals
from src.mcp_server.tools.hard_constraints import get_hard_constraints
from src.mcp_server.tools.patient_event_timeline import get_patient_event_timeline
from src.mcp_server.tools.program_ruleset import get_program_ruleset

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _first_registry_patient() -> dict:
    registry = json.loads((PROJECT_ROOT / "assets/patient_registry.json").read_text(encoding="utf-8"))
    return registry[0]


def test_mcp_tools_accept_patient_token_only():
    patient = _first_registry_patient()
    patient_token = patient["patient_token"]

    constraints = get_hard_constraints(patient_token)
    signals = get_clinical_signals(patient_token)
    trends = get_biomarker_trends(patient_token)
    ruleset = get_program_ruleset(patient_token)
    timeline = get_patient_event_timeline(patient_token)

    assert constraints.get("patient_token") == patient_token
    assert signals.get("pipeline_run_id")
    assert "bmi" in trends
    assert ruleset.get("resolved_package", {}).get("package_code")
    assert timeline.get("patient_token") == patient_token


def test_mcp_tools_accept_patient_token_and_patient_id():
    patient = _first_registry_patient()
    patient_token = patient["patient_token"]
    patient_id = patient["patient_id"]

    constraints = get_hard_constraints(patient_token, patient_id=patient_id)
    signals = get_clinical_signals(patient_token, patient_id=patient_id)
    trends = get_biomarker_trends(patient_token, patient_id=patient_id)
    ruleset = get_program_ruleset(patient_token, patient_id=patient_id)
    timeline = get_patient_event_timeline(patient_token, patient_id=patient_id)

    assert constraints.get("patient_token") == patient_token
    assert signals.get("pipeline_run_id")
    assert "bmi" in trends
    assert ruleset.get("resolved_package", {}).get("package_code")
    assert timeline.get("patient_token") == patient_token


def test_mcp_tools_derive_patient_id_before_signal_store_lookup(monkeypatch):
    patient = _first_registry_patient()
    patient_token = patient["patient_token"]
    patient_id = patient["patient_id"]
    observed_patient_ids: list[str | None] = []

    def fake_load_signal_store_record(*, patient_token: str | None = None, patient_id: str | None = None):
        observed_patient_ids.append(patient_id)
        return {
            "hard_constraints": {
                "patient_token": patient_token,
                "patient_demographics": {"gender": "male", "age": 35},
            },
            "clinical_signals": {
                "rule_preliminary_tier": "Standard",
                "signals_fired": [],
                "pipeline_run_id": "pipe_test",
            },
            "biomarker_trends": {"bmi": {}},
        }

    monkeypatch.setattr(hard_constraints_module, "load_signal_store_record", fake_load_signal_store_record)
    monkeypatch.setattr(clinical_signals_module, "load_signal_store_record", fake_load_signal_store_record)
    monkeypatch.setattr(biomarker_trends_module, "load_signal_store_record", fake_load_signal_store_record)
    monkeypatch.setattr(program_ruleset_module, "load_signal_store_record", fake_load_signal_store_record)
    monkeypatch.setattr(patient_event_timeline_module, "load_signal_store_record", fake_load_signal_store_record)

    get_hard_constraints(patient_token)
    get_clinical_signals(patient_token)
    get_biomarker_trends(patient_token)
    get_program_ruleset(patient_token)
    get_patient_event_timeline(patient_token)

    assert observed_patient_ids == [patient_id, patient_id, patient_id, patient_id, patient_id]
