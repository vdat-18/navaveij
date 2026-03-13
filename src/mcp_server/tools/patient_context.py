"""Tool for retrieving patient demographic context."""

from loguru import logger
from src.mcp_server.utils import load_sample_data


def get_patient_context(patient_id: str) -> dict:
    """Retrieve full demographic context for a specific patient."""
    logger.info(f"Retrieving patient context for: {patient_id}")

    data = load_sample_data()
    patient = data.patient

    return {
        "name": patient.name,
        "gender": patient.gender,
        "age": patient.age,
        "birth_date": str(patient.birth_date),
        "mrn": patient.mrn,
        "fhir_patient_id": patient.fhir_patient_id,
    }
