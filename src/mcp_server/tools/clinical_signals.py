"""Tool for retrieving pre-computed clinical risk signals."""

from loguru import logger

from src.mcp_server.utils import load_sample_data


def get_clinical_signals(patient_id: str) -> dict:
    """Retrieve pre-computed clinical risk signals and abnormality triggers."""
    logger.info(f"Retrieving clinical signals for patient: {patient_id}")

    # Mocking signal engine output based on known sample conditions
    data = load_sample_data()
    signals = {
        "prediabetes_alert": any(c.id == "cond-prediabetes" for c in data.conditions),
        "dyslipidemia_alert": any(c.id == "cond-dyslipidemia" for c in data.conditions),
        "hypertension_alert": any(c.id == "cond-hypertension" for c in data.conditions),
        "obesity_risk": "High" if data.observations["vitals"][0]["value"] > 25 else "Normal",
    }
    return signals
