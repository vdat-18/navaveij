"""Tool for retrieving non-negotiable medical constraints."""

from loguru import logger

from src.mcp_server.utils import load_sample_data


def get_hard_constraints(patient_id: str) -> list[str]:
    """Retrieve non-negotiable medical constraints for a specific patient."""
    logger.info(f"Retrieving hard constraints for patient: {patient_id}")

    # Logic based on gender/age from sample data
    data = load_sample_data()
    constraints = []

    if data.patient.gender.lower() == "male":
        constraints.append("Gender-specific: Exclude female-only screenings (e.g., Mammogram, Pap Smear).")

    if data.patient.age >= 50:
        constraints.append("Age-specific: Mandatory Colonoscopy screening recommended every 5-10 years.")

    return constraints
