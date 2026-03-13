"""Tool for retrieving business rules for program selection."""

from loguru import logger


def get_program_ruleset() -> dict:
    """Retrieve current business rules for mapping signals to checkup program tiers."""
    logger.info("Retrieving program selection ruleset")

    return {
        "Standard": "Default for low-risk patients under 35.",
        "Advanced": "Recommended for age > 40 or presence of 1-2 mild clinical signals.",
        "Premium": (
            "Recommended for age > 50 or presence of multiple high-risk signals "
            "(e.g., Prediabetes + Hypertension)."
        ),
    }
