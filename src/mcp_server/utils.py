"""Utility functions for data loading and clinical context management."""

import json
from pathlib import Path

from src.shared.schemas import ClinicalContextSchema

# Constants
SAMPLE_DATA_PATH = Path("doc_outputs/architecture/AI/Recommendation Engine/v3/samples/sample_patient_checkup.json")


def load_sample_data() -> ClinicalContextSchema:
    """Load and parse the sample patient data from the JSON file."""
    with open(SAMPLE_DATA_PATH) as f:
        data = json.load(f)
    return ClinicalContextSchema(**data)
