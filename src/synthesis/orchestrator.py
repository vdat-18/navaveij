"""Orchestrates the generation of synthetic Signal Store records using LLMs via BAML."""

import asyncio
import json
from pathlib import Path

from loguru import logger

from baml_client.async_client import b
from baml_client.types import ClinicalScenario, SignalStoreRecord

from src.synthesis.validator import validate_signal_store_record


class SynthesisOrchestrator:
    """Orchestrates the generation of synthetic Signal Store records using LLMs via BAML.

    Generates complete Signal Store DB records according to signal-store-contract.md v1.0,
    including hard_constraints, clinical_signals, and biomarker_trends sections.
    """

    def __init__(self, output_dir: str | None = None):
        """Initialize the orchestrator.

        Args:
            output_dir: Directory to save generated records. Defaults to src/mcp_server/data/synthetic
        """
        self.output_dir = Path(output_dir or "src/mcp_server/data/synthetic")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_scenario(self, scenario: ClinicalScenario, count: int = 1) -> None:
        """Generate N Signal Store records for a specific clinical scenario.

        Args:
            scenario: Clinical scenario to generate
            count: Number of records to generate per scenario
        """
        logger.info(f"Starting synthesis for scenario: {scenario} (Count: {count})")

        tasks = []
        for i in range(count):
            tasks.append(self._generate_single_record(scenario, i))

        await asyncio.gather(*tasks)
        logger.success(f"Completed scenario {scenario}")

    async def _generate_single_record(self, scenario: ClinicalScenario, index: int) -> None:
        """Generate a single Signal Store record and save it to disk.

        Args:
            scenario: Clinical scenario to generate
            index: Record index for filename uniqueness
        """
        record: SignalStoreRecord = await b.SynthesizeSignalStoreRecord(scenario=scenario)

        data = record.model_dump()

        # Transform field names to match Signal Store Contract (_schema, _meta)
        # BAML doesn't support field names starting with underscore, so we transform here
        if "schema_version" in data:
            data["_schema"] = data.pop("schema_version")
        if "metadata" in data:
            data["_meta"] = data.pop("metadata")

        # Validate against Signal Store Contract
        validate_signal_store_record(data)

        # Use deterministic but unique filenames
        filename = f"signal_store_{scenario.value.lower()}_{index:03d}.json"
        file_path = self.output_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.debug(f"Saved Signal Store record to {file_path}")

    async def generate_all_scenarios(self, count_per_scenario: int = 1) -> None:
        """Generate records for all defined ClinicalScenarios.

        Args:
            count_per_scenario: Number of records to generate per scenario
        """
        scenarios = [
            ClinicalScenario.HealthyRoutineCheckup,
            ClinicalScenario.UncontrolledHypertension,
            ClinicalScenario.MetabolicSyndromeRisk,
            ClinicalScenario.SeniorCancerScreeningGap,
            ClinicalScenario.EarlyOnsetDiabetes,
            ClinicalScenario.ChronicKidneyDiseaseProgression,
        ]

        logger.info(f"Generating Signal Store records for {len(scenarios)} scenarios...")
        for scenario in scenarios:
            await self.generate_scenario(scenario, count=count_per_scenario)
