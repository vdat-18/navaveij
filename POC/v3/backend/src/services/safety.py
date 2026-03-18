import json

from loguru import logger

from baml_client.async_client import b


class ClinicalSafetyGuard:
    """Validates AI recommendations using an LLM-based Clinical Safety Critic via BAML."""

    async def validate(self, ai_output: dict, raw_context: dict, force_rule_based: bool = False) -> dict:
        """Perform safety validation using an LLM-based Critic via BAML.

        Analyzes the recommendation against the raw clinical context for safety and consistency.
        For Rule-Based mode, we skip LLM validation as clinical rules are pre-validated by hospital committee.
        """
        if force_rule_based:
            logger.info("Skipping BAML Safety Critic: Clinical Ruleset is pre-vetted and deterministic.")
            return {
                "is_safe": True,
                "critic_score": 100,
                "findings": "Bypassed LLM Critic: Deterministic clinical rules follow pre-approved hospital guidelines.",
                "suggested_correction": None,
            }

        logger.info("Engaging BAML Clinical Safety Critic")

        context_str = json.dumps(raw_context, indent=2)
        recommendation_str = json.dumps(ai_output, indent=2)

        result = await b.ValidateRecommendation(context=context_str, recommendation=recommendation_str)

        # Convert BAML response to dict
        output = {
            "is_safe": result.is_safe,
            "critic_score": result.critic_score,
            "findings": result.findings,
            "suggested_correction": result.suggested_correction,
        }

        if not output["is_safe"]:
            logger.warning("Clinical safety validation failed via BAML Critic.")
        else:
            logger.success("Clinical safety validation passed via BAML Critic.")

        return output
