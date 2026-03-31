"use client";

import React, { useEffect } from "react";
import { X, Tag, CreditCard, Users, Clock, Sparkles, Stethoscope, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PromotionSummary, PromotionApplied, ResolvedPackage, RecommendationAddOn } from "@/types/recommendation";

interface PromotionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    promoSummary: PromotionSummary | undefined;
    resolvedPackage: ResolvedPackage | undefined;
    addOns: RecommendationAddOn[];
}

export function PromotionDrawer({ isOpen, onClose, promoSummary, resolvedPackage, addOns }: PromotionDrawerProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const campaigns = (promoSummary?.active_promotions ?? []).filter(p => p.type === "seasonal_campaign");
    const cards = (promoSummary?.active_promotions ?? []).filter(p => p.type === "membership_card");
    const bundles = (promoSummary?.active_promotions ?? []).filter(p => p.type === "bundle");
    const addonDeals = (promoSummary?.active_promotions ?? []).filter(p => p.type === "item_markdown");
    const urgencyMessages = promoSummary?.urgency_messages ?? [];
    const consultantPrompts = promoSummary?.consultant_prompts ?? [];
    const totalSavings = promoSummary?.total_savings_thb ?? 0;

    const packageSavings = resolvedPackage?.savings_thb ?? 0;
    const addonSavings = addOns.reduce((sum, a) => {
        if (a.promotions_applied && a.promotions_applied.length > 0 && a.original_price_thb && a.promo_price_thb != null) {
            return sum + (a.original_price_thb - a.promo_price_thb);
        }
        return sum;
    }, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer panel — slides from right */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Deals & Promotions"
                        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-navavej-border flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-navavej-border bg-gradient-to-r from-amber-50 to-white shrink-0">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-amber-600" />
                                <h2 className="text-sm font-black text-navavej-gray-dark uppercase tracking-wider">Deals & Promotions</h2>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navavej-gray-light transition-colors">
                                <X className="w-4 h-4 text-navavej-gray-med" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                            {/* Active Campaigns */}
                            {campaigns.length > 0 && (
                                <Section icon={<Sparkles className="w-3.5 h-3.5 text-pink-600" />} title="Active Campaigns">
                                    {campaigns.map(promo => (
                                        <PromoCard key={promo.promo_id} promo={promo}>
                                            {urgencyMessages.length > 0 && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <Clock className="w-3 h-3 text-pink-600 animate-pulse" />
                                                    <span className="text-[10px] font-black text-pink-700 uppercase tracking-wider">
                                                        {urgencyMessages[0]}
                                                    </span>
                                                </div>
                                            )}
                                            {promo.savings_thb > 0 && (
                                                <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
                                                    You save ฿{promo.savings_thb.toLocaleString()} on your package
                                                </p>
                                            )}
                                        </PromoCard>
                                    ))}
                                </Section>
                            )}

                            {/* Membership Cards */}
                            {cards.length > 0 && (
                                <Section icon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />} title="Membership Cards">
                                    {cards.map(promo => (
                                        <PromoCard key={promo.promo_id} promo={promo}>
                                            {promo.savings_thb > 0 && (
                                                <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
                                                    Saving ฿{promo.savings_thb.toLocaleString()}
                                                </p>
                                            )}
                                            {promo.card_cost_thb && (
                                                <p className="text-[10px] font-medium text-navavej-gray-med mt-1">
                                                    Card cost: ฿{promo.card_cost_thb.toLocaleString()}
                                                </p>
                                            )}
                                            {promo.consultant_note && (
                                                <p className="text-[10px] font-medium text-navavej-gray-med/80 mt-1.5 italic leading-relaxed">
                                                    {promo.consultant_note}
                                                </p>
                                            )}
                                        </PromoCard>
                                    ))}
                                </Section>
                            )}

                            {/* Bundle Deals */}
                            {bundles.length > 0 && (
                                <Section icon={<Users className="w-3.5 h-3.5 text-purple-600" />} title="Bundle Deals">
                                    {bundles.map(promo => (
                                        <PromoCard key={promo.promo_id} promo={promo}>
                                            {promo.consultant_note && (
                                                <p className="text-[10px] font-medium text-navavej-gray-med/80 mt-1.5 italic leading-relaxed">
                                                    {promo.consultant_note}
                                                </p>
                                            )}
                                        </PromoCard>
                                    ))}
                                </Section>
                            )}

                            {/* Add-on Deals */}
                            {addonDeals.length > 0 && (
                                <Section icon={<Stethoscope className="w-3.5 h-3.5 text-sky-600" />} title="Add-on Deals">
                                    {addonDeals.map(promo => {
                                        const matchingAddOns = addOns.filter(a =>
                                            a.promotions_applied?.some(p => p.promo_id === promo.promo_id)
                                        );
                                        return (
                                            <PromoCard key={promo.promo_id} promo={promo}>
                                                {matchingAddOns.length > 0 && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {matchingAddOns.map(addon => {
                                                            const addonPromo = addon.promotions_applied?.find(p => p.promo_id === promo.promo_id);
                                                            return (
                                                                <div key={addon.item_code} className="flex justify-between items-center text-[10px] py-1 border-t border-navavej-border/30">
                                                                    <span className="font-medium text-navavej-gray-dark truncate flex-1 mr-2">{addon.label}</span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {addon.original_price_thb && (
                                                                            <span className="text-navavej-gray-med/50 line-through">฿{addon.original_price_thb.toLocaleString()}</span>
                                                                        )}
                                                                        <span className="font-black text-emerald-700">
                                                                            ฿{(addon.promo_price_thb ?? addon.price_thb ?? 0).toLocaleString()}
                                                                        </span>
                                                                        {addonPromo && addonPromo.savings_thb > 0 && (
                                                                            <span className="text-[8px] font-black text-emerald-600">-฿{addonPromo.savings_thb.toLocaleString()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {matchingAddOns.length === 0 && promo.consultant_note && (
                                                    <p className="text-[10px] font-medium text-navavej-gray-med/80 mt-1.5 italic leading-relaxed">
                                                        {promo.consultant_note}
                                                    </p>
                                                )}
                                            </PromoCard>
                                        );
                                    })}
                                </Section>
                            )}
                        </div>

                        {/* Savings Summary — sticky bottom */}
                        <div className="shrink-0 border-t border-navavej-border bg-gradient-to-t from-emerald-50/80 to-white px-5 py-4 space-y-3">
                            <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Your Savings</h3>
                            <div className="space-y-1.5">
                                {packageSavings > 0 && (
                                    <div className="flex justify-between text-[11px]">
                                        <span className="font-medium text-navavej-gray-med">Package discount</span>
                                        <span className="font-black text-emerald-700">฿{packageSavings.toLocaleString()}</span>
                                    </div>
                                )}
                                {addonSavings > 0 && (
                                    <div className="flex justify-between text-[11px]">
                                        <span className="font-medium text-navavej-gray-med">Add-on discounts</span>
                                        <span className="font-black text-emerald-700">฿{addonSavings.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-emerald-200 pt-1.5 flex justify-between">
                                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Total Savings</span>
                                    <span className="text-lg font-black text-emerald-700">฿{totalSavings.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Final Settlement */}
                            <div className="border-t border-navavej-border pt-3 mt-3 space-y-2">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-navavej-gray-dark">Final Settlement</h3>

                                {/* Base package */}
                                <div className="flex justify-between items-center text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-navavej-teal" />
                                        <span className="font-medium text-navavej-gray-med">
                                            {resolvedPackage?.name || resolvedPackage?.package_name || "Base Package"}
                                        </span>
                                    </div>
                                    <span className="font-mono font-bold text-navavej-gray-dark">฿{(resolvedPackage?.price_thb ?? 0).toLocaleString()}</span>
                                </div>

                                {/* Selected add-ons */}
                                {addOns.map(addon => (
                                    <div key={addon.item_code} className="flex justify-between items-center text-[11px]">
                                        <span className="font-medium text-navavej-gray-med truncate mr-2">{addon.label}</span>
                                        <span className="font-mono font-bold text-navavej-gray-dark shrink-0">฿{(addon.promo_price_thb ?? addon.price_thb ?? 0).toLocaleString()}</span>
                                    </div>
                                ))}

                                {/* Discounts */}
                                {(promoSummary?.active_promotions ?? []).filter(p => p.savings_thb > 0).map(promo => (
                                    <div key={promo.promo_id} className="flex justify-between items-center text-[11px]">
                                        <span className="font-medium text-amber-700">{promo.label_short || promo.label}</span>
                                        <span className="font-mono font-bold text-amber-600">-฿{promo.savings_thb.toLocaleString()}</span>
                                    </div>
                                ))}

                                {/* Divider + Final */}
                                <div className="border-t border-navavej-border pt-2 flex justify-between items-baseline">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-navavej-gray-dark block">Total</span>
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-navavej-gray-med">Inclusive of VAT 7%</span>
                                    </div>
                                    <span className="text-2xl font-black text-navavej-gray-dark tracking-tight">
                                        ฿{(() => {
                                            const base = resolvedPackage?.price_thb ?? 0;
                                            const addOnTotal = addOns.reduce((s, a) => s + (a.promo_price_thb ?? a.price_thb ?? 0), 0);
                                            return Math.max(0, base + addOnTotal - totalSavings).toLocaleString();
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Consultant Script */}
                            {consultantPrompts.length > 0 && (
                                <div className="mt-3 p-3 bg-white rounded-xl border border-navavej-border">
                                    <p className="text-[9px] font-black text-navavej-teal uppercase tracking-widest mb-1.5">Consultant Script</p>
                                    <p className="text-[11px] font-medium text-navavej-gray-dark leading-relaxed italic">
                                        &ldquo;{consultantPrompts[0]}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2">
                {icon}
                <h3 className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-dark">{title}</h3>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function PromoCard({ promo, children }: { promo: PromotionApplied; children?: React.ReactNode }) {
    return (
        <div className="p-3 rounded-xl border border-navavej-border bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: promo.badge_color }} />
                <span className="text-[12px] font-black text-navavej-gray-dark tracking-tight">{promo.label}</span>
            </div>
            {promo.discount_description && (
                <p className="text-[11px] font-medium text-navavej-gray-med leading-relaxed">
                    {promo.discount_description}
                </p>
            )}
            {children}
        </div>
    );
}
