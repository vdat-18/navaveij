"""Promotion Engine — resolves applicable promotions and computes savings.

This module provides a post-AI pricing overlay. Promotions are resolved
AFTER the clinical recommendation pipeline completes, so BAML agents
remain purely clinical and never factor in discounts.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any


class PromotionEngine:
    """Resolves applicable promotions for a given recommendation."""

    def __init__(self, promotions: list[dict[str, Any]]) -> None:
        self.promotions = promotions

    def resolve(
        self,
        *,
        package_code: str,
        package_price_thb: float | None,
        add_ons: list[dict[str, Any]],
        active_cards: list[str] | None = None,
        couple_mode: bool = False,
        current_date: datetime | None = None,
    ) -> dict[str, Any]:
        """Resolve applicable promotions and compute savings.

        Args:
            package_code: Resolved package code (e.g. "DIAM_M").
            package_price_thb: Current package price (already promotional if Expo).
            add_ons: List of enriched add-on dicts with item_code and price_thb.
            active_cards: List of promo_ids for membership cards toggled ON.
            couple_mode: Whether the couple bundle is toggled ON.
            current_date: Override for testing; defaults to now(UTC).

        Returns:
            Dict with keys: original_package_price, package_savings,
            package_promotions, add_on_promotions, applicable_promotions,
            total_savings, urgency_messages, consultant_prompts.
        """
        if current_date is None:
            current_date = datetime.now(timezone.utc)
        if active_cards is None:
            active_cards = []

        applicable: list[dict[str, Any]] = []
        package_promotions: list[dict[str, Any]] = []
        add_on_promotions: dict[str, dict[str, Any]] = {}
        urgency_messages: list[str] = []
        consultant_prompts: list[str] = []

        original_package_price = package_price_thb or 0
        package_savings = 0.0
        adjusted_package_price = package_price_thb or 0

        for promo in self.promotions:
            if not self._is_active(promo, current_date):
                continue
            if not self._is_eligible(promo, package_code, active_cards, couple_mode):
                continue

            mechanic = promo.get("discount_mechanic", {})
            mechanic_type = mechanic.get("type", "")
            promo_entry = self._build_promo_entry(promo)

            if mechanic_type == "pre_applied":
                orig_prices = promo.get("original_prices") or {}
                orig = orig_prices.get(package_code)
                if orig is not None and package_price_thb is not None:
                    savings = orig - package_price_thb
                    if savings > 0:
                        original_package_price = orig
                        package_savings += savings
                        promo_entry["savings_thb"] = savings
                        promo_entry["discount_description"] = (
                            f"Expo special: ฿{_fmt(orig)} → ฿{_fmt(package_price_thb)}"
                        )
                        package_promotions.append(promo_entry)

                # Apply pre_applied markup to add-ons if configured
                addon_markup_pct = mechanic.get("add_on_original_price_markup_pct")
                addon_codes = promo.get("scope", {}).get("add_on_item_codes", [])
                if addon_markup_pct and addon_codes:
                    applies_all = "*" in addon_codes
                    for addon in add_ons:
                        code = addon.get("item_code", "")
                        price = addon.get("price_thb") or 0
                        if price > 0 and (applies_all or code in addon_codes):
                            orig_addon_price = round(price * (1 + addon_markup_pct))
                            disc = orig_addon_price - price
                            if disc > 0:
                                existing = add_on_promotions.get(code, {
                                    "original_price": price,
                                    "adjusted_price": price,
                                    "promotions": [],
                                })
                                # Set original to the estimated pre-Expo price
                                existing["original_price"] = orig_addon_price
                                existing["promotions"].append({
                                    **self._build_promo_entry(promo),
                                    "savings_thb": disc,
                                    "discount_description": f"Expo special: ฿{_fmt(orig_addon_price)} → ฿{_fmt(price)}",
                                })
                                add_on_promotions[code] = existing

                days = self._days_remaining(promo, current_date)
                msg_template = promo.get("urgency_message", "")
                if msg_template and days is not None:
                    urgency_messages.append(
                        msg_template.replace("{days_remaining}", str(days))
                    )

            elif mechanic_type == "percentage":
                pct = mechanic.get("value", 0)
                if pct > 0 and adjusted_package_price > 0:
                    scope = promo.get("scope", {})
                    pkg_codes = scope.get("package_codes", [])
                    if package_code in pkg_codes:
                        disc = math.floor(adjusted_package_price * pct / 100)
                        if disc > 0:
                            package_savings += disc
                            adjusted_package_price -= disc
                            promo_entry["savings_thb"] = disc
                            promo_entry["discount_description"] = (
                                f"{pct}% off package: save ฿{_fmt(disc)}"
                            )
                            package_promotions.append(promo_entry)

                    addon_codes = scope.get("add_on_item_codes", [])
                    if addon_codes:
                        applies_all = "*" in addon_codes
                        for addon in add_ons:
                            code = addon.get("item_code", "")
                            price = addon.get("price_thb") or 0
                            if price > 0 and (applies_all or code in addon_codes):
                                disc = math.floor(price * pct / 100)
                                if disc > 0:
                                    existing = add_on_promotions.get(code, {
                                        "original_price": price,
                                        "adjusted_price": price,
                                        "promotions": [],
                                    })
                                    existing["adjusted_price"] -= disc
                                    existing["promotions"].append({
                                        **self._build_promo_entry(promo),
                                        "savings_thb": disc,
                                        "discount_description": f"{pct}% off: save ฿{_fmt(disc)}",
                                    })
                                    add_on_promotions[code] = existing

            elif mechanic_type == "bundle_fixed_price" and couple_mode:
                bundle_price = mechanic.get("bundle_price_thb", 0)
                if bundle_price > 0:
                    promo_entry["savings_thb"] = 0
                    promo_entry["discount_description"] = (
                        f"Couple bundle: ฿{_fmt(bundle_price)} for two"
                    )
                    package_promotions.append(promo_entry)
                    msg = promo.get("urgency_message")
                    if msg:
                        urgency_messages.append(msg)

            note = promo.get("consultant_note")
            if note and promo_entry.get("savings_thb", 0) > 0:
                consultant_prompts.append(note)

            applicable.append(promo_entry)

        total_addon_savings = sum(
            (info["original_price"] - info["adjusted_price"])
            for info in add_on_promotions.values()
        )
        total_savings = package_savings + total_addon_savings

        if package_savings > 0 and package_price_thb:
            consultant_prompts.insert(
                0,
                f"Great news — with our current Expo pricing, you save "
                f"฿{_fmt(package_savings)} on this package compared to standard rates.",
            )

        return {
            "original_package_price": original_package_price,
            "package_savings": package_savings,
            "package_promotions": package_promotions,
            "add_on_promotions": add_on_promotions,
            "applicable_promotions": applicable,
            "total_savings": total_savings,
            "urgency_messages": urgency_messages,
            "consultant_prompts": consultant_prompts,
        }

    def _is_active(self, promo: dict, current_date: datetime) -> bool:
        if promo.get("frozen_for_demo"):
            return True
        valid_from = promo.get("valid_from")
        valid_until = promo.get("valid_until")
        if valid_from is None and valid_until is None:
            return True
        if valid_from and current_date < datetime.fromisoformat(valid_from):
            return False
        if valid_until and current_date > datetime.fromisoformat(valid_until):
            return False
        return True

    def _is_eligible(
        self,
        promo: dict,
        package_code: str,
        active_cards: list[str],
        couple_mode: bool,
    ) -> bool:
        applies_to = promo.get("applies_to", "all")
        if applies_to == "all":
            return True
        if applies_to == "card_holder":
            return promo.get("promo_id", "") in active_cards
        if applies_to == "manual_selection":
            if promo.get("type") == "bundle":
                return couple_mode
            return False
        return False

    def _days_remaining(self, promo: dict, current_date: datetime) -> int | None:
        if promo.get("frozen_for_demo"):
            return promo.get("frozen_days_remaining")
        valid_until = promo.get("valid_until")
        if valid_until:
            end = datetime.fromisoformat(valid_until)
            delta = (end - current_date).days
            return max(0, delta)
        return None

    def _build_promo_entry(self, promo: dict) -> dict[str, Any]:
        return {
            "promo_id": promo.get("promo_id", ""),
            "label": promo.get("label", ""),
            "label_short": promo.get("label_short", ""),
            "badge_color": promo.get("badge_color", "#888"),
            "type": promo.get("type", ""),
            "discount_description": "",
            "savings_thb": 0,
            "card_cost_thb": promo.get("card_cost_thb"),
            "consultant_note": promo.get("consultant_note"),
        }


def _fmt(value: float) -> str:
    """Format a number with Thai-style comma separators."""
    return f"{value:,.0f}"
