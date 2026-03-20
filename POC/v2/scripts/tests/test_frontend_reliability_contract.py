from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _read(path: str) -> str:
    return (PROJECT_ROOT / path).read_text(encoding="utf-8")


def test_dashboard_primary_nav_has_real_routes():
    source = _read("frontend/src/components/Sidebar.tsx")
    assert 'href: "/"' in source
    assert 'href: "/trend-timeline"' in source
    assert 'href: "/access-monitoring"' in source
    assert 'href: "/audit"' in source
    assert 'href="#"' not in source


def test_sidebar_navigation_links_to_existing_pages():
    source = _read("frontend/src/components/Sidebar.tsx")
    assert 'href: "/"' in source
    assert 'href: "/trend-timeline"' in source
    assert 'href: "/access-monitoring"' in source
    assert 'href: "/audit"' in source
    assert "usePathname" in source
    assert "<Link" in source


def test_screen_bootstrap_guards_async_failures():
    timeline_source = _read("frontend/src/components/trend-timeline/TrendTimelineScreen.tsx")
    monitoring_source = _read("frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx")
    assert "try {" in timeline_source
    assert "catch (error)" in timeline_source
    assert "setErrorMessage" in timeline_source
    assert "try {" in monitoring_source
    assert "catch (error)" in monitoring_source
    assert "setErrorMessage" in monitoring_source


def test_recommendation_panel_normalizes_patient_high_alert_shape():
    source = _read("frontend/src/components/dashboard/RecommendationPanel.tsx")
    assert "normalizeCriticalAlerts" in source
    assert "Array.isArray(patientHighAlert?.critical_signals)" in source
    assert "const criticalAlerts = normalizeCriticalAlerts(data.patient_high_alert)" in source
    assert "criticalAlerts.map" in source


def test_mig5_page_wires_hybrid_toggle_state_to_panel():
    source = _read("frontend/src/app/page.tsx")
    assert "const [isRuleBasedForced, setIsRuleBasedForced] = useState(false);" in source
    assert 'isRuleBasedForced ? "Fallback: Rules" : "Mode: Hybrid AI"' in source
    assert "isRuleBasedForced={isRuleBasedForced}" in source


def test_mig5_panel_refetches_on_toggle_without_key_change():
    source = _read("frontend/src/components/dashboard/RecommendationPanel.tsx")
    assert "clinicalService.getRecommendation(patientToken, isRuleBasedForced)" in source
    assert "}, [patientToken, isRuleBasedForced]);" in source
    assert "key={patientToken}" in source


def test_mig5_api_sends_force_rule_based_payload():
    source = _read("frontend/src/services/api.ts")
    assert "getRecommendation: async (patientToken: string, forceRuleBased: boolean = false)" in source
    assert "force_rule_based: forceRuleBased" in source


def test_mig6_page_has_privacy_mode_and_masks_patient_fields():
    source = _read("frontend/src/app/page.tsx")
    assert "usePrivacyMode" in source
    assert "const { privacyMode" in source
    assert "const [securityMetadata, setSecurityMetadata] = useState" in source
    assert "const getDisplayValue = (originalValue: string | null | undefined) => {" in source
    assert "onClick={togglePrivacyMode}" in source
    assert "getDisplayValue(selectedPatient.patient_name)" in source
    assert "getDisplayValue(selectedPatient.patient_id)" in source
    assert "getDisplayValue(selectedPatient?.mrn)" in source
    assert "getDisplayValue(selectedPatient?.phone)" in source
    assert "getDisplayValue(selectedPatient?.email)" in source


def test_mig6_page_wires_recommendation_metadata_callback():
    source = _read("frontend/src/app/page.tsx")
    assert "setSecurityMetadata(null);" in source
    assert "onRecommendationLoad=" in source
    assert "setSecurityMetadata(data?.security_metadata || null);" in source


def test_mig6_panel_masks_reasoning_trace_and_lifts_security_metadata():
    source = _read("frontend/src/components/dashboard/RecommendationPanel.tsx")
    assert "privacyMode: boolean;" in source
    assert "onRecommendationLoad?: (data: RecommendationResponse | null) => void;" in source
    assert "onRecommendationLoad?.(result);" in source
    assert 'const reasoningTrace = ((privacyMode ? data.security_metadata?.masked_ai_output?.reasoning_trace : data.reasoning_trace) || data.reasoning_trace || "").toString();' in source
    assert "reasoningTrace?.split('\\n')" in source
