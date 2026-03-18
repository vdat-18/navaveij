from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _read(path: str) -> str:
    return (PROJECT_ROOT / path).read_text(encoding="utf-8")


def test_dashboard_primary_nav_has_real_routes():
    source = _read("frontend/src/app/page.tsx")
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
