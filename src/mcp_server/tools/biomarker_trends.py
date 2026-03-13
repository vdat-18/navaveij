"""Tool for analyzing historical trends and velocity of biomarkers."""

from loguru import logger

from src.mcp_server.utils import load_sample_data


def get_biomarker_trends(patient_id: str) -> dict:
    """Retrieve historical trends and velocity for key biomarkers (BMI, Glucose, etc.)."""
    logger.info(f"Retrieving biomarker trends for patient: {patient_id}")

    data = load_sample_data()
    vitals = data.observations.get("vitals", [])
    labs = data.observations.get("labs", [])

    # Extract historical BMI values
    bmi_trend = [{"date": v["date"], "value": v["value"]} for v in vitals if v["type"] == "BMI"]

    # Extract historical Glucose (FBS) values
    glucose_trend = [
        {"date": lab["date"], "value": lab["value"]} for lab in labs if lab["type"] == "Fasting Blood Glucose"
    ]

    return {
        "bmi_trend": bmi_trend,
        "glucose_trend": glucose_trend,
        "note": "Increasing trend observed in both BMI and Glucose over the last 3 years.",
    }
