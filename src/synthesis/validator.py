"""Signal Store record validation against signal-store-contract.md."""

from loguru import logger

# Complete Signal ID Catalog from signal-store-contract.md Field Dictionary
VALID_SIGNAL_IDS = {
    # Lab signals (11)
    "fbs_status",
    "hba1c_status",
    "ldl_status",
    "hdl_status",
    "tg_status",
    "alt_status",
    "ast_status",
    "egfr_status",
    "tsh_status",
    "psa_sdm_status",  # male only
    "uric_acid_status",
    # Vital signals (2)
    "bp_category",
    "bmi_status",
    # Screening gaps (7)
    "colonoscopy_screening_gap",
    "mammogram_screening_gap",  # female only
    "pap_smear_screening_gap",  # female 21-65
    "lung_ldct_gap",
    "dexa_screening_gap",  # female ≥65
    "est_gap",
    "echo_gap",
    # Vaccination (5)
    "influenza_vaccination_gap",
    "hepatitis_b_vaccination_status",
    "hpv_vaccination_gap",  # ≤45
    "pneumococcal_vaccination_gap",  # ≥65
    "shingrix_vaccination_gap",  # ≥50
    # Family history (4)
    "family_hx_premature_cad",
    "family_hx_breast_ca",  # female
    "family_hx_colon_ca",
    "family_hx_prostate_ca",  # male
    # Behavioral (4)
    "smoking_status",
    "lung_ct_threshold",
    "alcohol_risk",
    "occupational_risk",
    # Comorbidity (4)
    "dm_comorbidity",
    "htn_comorbidity",
    "ckd_comorbidity",
    "dyslipidemia_comorbidity",
    # Computed (3)
    "ascvd_10yr_risk_status",
    "dm_organ_complication_screening",
    "fibroscan_indication",
    # Other (4)
    "reproductive_history",  # female
    "frax_bone_density_risk",  # female <65
    "sleep_apnea_screen_result",
    "physical_activity_level",
}


def validate_signal_ids(applicable_signals: list[str], signals_fired: list[str], missing_signals: list[str]) -> None:
    """Validate all signal IDs match the Signal Store Contract catalog.

    Args:
        applicable_signals: All signals evaluated for patient profile
        signals_fired: Subset that evaluated to active
        missing_signals: Signals with no source data

    Raises:
        ValueError: If any signal ID is invalid
    """
    all_signals = set(applicable_signals) | set(signals_fired) | set(missing_signals)

    invalid_signals = all_signals - VALID_SIGNAL_IDS
    if invalid_signals:
        raise ValueError(f"Invalid signal IDs found: {sorted(invalid_signals)}")

    if not signals_fired:
        raise ValueError("signals_fired[] cannot be empty")

    if set(signals_fired) - set(applicable_signals):
        raise ValueError("signals_fired[] must be a subset of applicable_signals[]")

    if set(missing_signals) - set(applicable_signals):
        raise ValueError("missing_signals[] must be a subset of applicable_signals[]")

    signal_coverage = len(signals_fired) / len(applicable_signals) if applicable_signals else 0.0
    if signal_coverage < 0.3 or signal_coverage > 1.0:
        logger.warning(f"Signal coverage {signal_coverage:.2f} is outside expected range (0.3-1.0)")


def validate_signal_store_record(record: dict) -> None:
    """Validate complete Signal Store record structure.

    Args:
        record: Signal Store record dictionary (with _schema and _meta fields)

    Raises:
        ValueError: If record structure is invalid
    """
    schema = record.get("_schema") or record.get("schema_version")
    if schema != "signal_store_record_v1":
        raise ValueError(f"_schema must be 'signal_store_record_v1', got {schema}")

    clinical_signals = record.get("clinical_signals", {})
    applicable_signals = clinical_signals.get("applicable_signals", [])
    signals_fired = clinical_signals.get("signals_fired", [])
    missing_signals = clinical_signals.get("missing_signals", [])

    validate_signal_ids(applicable_signals, signals_fired, missing_signals)

    # Validate tier values
    rule_preliminary_tier = clinical_signals.get("rule_preliminary_tier")
    if rule_preliminary_tier not in ["Standard", "Advanced", "Premium"]:
        raise ValueError(f"Invalid rule_preliminary_tier: {rule_preliminary_tier}")

    overall_risk_level = clinical_signals.get("overall_risk_level")
    if overall_risk_level not in ["Low", "Moderate", "High"]:
        raise ValueError(f"Invalid overall_risk_level: {overall_risk_level}")

    # Validate data completeness
    meta = record.get("_meta") or record.get("metadata", {})
    completeness = meta.get("data_completeness_ratio", 0.0)
    if not 0.0 <= completeness <= 1.0:
        raise ValueError(f"data_completeness_ratio must be 0.0-1.0, got {completeness}")

    logger.info(f"Signal Store record validated: {len(applicable_signals)} applicable, {len(signals_fired)} fired, {len(missing_signals)} missing")
