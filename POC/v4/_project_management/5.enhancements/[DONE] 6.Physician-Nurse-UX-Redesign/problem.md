# Problem Statement

## 1) One layout for all roles

All roles — physician, nurse, admin, DPO — received the same 3-column layout:
- Sidebar navigation menu always visible on the left
- Left column: full patient list
- Middle column: AI recommendation panel
- Right column: biomarker charts and trend timeline

Physicians and nurses had no role-specific entry point. They were forced to use an admin-style layout that was designed for users who need to monitor everything simultaneously.

## 2) No single-patient focus for clinical users

Doctors work one patient at a time. The 3-column layout kept charts and the full patient list permanently on screen. There was no "search and focus" workflow — no way to go from "I need to look up a patient" to "show me that patient's data" without navigating through noise.

## 3) Charts always consuming screen space

The trend timeline and biomarker charts were always rendered, even when the physician was reading the recommendation or had not yet selected a patient. Chart rendering is expensive and the visual weight reduced focus on the recommendation output.

## 4) Sidebar wasted space for clinical users

The sidebar links (Trend Timeline, Access Monitoring, Audit) are governance/admin tools. Physicians and nurses do not use them. The sidebar consumed ~240px of horizontal space that served no clinical purpose for those roles.
