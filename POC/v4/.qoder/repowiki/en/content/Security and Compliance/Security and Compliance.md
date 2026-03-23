# Security and Compliance

<cite>
**Referenced Files in This Document**
- [security.py](file://backend/src/api/security.py)
- [privacy.py](file://backend/src/services/privacy.py)
- [audit.py](file://backend/src/services/audit.py)
- [settings.py](file://shared/settings.py)
- [main.py](file://backend/src/api/main.py)
- [utils.py](file://shared/utils.py)
- [test_security_rbac_contract.py](file://scripts/tests/test_security_rbac_contract.py)
- [privacy-mode.tsx](file://frontend/src/shared/privacy-mode.tsx)
- [RoleManagementTab.tsx](file://frontend/src/components/access-monitoring/RoleManagementTab.tsx)
- [access-monitoring.ts](file://frontend/src/types/access-monitoring.ts)
- [audit.jsonl](file://logs/audit.jsonl)
- [server.py](file://backend/src/mcp_server/server.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive security and compliance documentation for Navavej ROC. It covers the privacy framework (PII masking and rehydration), data protection measures, immutable audit trail using SHA-256 hash chaining, governance dashboards for administrative oversight, role-based access control (RBAC), security middleware, access control patterns, HMAC tokenization for secure data exchange, privacy-preserving AI processing techniques, compliance reporting, audit log management, data integrity verification, security scanning and vulnerability management, incident response procedures, and secure deployment practices.

## Project Structure
Navavej ROC is organized into backend services, shared utilities, frontend components, and test suites. Security and compliance features are implemented across:
- Backend API and services for authentication, authorization, privacy masking, audit logging, and MCP tooling
- Shared settings and utilities for configuration and HMAC token generation
- Frontend privacy mode and access monitoring UI for governance and transparency
- Logs and test suites validating RBAC and audit behavior

```mermaid
graph TB
subgraph "Frontend"
PM["Privacy Mode Provider<br/>frontend/src/shared/privacy-mode.tsx"]
RMT["Role Management Tab<br/>frontend/src/components/access-monitoring/RoleManagementTab.tsx"]
AMTypes["Access Monitoring Types<br/>frontend/src/types/access-monitoring.ts"]
end
subgraph "Backend"
API["FastAPI App<br/>backend/src/api/main.py"]
SEC["Security Middleware<br/>backend/src/api/security.py"]
PRIV["PII Masking/Rehydration<br/>backend/src/services/privacy.py"]
AUD["Audit Logger<br/>backend/src/services/audit.py"]
MCP["MCP Server<br/>backend/src/mcp_server/server.py"]
end
subgraph "Shared"
CFG["Settings<br/>shared/settings.py"]
UTL["Utilities (HMAC)<br/>shared/utils.py"]
end
subgraph "Tests"
TSEC["RBAC Contract Tests<br/>scripts/tests/test_security_rbac_contract.py"]
end
subgraph "Logs"
LOG["Audit JSONL<br/>logs/audit.jsonl"]
end
PM --> API
RMT --> API
AMTypes --> RMT
API --> SEC
API --> MCP
SEC --> CFG
PRIV --> CFG
AUD --> CFG
AUD --> LOG
UTL --> CFG
TSEC --> API
```

**Diagram sources**
- [main.py:1-44](file://backend/src/api/main.py#L1-L44)
- [security.py:1-58](file://backend/src/api/security.py#L1-L58)
- [privacy.py:1-94](file://backend/src/services/privacy.py#L1-L94)
- [audit.py:1-173](file://backend/src/services/audit.py#L1-L173)
- [settings.py:1-70](file://shared/settings.py#L1-L70)
- [utils.py:1-27](file://shared/utils.py#L1-L27)
- [test_security_rbac_contract.py:1-67](file://scripts/tests/test_security_rbac_contract.py#L1-L67)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)
- [server.py:1-23](file://backend/src/mcp_server/server.py#L1-L23)

**Section sources**
- [main.py:1-44](file://backend/src/api/main.py#L1-L44)
- [settings.py:1-70](file://shared/settings.py#L1-L70)

## Core Components
- Authentication and Authorization Context
  - Authentication headers are parsed into an AuthContext with user_id, role, and scopes.
  - Access control enforces allowed roles and required scopes via a dependency decorator.
  - Configuration supports disabling auth for PoC and defines default roles/scopes.

- Privacy Framework (PII Masking and Rehydration)
  - PII fields are identified and pseudonymized with request-scoped tokens.
  - Rehydration restores original values prior to dashboard delivery using a token-to-original mapping.

- Immutable Audit Trail (SHA-256 Hash Chaining)
  - Audit logs are written in dual formats: JSONL append-only and JSON array.
  - Each entry includes previous_hash and current_hash derived from SHA-256 over sorted JSON.
  - Retrieval reads the JSON array for UI dashboards and verifies chain integrity by reading the last entry.

- Governance Dashboard and Access Monitoring
  - Frontend exposes role management and access monitoring types for dashboards.
  - Privacy mode toggles PII masking in the UI using localStorage.

- HMAC Tokenization
  - Patient tokens are generated using HMAC-SHA256 over patient identifiers with a secret salt.
  - Tokens are short-lived and opaque, preventing reversible identification.

- RBAC and Security Middleware
  - Roles and scopes are configured centrally; endpoints enforce access policies.
  - Contract tests validate unauthorized access rejection and role-aware behavior.

**Section sources**
- [security.py:9-58](file://backend/src/api/security.py#L9-L58)
- [privacy.py:22-94](file://backend/src/services/privacy.py#L22-L94)
- [audit.py:14-173](file://backend/src/services/audit.py#L14-L173)
- [settings.py:45-67](file://shared/settings.py#L45-L67)
- [utils.py:7-27](file://shared/utils.py#L7-L27)
- [test_security_rbac_contract.py:24-67](file://scripts/tests/test_security_rbac_contract.py#L24-L67)
- [privacy-mode.tsx:15-64](file://frontend/src/shared/privacy-mode.tsx#L15-L64)
- [RoleManagementTab.tsx:10-41](file://frontend/src/components/access-monitoring/RoleManagementTab.tsx#L10-L41)
- [access-monitoring.ts:84-118](file://frontend/src/types/access-monitoring.ts#L84-L118)

## Architecture Overview
The system integrates security controls across API boundaries, service layers, and UI components. The following diagram maps the security architecture to actual source files.

```mermaid
graph TB
Client["Client/Browser"]
FE["Frontend UI<br/>privacy-mode.tsx, RoleManagementTab.tsx"]
API["FastAPI App<br/>main.py"]
SEC["Auth/Access Control<br/>security.py"]
CFG["Settings<br/>settings.py"]
SVC_PRIV["Privacy Service<br/>privacy.py"]
SVC_AUD["Audit Service<br/>audit.py"]
LOG["Audit Log<br/>audit.jsonl"]
UTIL["Utilities<br/>utils.py (HMAC)"]
MCP["MCP Server<br/>server.py"]
Client --> FE
FE --> API
API --> SEC
SEC --> CFG
API --> SVC_PRIV
API --> SVC_AUD
SVC_AUD --> LOG
API --> MCP
UTIL --> CFG
```

**Diagram sources**
- [main.py:14-32](file://backend/src/api/main.py#L14-L32)
- [security.py:26-53](file://backend/src/api/security.py#L26-L53)
- [settings.py:45-67](file://shared/settings.py#L45-L67)
- [privacy.py:22-58](file://backend/src/services/privacy.py#L22-L58)
- [audit.py:14-121](file://backend/src/services/audit.py#L14-L121)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)
- [utils.py:7-27](file://shared/utils.py#L7-L27)
- [server.py:11-22](file://backend/src/mcp_server/server.py#L11-L22)

## Detailed Component Analysis

### Authentication and Authorization Context
- AuthContext parsing extracts user_id, role, and scopes from headers.
- require_access validates allowed roles and required scopes, raising HTTP 401/403 on failure.
- Settings support disabling auth for PoC and define defaults for roles and scopes.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "FastAPI App"
participant SEC as "Auth/Access Control"
participant CFG as "Settings"
Client->>API : "HTTP Request with X-Auth-* headers"
API->>SEC : "get_auth_context()"
SEC->>CFG : "Read api_auth_mode/default roles/scopes"
SEC-->>API : "AuthContext(user_id, role, scopes)"
API->>SEC : "require_access(allowed_roles, required_scopes)"
SEC-->>API : "OK or HTTP 401/403"
API-->>Client : "Response"
```

**Diagram sources**
- [security.py:26-53](file://backend/src/api/security.py#L26-L53)
- [settings.py:53-60](file://shared/settings.py#L53-L60)

**Section sources**
- [security.py:26-53](file://backend/src/api/security.py#L26-L53)
- [settings.py:53-60](file://shared/settings.py#L53-L60)

### Privacy Framework: PII Masking and Rehydration
- PIIMasker recursively masks PII fields using request-scoped tokens and maintains a rehydration map.
- PIIRehydrator restores original values for dashboard delivery using the token-to-original mapping.
- PII fields include name, date of birth, phone, email, address, MRN, and FHIR identifiers.

```mermaid
flowchart TD
Start(["PII Processing"]) --> Detect["Detect PII Fields"]
Detect --> IsString{"Is Value String?"}
IsString --> |No| Keep["Keep Original Value"]
IsString --> |Yes| Exists{"Token Exists for Value?"}
Exists --> |Yes| UseToken["Use Existing Token"]
Exists --> |No| NewToken["Generate New Token<br/>Store Mapping"]
UseToken --> Mask["Mask Field with Token"]
NewToken --> Mask
Keep --> Recurse["Recurse into Dict/List"]
Mask --> Recurse
Recurse --> End(["Return Masked Data"])
```

**Diagram sources**
- [privacy.py:29-53](file://backend/src/services/privacy.py#L29-L53)
- [privacy.py:67-94](file://backend/src/services/privacy.py#L67-L94)

**Section sources**
- [privacy.py:22-94](file://backend/src/services/privacy.py#L22-L94)

### Immutable Audit Trail: SHA-256 Hash Chaining

`AuditLogger` writes every AI inference and physician decision to `logs/audit.jsonl` (append-only) using a SHA-256 hash chain. Each entry includes `previous_hash` from the last entry and computes `current_hash = SHA-256(sorted_payload)`. Any post-write modification produces a detectable hash mismatch across all subsequent entries.

#### 5-Dimension Log Structure (Section 6.3 compliance)

Every audit entry is structured around five mandatory dimensions:

| Dimension | Fields | Purpose |
|-----------|--------|---------|
| **Who** | `user_id`, `user_role` | Identity and role of the healthcare staff who triggered the action |
| **When** | `timestamp` (ISO 8601, UTC) | Precise moment of the inference or physician decision event |
| **Where** | `service_id`, `client_ip`, `request_id` | Originating service and network location — full source traceability |
| **What** | `masked_ai_prompt`, `masked_ai_response`, `model_id`, `latency_ms`, `safety_conflict_events` | Full masked transaction record — all patient data appears as pseudonymized tokens |
| **Why** | `patient_id` (token), `action_type`, `request_id` | Clinical purpose that triggered the inference |

PII enforcement: only masked context and masked AI response are persisted. The PII-to-token mapping is held in process memory only during inference and is never written to any log.

Both `log_recommendation()` (AI inference entries) and `log_decision()` (physician Approve/Reject entries) write the same 5-dimension structure. The physician decision entry additionally stores `recommendation_reference_hash` in `"what"` to link back to the original AI inference.

```mermaid
sequenceDiagram
participant API as "API"
participant AUD as "AuditLogger"
participant FS as "Filesystem"
participant UI as "Dashboard"
API->>AUD : "log_recommendation(...)"
AUD->>AUD : "Build 5-dimension payload (who/when/where/what/why)"
AUD->>AUD : "Sort payload keys"
AUD->>AUD : "Compute SHA-256(previous_hash + payload)"
AUD->>FS : "Append JSONL line (append-only)"
note over AUD,FS: Physician decision follows same flow via log_decision()
UI->>AUD : "get_logs()"
AUD-->>UI : "Array of entries"
```

**Diagram sources**
- [audit.py:47-111](file://backend/src/services/audit.py#L47-L111)
- [audit.py:113-167](file://backend/src/services/audit.py#L113-L167)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)

**Section sources**
- [audit.py:14-183](file://backend/src/services/audit.py#L14-L183)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)

### Governance Dashboard and Access Monitoring
- RoleManagementTab renders role permissions across resources for administrative oversight.
- Access monitoring types define snapshots, alerts, audit log entries, and mapping codes for dashboards.
- Privacy mode provider persists user preference and toggles PII masking in UI.

```mermaid
classDiagram
class RoleManagementTab {
+render(roles)
}
class RbacRole {
+string role_id
+string label
+Record~string,string[]~ permissions
}
class MonitoringSnapshot {
+string snapshot_at
+number refresh_interval_seconds
+number active_users_now
+number sessions_today
+number patient_records_accessed_today
+number ai_recommendations_generated_today
+AlertCounts alert_counts
+number safety_validator_failures_today
+DepartmentCount[] top_active_departments
}
class AuditLogEntry {
+string entry_id
+string sha256_hash
+string prev_entry_hash
+Who who
+When when
+Where where
+What what
+Why why
+string retention_expiry
}
RoleManagementTab --> RbacRole : "renders"
RbacRole --> MonitoringSnapshot : "used by"
RbacRole --> AuditLogEntry : "audited by"
```

**Diagram sources**
- [RoleManagementTab.tsx:10-41](file://frontend/src/components/access-monitoring/RoleManagementTab.tsx#L10-L41)
- [access-monitoring.ts:8-18](file://frontend/src/types/access-monitoring.ts#L8-L18)
- [access-monitoring.ts:46-82](file://frontend/src/types/access-monitoring.ts#L46-L82)
- [access-monitoring.ts:84-118](file://frontend/src/types/access-monitoring.ts#L84-L118)

**Section sources**
- [RoleManagementTab.tsx:10-41](file://frontend/src/components/access-monitoring/RoleManagementTab.tsx#L10-L41)
- [access-monitoring.ts:8-118](file://frontend/src/types/access-monitoring.ts#L8-L118)
- [privacy-mode.tsx:15-64](file://frontend/src/shared/privacy-mode.tsx#L15-L64)

### HMAC Tokenization for Secure Data Exchange
- Patient tokens are generated using HMAC-SHA256 over patient identifiers with a secret salt.
- Tokens are short and opaque, preventing reversible identification while enabling secure routing.

```mermaid
flowchart TD
Start(["Generate Patient Token"]) --> Input["Input: patient_id, secret_salt"]
Input --> HMAC["Compute HMAC-SHA256"]
HMAC --> Hex["Take First 8 Hex Digits"]
Hex --> Prefix["Prefix with tok_hmac_"]
Prefix --> Output(["Return token"])
```

**Diagram sources**
- [utils.py:7-27](file://shared/utils.py#L7-L27)
- [settings.py:51](file://shared/settings.py#L51)

**Section sources**
- [utils.py:7-27](file://shared/utils.py#L7-L27)
- [settings.py:51](file://shared/settings.py#L51)

### RBAC Implementation and Access Control Patterns
- Centralized configuration defines allowed roles and required scopes for recommendation and monitoring endpoints.
- require_access enforces policy at the endpoint level; tests validate rejection of invalid roles/scopes.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "API Endpoint"
participant SEC as "require_access"
participant POL as "Policy Config"
Client->>API : "POST /api/recommend"
API->>SEC : "Validate role and scopes"
SEC->>POL : "Load allowed roles/scopes"
SEC-->>API : "Allow or HTTP 403"
API-->>Client : "Response"
```

**Diagram sources**
- [security.py:45-53](file://backend/src/api/security.py#L45-L53)
- [settings.py:57-60](file://shared/settings.py#L57-L60)
- [test_security_rbac_contract.py:35-66](file://scripts/tests/test_security_rbac_contract.py#L35-L66)

**Section sources**
- [security.py:45-53](file://backend/src/api/security.py#L45-L53)
- [settings.py:57-60](file://shared/settings.py#L57-L60)
- [test_security_rbac_contract.py:24-67](file://scripts/tests/test_security_rbac_contract.py#L24-L67)

### Privacy-Preserving AI Processing Techniques
- PII masking occurs before AI processing; rehydration restores values only for authorized delivery.
- Tokens embed in logs and audit trails; no original PII is stored in plaintext.

**Section sources**
- [privacy.py:22-94](file://backend/src/services/privacy.py#L22-L94)
- [audit.py:55-121](file://backend/src/services/audit.py#L55-L121)

### Compliance Reporting and Audit Log Management
- Dual-format audit logs enable both append-only integrity and structured retrieval.
- get_logs provides dashboard access; hash verification uses previous/current hash linkage.

**Section sources**
- [audit.py:44-54](file://backend/src/services/audit.py#L44-L54)
- [audit.py:163-173](file://backend/src/services/audit.py#L163-L173)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)

### Data Integrity Verification
- SHA-256 hash chaining ensures tamper-evident audit logs.
- Chain continuity verified by reading the last entry’s current_hash and comparing with expected previous_hash.

**Section sources**
- [audit.py:25-42](file://backend/src/services/audit.py#L25-L42)
- [audit.py:106-120](file://backend/src/services/audit.py#L106-L120)

### Security Scanning, Vulnerability Management, and Incident Response
- Security scanning and vulnerability management are supported by centralized settings and strict RBAC enforcement.
- Incident response procedures should include:
  - Immediate isolation of affected endpoints
  - Audit trail review for compromised tokens or unauthorized access
  - Rotation of secrets and revalidation of HMAC salts
  - Forensic analysis of audit logs and rehydration maps

[No sources needed since this section provides general guidance]

## Dependency Analysis
- API depends on security middleware for access control and on shared settings for configuration.
- Services depend on shared utilities for HMAC tokenization and on settings for audit paths.
- Frontend components depend on types and privacy mode for governance and transparency.

```mermaid
graph LR
API["API main.py"] --> SEC["security.py"]
API --> MCP["mcp_server/server.py"]
SEC --> CFG["settings.py"]
PRIV["privacy.py"] --> CFG
AUD["audit.py"] --> CFG
AUD --> LOG["audit.jsonl"]
UTL["utils.py"] --> CFG
FE_PM["privacy-mode.tsx"] --> FE_TYPES["access-monitoring.ts"]
FE_RMT["RoleManagementTab.tsx"] --> FE_TYPES
```

**Diagram sources**
- [main.py:14-32](file://backend/src/api/main.py#L14-L32)
- [security.py:26-53](file://backend/src/api/security.py#L26-L53)
- [settings.py:45-67](file://shared/settings.py#L45-L67)
- [privacy.py:22-58](file://backend/src/services/privacy.py#L22-L58)
- [audit.py:14-121](file://backend/src/services/audit.py#L14-L121)
- [audit.jsonl:1-21](file://logs/audit.jsonl#L1-L21)
- [utils.py:7-27](file://shared/utils.py#L7-L27)
- [privacy-mode.tsx:15-64](file://frontend/src/shared/privacy-mode.tsx#L15-L64)
- [RoleManagementTab.tsx:10-41](file://frontend/src/components/access-monitoring/RoleManagementTab.tsx#L10-L41)
- [access-monitoring.ts:8-118](file://frontend/src/types/access-monitoring.ts#L8-L118)

**Section sources**
- [main.py:14-32](file://backend/src/api/main.py#L14-L32)
- [settings.py:45-67](file://shared/settings.py#L45-L67)

## Performance Considerations
- Audit logging uses append-only JSONL and JSON arrays; ensure separate filesystems for throughput.
- PII masking is recursive; avoid deep nested structures for large payloads.
- HMAC tokenization is constant-time; negligible overhead.
- RBAC checks occur per request; keep role/scopes sets minimal and cached where appropriate.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication Failures
  - Verify X-Auth-* headers are present and correctly formatted.
  - Confirm api_auth_mode and default roles/scopes in settings.

- Access Denied (403)
  - Check allowed roles and required scopes for the endpoint.
  - Validate scope format and case sensitivity.

- Audit Log Issues
  - Ensure audit_log_path exists and is writable.
  - Verify last hash parsing; corrupted JSONL may reset to initial hash.

- Privacy Mode Toggle
  - Confirm localStorage availability and correct storage key.

**Section sources**
- [security.py:32-42](file://backend/src/api/security.py#L32-L42)
- [settings.py:53-60](file://shared/settings.py#L53-L60)
- [audit.py:25-42](file://backend/src/services/audit.py#L25-L42)
- [privacy-mode.tsx:13-38](file://frontend/src/shared/privacy-mode.tsx#L13-L38)

## Conclusion
Navavej ROC implements a robust security and compliance posture through:
- Strong RBAC enforced at the API boundary
- Opaque HMAC tokenization for secure data exchange
- Privacy-preserving PII masking and rehydration
- Immutable audit trails with SHA-256 hash chaining
- Governance dashboards for administrative oversight
- Centralized configuration and testing to validate controls

These controls collectively support privacy frameworks, data protection, and compliance readiness.

## Appendices
- Deployment Checklist
  - Enforce HTTPS/TLS termination
  - Restrict CORS origins to trusted domains
  - Rotate HMAC salt regularly
  - Monitor audit log ingestion and integrity
  - Enable automated RBAC contract tests in CI

- Incident Response Playbook
  - Identify compromised tokens via audit trail
  - Revoke and regenerate tokens
  - Review access logs for unauthorized scopes
  - Verify hash chain integrity post-incident
  - Notify stakeholders per policy

[No sources needed since this section provides general guidance]