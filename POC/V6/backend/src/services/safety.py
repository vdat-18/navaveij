from loguru import logger

class SafetyRuleValidator:
    """Deterministic post-AI safety validator for add-on eligibility checks."""

    def validate_and_filter(self, ai_output: dict, raw_context: dict) -> dict:
        logger.info("Running deterministic post-AI safety validation")

        add_ons = ai_output.get("add_ons", [])
        hard_constraints = raw_context.get("get_hard_constraints", {})
        clinical_signals = raw_context.get("get_clinical_signals", {})
        ruleset = raw_context.get("get_program_ruleset", {})

        demographics = hard_constraints.get("patient_demographics", {})
        patient_gender = demographics.get("gender", "other")
        patient_age = demographics.get("age", 0)
        active_signals = set(clinical_signals.get("signals_fired", []))

        add_on_library = ruleset.get("add_on_library", [])
        add_on_map = {
            item.get("item_code") or item.get("item_id"): item
            for item in add_on_library
        }

        filtered_add_ons = []
        conflict_events = []

        for add_on in add_ons:
            item_id = add_on.get("item_id") or add_on.get("item_code")
            if not item_id:
                continue
            meta = add_on_map.get(item_id, {})
            reason = self._violation_reason(
                meta=meta,
                item_id=item_id,
                patient_gender=patient_gender,
                patient_age=patient_age,
                active_signals=active_signals,
            )
            if reason:
                conflict_events.append(
                    {
                        "event_type": "safety_add_on_removed",
                        "item_id": item_id,
                        "violation_reason": reason,
                    }
                )
                continue
            filtered_add_ons.append(add_on)

        if conflict_events:
            logger.warning(
                f"Safety validator removed {len(conflict_events)} add-on item(s) due to eligibility constraints"
            )
        else:
            logger.success("Safety validator passed without removals")

        return {"filtered_add_ons": filtered_add_ons, "conflict_events": conflict_events}

    def _violation_reason(
        self,
        *,
        meta: dict,
        item_id: str,
        patient_gender: str,
        patient_age: int,
        active_signals: set[str],
    ) -> str | None:
        if not meta:
            return f"add_on_not_found:{item_id}"

        gender_constraint = meta.get("gender_constraint")
        if gender_constraint and gender_constraint != patient_gender:
            return f"gender_ineligible:{patient_gender}"

        age_min = meta.get("age_min")
        if age_min is not None and patient_age < age_min:
            return f"age_below_minimum:{age_min}"

        age_max = meta.get("age_max")
        if age_max is not None and patient_age > age_max:
            return f"age_above_maximum:{age_max}"

        contraindications = set(meta.get("safety_contraindication_signals", []))
        if contraindications and contraindications.intersection(active_signals):
            return "contraindication_signal_triggered"

        return None
