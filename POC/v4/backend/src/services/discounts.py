import json
from datetime import datetime
from typing import Any
from loguru import logger

from src.mcp_server.utils import V2_ROOT, get_patient_registry_entry

DISCOUNT_PROGRAMS_PATH = V2_ROOT / "assets/synthesis/discounts/discount_programs.json"

def load_discount_programs() -> list[dict]:
    if not DISCOUNT_PROGRAMS_PATH.exists():
        return []
    with open(DISCOUNT_PROGRAMS_PATH, encoding="utf-8") as f:
        return json.load(f)

def _evaluate_eligibility(program: dict, patient: dict) -> bool:
    benefits = patient.get("benefits", {})
    pid = program.get("id")
    
    if pid == "SMART_LIFE":
        return benefits.get("memberships", {}).get("smart_life_card", {}).get("active", False)
    elif pid == "SMART_KID":
        is_active = benefits.get("memberships", {}).get("smart_kid_card", {}).get("active", False)
        # Assuming age < 12 condition
        return is_active and patient.get("age", 99) < program.get("condition_age_under", 12)
    elif pid == "ANNIVERSARY_5":
        # Campaign logic: for POC, say it's always valid or check dates
        return True
    elif pid == "CORPORATE":
        return bool(benefits.get("corporate_affiliation"))
    elif pid == "NAVAVEJ_APP":
        return bool(benefits.get("has_navavej_app"))
    return False

def _estimate_savings(program: dict, base_price: float) -> float:
    value_type = program.get("type")
    
    if value_type == "membership_bundle":
        return 5000.0  # arbitrary estimated savings for the bundle for comparison
    elif value_type == "seasonal_campaign":
        return base_price * (program.get("discount_pct", 0) / 100.0)
    elif program.get("discount_pct"):
        return base_price * (program.get("discount_pct", 0) / 100.0)
    
    return 0.0

def calculate_discounts(patient_id: str, base_price_thb: float) -> dict[str, Any]:
    patient = get_patient_registry_entry(patient_id)
    if not patient:
        return {
            "eligible_discounts": [],
            "applied_discounts": [],
            "original_price_thb": base_price_thb,
            "final_price_thb": base_price_thb,
            "total_savings_thb": 0.0,
            "discount_override_allowed": True,
        }
        
    programs = load_discount_programs()
    eligible = [p for p in programs if _evaluate_eligibility(p, patient)]
    
    exclusive_group = [p for p in eligible if p.get("stacking") == "exclusive"]
    stackable_group = [p for p in eligible if p.get("stacking") == "stackable"]
    
    best_exclusive = None
    if exclusive_group:
        best_exclusive = max(exclusive_group, key=lambda p: _estimate_savings(p, base_price_thb))
        
    applied_programs = stackable_group.copy()
    if best_exclusive:
        applied_programs.append(best_exclusive)
        
    # Calculate total stackable percentage
    total_pct = sum(p.get("discount_pct", 0) for p in applied_programs)
    total_pct = min(total_pct, 100) # cap at 100% just in case
    
    # Calculate bundle offset (e.g. checkup overlap)
    # For POC, if SMART_LIFE is applied, we assume checkup covers some base price
    base_deduction = 0.0
    if best_exclusive and best_exclusive["id"] == "SMART_LIFE":
        base_deduction = min(best_exclusive.get("bundle_rights", {}).get("included_checkup_value_thb", 0), base_price_thb)
    
    discounted_base = base_price_thb - base_deduction
    final_price = discounted_base * (1 - total_pct / 100.0)
    
    # Just a sanity safety check
    final_price = max(0.0, final_price)
    
    total_savings = base_price_thb - final_price
    
    # Format response: Start with EVERYTHING set to applied=False
    eligible_discounts = []
    
    for p in eligible:
        savings = _estimate_savings(p, base_price_thb)
        brkdwn = {
            "id": p.get("id", ""),
            "label": p.get("label", ""),
            "type": p.get("type", ""),
            "discount_pct": p.get("discount_pct"),
            "estimated_savings_thb": savings,
            "applied": False,  # Manual selection required
            "reason_not_applied": "Awaiting manual selection"
        }
        eligible_discounts.append(brkdwn)
            
    return {
        "eligible_discounts": eligible_discounts,
        "applied_discounts": [], # Empty by default
        "original_price_thb": base_price_thb,
        "final_price_thb": float(base_price_thb), # Same as original
        "total_savings_thb": 0.0,
        "discount_override_allowed": True,
    }
