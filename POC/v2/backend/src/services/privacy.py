"""PII Handling module for scrubbing sensitive fields."""

from typing import Any
from loguru import logger

# Fields identified as PII in the Navaveij healthcare context
PII_FIELDS = {
    "name",
    "first_name",
    "last_name",
    "birth_date",
    "date_of_birth",
    "phone",
    "email",
    "address",
    "mrn",
    "fhir_patient_id",
}


class PIIMasker:
    """Scrubs PII fields by replacing them with '-', indicating AI receives no PII."""

    def mask_value(self, field_name: str, value: Any) -> Any:
        """Replace a PII field value with '-'."""
        if not isinstance(value, str) or field_name.lower() not in PII_FIELDS:
            return value
        logger.debug(f"Scrubbed PII field '{field_name}'")
        return "-"

    def mask_data(self, data: Any) -> Any:
        """Recursively scrub PII fields in dictionaries and lists."""
        if isinstance(data, dict):
            return {
                key: self.mask_data(value) if key.lower() not in PII_FIELDS else self.mask_value(key, value)
                for key, value in data.items()
            }
        if isinstance(data, list):
            return [self.mask_data(item) for item in data]
        return data
