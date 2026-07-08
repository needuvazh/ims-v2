# Part 6 – Permission Matrix

## Module 11 – Certificate Management

## 1. Purpose

This document defines the authorization model for Module 11 – Certificate Management. It establishes fine-grained permissions for navigation, business actions, lifecycle commands, operational queries, audit views, reporting, export, self-service access, trainer-scoped access, and public verification.

The model follows these governing rules:

1. Roles are not hardcoded into business logic. Business roles in this document are reference role profiles that receive permission grants through IAM `Role`, `Permission`, and `RolePermission` mappings.
2. Permission checks are enforced server-side for every authenticated action and query. UI menu hiding is only a usability control.
3. Branch scope is derived from IAM `UserBranchAccess`; a client-supplied branch filter can narrow scope but cannot expand it.
4. Parent/child branch visibility is permitted only when IAM explicitly grants child-branch visibility.
5. Consolidated reports require both report permission and explicit consolidated-view entitlement (`canViewConsolidated` or equivalent IAM policy outcome).
6. Certificate Management may read completion eligibility and payment-validation outcomes but cannot grant permissions that mutate Completion or Finance records.
7. Public certificate verification is anonymous, intentionally narrow, rate-limited, and not treated as a role permission.
8. Student and Trainer portal access uses self-scope or trainer-delivery scope in addition to authentication and entitlement checks.
9. Sensitive lifecycle actions—generation, issuance, approval, replacement generation, and revocation—must be auditable.
10. No permission grants hard delete capability. Certificate records and lifecycle history are retained according to soft-delete and audit conventions.

---

## 2. Scope Legend

| Marker | Scope Type               | Meaning                                                                                                                                                                         |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B**  | Branch-scoped            | Permission applies only to resources whose authoritative branch is in the user's effective IAM branch scope.                                                                    |
| **G**  | Global                   | Permission is not restricted to one branch. Used only for narrow administrative or compliance cases explicitly granted by IAM.                                                  |
| **C**  | Consolidated-report only | Permission may aggregate multiple authorized branches only when the user also has consolidated-view entitlement. It does not grant transaction mutation rights across branches. |
| **S**  | Self-scoped              | Permission applies only to the authenticated person's own student-linked records.                                                                                               |
| **T**  | Trainer-scoped           | Permission applies only to certificate status for enrollments connected to batches/sessions the authenticated trainer is authorized to view.                                    |
| **P**  | Public                   | Anonymous read-only verification surface with a deliberately restricted DTO.                                                                                                    |
| —      | Not applicable           | No grant for the role or the permission does not apply to that role type.                                                                                                       |

### 2.1 Scope Precedence

The effective authorization result is the intersection of:

```text
Authenticated identity
    ∩
Granted permission code
    ∩
Effective IAM branch/self/trainer scope
    ∩
Resource ownership and lifecycle guards
    ∩
Command-specific business invariants
```

A permission grant never bypasses lifecycle rules. For example, `certificate.issue` does not permit issuing a certificate whose current state is not issuable.

---

## 3. Reference Business Roles

The following roles are business-facing reference profiles. IAM remains authoritative and may create differently named roles by composing the same permissions.

| Role Code                   | Business Role                       | Primary Responsibility                                                                                       | Typical Scope                              |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `ROLE_CERT_ADMIN`           | Certificate Administrator           | Operates certificate generation, issue, registry, reissue processing, and controlled lifecycle actions       | B; optionally G only by explicit grant     |
| `ROLE_BRANCH_MANAGER`       | Branch Manager                      | Oversees branch certificate operations, approves reissue requests, may authorize sensitive lifecycle actions | B                                          |
| `ROLE_ACADEMIC_COORDINATOR` | Academic Coordinator                | Reviews readiness, learner/course/batch context, certificate status, and operational queues                  | B                                          |
| `ROLE_TRAINING_MANAGER`     | Training Manager                    | Views certificate readiness/status related to training delivery and batch completion outcomes                | B or C for reports                         |
| `ROLE_FINANCE_USER`         | Finance User                        | Provides Finance-owned payment truth; read-only Certificate visibility where operationally required          | B                                          |
| `ROLE_COMPLIANCE_AUDITOR`   | Compliance / Internal Auditor       | Reviews lifecycle history, verification activity, reissue approvals, revocations, and audit evidence         | B, G, or C depending on mandate            |
| `ROLE_EXECUTIVE`            | Executive / Management Viewer       | Consumes approved dashboards and consolidated reports; no certificate lifecycle mutation                     | C                                          |
| `ROLE_STUDENT`              | Student Portal User                 | Views and downloads own certificates and submits own reissue requests                                        | S                                          |
| `ROLE_TRAINER`              | Trainer Portal User                 | Views downstream certificate status for authorized training assignments                                      | T                                          |
| `ROLE_SUPPORT_AGENT`        | Support / Front Desk User           | Searches certificate registry and assists with verification/reissue intake without lifecycle authority       | B                                          |
| `ROLE_SYSTEM_INTEGRATION`   | Trusted System Integration Identity | Invokes explicitly approved application-to-application operations under service policy                       | Service policy, not human branch switching |
| `PUBLIC`                    | Public Verifier                     | Verifies certificate code/QR through restricted public endpoint                                              | P                                          |

### 3.1 Separation-of-Duties Recommendation

For production governance, ASTI should avoid assigning all of the following permissions to one user unless explicitly approved:

```text
certificate.reissue.request
certificate.reissue.approve
certificate.reissue.generate
certificate.revoke
```

Recommended default segregation:

- requester submits;
- manager approves/rejects;
- certificate operator generates replacement;
- revocation is restricted to management/compliance-authorized users.

This is a permission-composition recommendation and does not introduce a new domain model.

---

# 4. Permission Catalog

## 4.1 Menu-Level Permissions

Menu permissions control navigation visibility only. They do not authorize API access by themselves.

| Permission Code                          | Menu / Navigation Item      | Scope | Description                                                                                                |
| ---------------------------------------- | --------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| `certificate.menu.dashboard`             | Certificate Dashboard       | B / C | Shows operational certificate dashboard entry. Data still requires corresponding query/report permissions. |
| `certificate.menu.readiness`             | Certificate Readiness       | B     | Shows readiness and blocked-enrollment queues.                                                             |
| `certificate.menu.registry`              | Certificate Registry        | B     | Shows searchable certificate registry.                                                                     |
| `certificate.menu.reissue`               | Reissue Requests            | B     | Shows reissue request list and work queue.                                                                 |
| `certificate.menu.verification-activity` | Verification Activity       | B / G | Shows internal verification activity navigation.                                                           |
| `certificate.menu.audit`                 | Certificate Lifecycle Audit | B / G | Shows lifecycle/audit history navigation.                                                                  |
| `certificate.menu.reports`               | Certificate Reports         | B / C | Shows report catalog and certificate reporting navigation.                                                 |
| `certificate.menu.student-certificates`  | My Certificates             | S     | Student Portal navigation for own certificates.                                                            |
| `certificate.menu.student-reissue`       | My Reissue Requests         | S     | Student Portal navigation for own requests.                                                                |
| `certificate.menu.trainer-status`        | Certificate Status          | T     | Trainer Portal downstream certificate-status navigation.                                                   |

### Menu Permission Rule

A menu item should be rendered only when:

```text
menu permission granted
AND
at least one corresponding functional query/action permission is granted
```

This prevents dead navigation links. API authorization remains independent.

---

## 4.2 Action-Level Permissions

| Permission Code                          | Action                                                                     | Scope  | Sensitive / Audited                                    | Notes                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `certificate.read`                       | Read readiness, registry, detail, and dashboard operational data           | B      | No for ordinary reads; access logs per platform policy | Does not grant artifact download automatically.                                                                       |
| `certificate.download`                   | Download/stream certificate artifact                                       | B      | Access should be logged                                | Internal operator artifact access.                                                                                    |
| `certificate.generate`                   | Generate certificate from eligible enrollment                              | B      | **Yes**                                                | Requires authoritative completion/payment gates and idempotency.                                                      |
| `certificate.issue`                      | Issue a generated certificate                                              | B      | **Yes**                                                | Requires valid lifecycle state and command-time guards.                                                               |
| `certificate.revoke`                     | Revoke an issued certificate                                               | B or G | **Yes**                                                | High-risk action; recommended management/compliance grant only.                                                       |
| `certificate.verify.internal`            | Run internal certificate verification/read verification result             | B or G | Read/access trace recommended                          | Internal verification may show more operational metadata than public verification, but still follows least privilege. |
| `certificate.verification.activity.read` | Read verification activity/history                                         | B or G | Read access trace recommended                          | Canonical permission for API/UI verification activity.                                                                |
| `certificate.audit.read`                 | Read certificate lifecycle/audit projection                                | B or G | Read access trace recommended                          | Audit context owns authoritative audit records.                                                                       |
| `certificate.reissue.request`            | Submit reissue request on behalf of allowed subject                        | B or S | **Yes**                                                | Branch staff or student self-service according to scope.                                                              |
| `certificate.reissue.read`               | Read reissue request list/detail                                           | B or S | No for ordinary reads                                  | Students only see own requests.                                                                                       |
| `certificate.reissue.approve`            | Approve or reject reissue request                                          | B      | **Yes**                                                | Approval decision must be audited.                                                                                    |
| `certificate.reissue.generate`           | Generate replacement certificate from approved request                     | B      | **Yes**                                                | Must validate approved request and replacement rules.                                                                 |
| `certificate.notification.request`       | Request certificate notification delivery                                  | B or S | Yes where recipient/contact payload changes behavior   | Communication context owns delivery.                                                                                  |
| `certificate.trainer-status.read`        | Read downstream certificate status for trainer-authorized learners/batches | T      | No                                                     | Read-only; no generation/issue authority.                                                                             |
| `certificate.student.read-own`           | Read own certificates                                                      | S      | No                                                     | Self-scope resolved from authenticated Person/StudentProfile.                                                         |
| `certificate.student.download-own`       | Download own certificate artifact                                          | S      | Access logging recommended                             | Cannot access another student's artifact.                                                                             |
| `certificate.student.reissue-own`        | Submit and track own reissue requests                                      | S      | **Yes** for submission                                 | Restricted to certificate owned by authenticated student.                                                             |

### 4.2.1 Canonicalization of Earlier Naming Variants

Earlier FRD sections may contain shorthand or overlapping permission names. Part 6 defines the canonical permission set for implementation:

| Earlier Variant                          | Canonical Permission                     |
| ---------------------------------------- | ---------------------------------------- |
| `certificate.verify.read`                | `certificate.verify.internal`            |
| `certificate.verification.activity.read` | `certificate.verification.activity.read` |
| `certificate.reissue.submit`             | `certificate.reissue.request`            |
| `certificate.reissue.reject`             | `certificate.reissue.approve`            |

The aliases should not become separate IAM permissions unless the implementation intentionally requires finer segregation and the DDD/FRD is updated consistently.

---

## 4.3 Report-Level Permissions

| Permission Code                   | Report Capability                                   | Scope     | Consolidated Rule                                                                                                  |
| --------------------------------- | --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `certificate.report.read`         | View certificate operational and management reports | B / C     | Multi-branch aggregation requires consolidated entitlement.                                                        |
| `certificate.report.export`       | Export certificate reports to approved format       | B / C     | Export can include only rows within effective branch scope; consolidated export requires consolidated entitlement. |
| `certificate.report.registry`     | Certificate Registry Report                         | B / C     | Consolidated result only with report permission + consolidated entitlement.                                        |
| `certificate.report.issuance`     | Certificate Issuance Trend Report                   | B / C     | Aggregates issue counts by authorized branch/date/course/batch dimensions.                                         |
| `certificate.report.readiness`    | Certificate Readiness and Blocked Cases Report      | B / C     | Consumes Completion/Finance outcomes through read models; does not recompute them.                                 |
| `certificate.report.reissue`      | Reissue Request and Replacement Report              | B / C     | Includes only authorized branches.                                                                                 |
| `certificate.report.revocation`   | Revoked Certificate Report                          | B / C / G | Global only for explicitly authorized compliance roles.                                                            |
| `certificate.report.verification` | Verification Activity Report                        | B / C / G | Public verifier IP/security metadata must be minimized and permission-protected.                                   |
| `certificate.report.audit`        | Certificate Lifecycle Audit Report                  | B / C / G | Requires audit-read permission in addition to report permission.                                                   |
| `certificate.report.executive`    | Executive Certificate KPI Summary                   | C         | Consolidated-report only; no transaction mutation implied.                                                         |

### Report Permission Composition

Access to a report requires all applicable permissions:

```text
certificate.menu.reports
AND certificate.report.read
AND report-specific permission
AND branch/consolidated IAM scope outcome
```

For export:

```text
all read requirements
AND certificate.report.export
```

For audit report:

```text
certificate.report.audit
AND certificate.audit.read
AND certificate.report.read
```

---

# 5. Menu-Level Role Matrix

Legend: `B`, `C`, `S`, `T`, `G`, `P` as defined above; `—` means no default grant.

| Business Role                 | Dashboard | Readiness | Registry | Reissue Queue | Verification Activity | Lifecycle Audit | Reports | My Certificates | My Reissue Requests | Trainer Status |
| ----------------------------- | --------: | --------: | -------: | ------------: | --------------------: | --------------: | ------: | --------------: | ------------------: | -------------: |
| Certificate Administrator     |         B |         B |        B |             B |                     B |               B |       B |               — |                   — |              — |
| Branch Manager                |         B |         B |        B |             B |                     B |               B |       B |               — |                   — |              — |
| Academic Coordinator          |         B |         B |        B |             B |                     — |               — |       B |               — |                   — |              — |
| Training Manager              |         B |         B |        B |             B |                     — |               — |     B/C |               — |                   — |              — |
| Finance User                  |         — |         B |        B |             — |                     — |               — |       B |               — |                   — |              — |
| Compliance / Internal Auditor |       B/C |         — |      B/G |           B/G |                   B/G |             B/G |   B/C/G |               — |                   — |              — |
| Executive / Management Viewer |         C |         — |        — |             — |                     — |               — |       C |               — |                   — |              — |
| Student Portal User           |         — |         — |        — |             — |                     — |               — |       — |               S |                   S |              — |
| Trainer Portal User           |         — |         — |        — |             — |                     — |               — |       — |               — |                   — |              T |
| Support / Front Desk User     |         — |         — |        B |             B |                     B |               — |       — |               — |                   — |              — |
| Trusted System Integration    |         — |         — |        — |             — |                     — |               — |       — |               — |                   — |              — |
| Public Verifier               |         — |         — |        — |             — |                     — |               — |       — |               — |                   — |              — |

### 5.1 Menu Matrix Interpretation

- `C` on Executive Dashboard or Reports means the role sees aggregated results only for branches allowed by IAM and only if consolidated entitlement is true.
- Global audit/compliance navigation does not itself grant global data access; the user's IAM grant must resolve to global scope.
- Public verification is intentionally not part of authenticated portal navigation permissions.

---

# 6. Action-Level Role Matrix

| Business Role                 |                   Read |               Download |               Generate |                  Issue |       Revoke |        Internal Verify | Verification Activity | Audit Read |        Reissue Request |           Reissue Read | Reissue Approve/Reject |   Replacement Generate |   Notification Request | Trainer Status | Student Own Read/Download/Reissue |
| ----------------------------- | ---------------------: | ---------------------: | ---------------------: | ---------------------: | -----------: | ---------------------: | --------------------: | ---------: | ---------------------: | ---------------------: | ---------------------: | ---------------------: | ---------------------: | -------------: | --------------------------------: |
| Certificate Administrator     |                      B |                      B |                      B |                      B |          —\* |                      B |                     B |          B |                      B |                      B |                    —\* |                      B |                      B |              — |                                 — |
| Branch Manager                |                      B |                      B |                      — |                      B |            B |                      B |                     B |          B |                      B |                      B |                      B |                    —\* |                      B |              — |                                 — |
| Academic Coordinator          |                      B |                      B |                      — |                      — |            — |                      B |                     — |          — |                      B |                      B |                      — |                      — |                      B |              — |                                 — |
| Training Manager              |                      B |                      B |                      — |                      — |            — |                      B |                     — |          — |                      B |                      B |                      — |                      — |                      B |              — |                                 — |
| Finance User                  |                      B |                      — |                      — |                      — |            — |                      — |                     — |          — |                      — |                      — |                      — |                      — |                      — |              — |                                 — |
| Compliance / Internal Auditor |                    B/G |                    B/G |                      — |                      — |      B/G\*\* |                    B/G |                   B/G |        B/G |                      — |                    B/G |                B/G\*\* |                      — |                      — |              — |                                 — |
| Executive / Management Viewer |      C-read model only |                      — |                      — |                      — |            — |                      — |                     — |          — |                      — |                      — |                      — |                      — |                      — |              — |                                 — |
| Student Portal User           |                      — |                      — |                      — |                      — |            — |                      — |                     — |          — |                      S |                      S |                      — |                      — |                      S |              — |                                 S |
| Trainer Portal User           |                      — |                      — |                      — |                      — |            — |                      — |                     — |          — |                      — |                      — |                      — |                      — |                      — |              T |                                 — |
| Support / Front Desk User     |                      B |                      — |                      — |                      — |            — |                      B |                     B |          — |                      B |                      B |                      — |                      — |                      B |              — |                                 — |
| Trusted System Integration    | Explicit service grant | Explicit service grant | Explicit service grant | Explicit service grant | — by default | Explicit service grant |                     — |          — | Explicit service grant | Explicit service grant |                      — | Explicit service grant | Explicit service grant |              — |                                 — |
| Public Verifier               |    P verification only |                      — |                      — |                      — |            — |                      — |                     — |          — |                      — |                      — |                      — |                      — |                      — |              — |                                 — |

`*` May be granted by ASTI through a custom IAM role, but is not recommended in the default reference role because of separation-of-duties concerns.

`**` Compliance users may receive revoke or approval authority only by explicit policy; read-only audit is the safer default.

### 6.1 Detailed Action Permission-to-Role Mapping

| Permission                               | Cert Admin | Branch Manager | Academic Coord. | Training Manager | Finance User |      Auditor |    Executive | Student | Trainer | Support | System Integration |
| ---------------------------------------- | ---------: | -------------: | --------------: | ---------------: | -----------: | -----------: | -----------: | ------: | ------: | ------: | -----------------: |
| `certificate.read`                       |          B |              B |               B |                B |            B |          B/G | C projection |       — |       — |       B |           Explicit |
| `certificate.download`                   |          B |              B |               B |                B |            — |          B/G |            — |       — |       — |       — |           Explicit |
| `certificate.generate`                   |          B |              — |               — |                — |            — |            — |            — |       — |       — |       — |           Explicit |
| `certificate.issue`                      |          B |              B |               — |                — |            — |            — |            — |       — |       — |       — |           Explicit |
| `certificate.revoke`                     |  — default |              B |               — |                — |            — | Explicit B/G |            — |       — |       — |       — |          — default |
| `certificate.verify.internal`            |          B |              B |               B |                B |            — |          B/G |            — |       — |       — |       B |           Explicit |
| `certificate.verification.activity.read` |          B |              B |               — |                — |            — |          B/G |            — |       — |       — |       B |                  — |
| `certificate.audit.read`                 |          B |              B |               — |                — |            — |          B/G |            — |       — |       — |       — |                  — |
| `certificate.reissue.request`            |          B |              B |               B |                B |            — |            — |            — |       S |       — |       B |           Explicit |
| `certificate.reissue.read`               |          B |              B |               B |                B |            — |          B/G |            — |       S |       — |       B |           Explicit |
| `certificate.reissue.approve`            |  — default |              B |               — |                — |            — | Explicit B/G |            — |       — |       — |       — |                  — |
| `certificate.reissue.generate`           |          B |      — default |               — |                — |            — |            — |            — |       — |       — |       — |           Explicit |
| `certificate.notification.request`       |          B |              B |               B |                B |            — |            — |            — |       S |       — |       B |           Explicit |
| `certificate.trainer-status.read`        |          — |              — |               — |                — |            — |            — |            — |       — |       T |       — |                  — |
| `certificate.student.read-own`           |          — |              — |               — |                — |            — |            — |            — |       S |       — |       — |                  — |
| `certificate.student.download-own`       |          — |              — |               — |                — |            — |            — |            — |       S |       — |       — |                  — |
| `certificate.student.reissue-own`        |          — |              — |               — |                — |            — |            — |            — |       S |       — |       — |                  — |

---

# 7. Report-Level Role Matrix

| Business Role                 |   Report Read |        Export |      Registry | Issuance Trend | Readiness / Blocked |       Reissue |    Revocation |  Verification |         Audit | Executive KPI |
| ----------------------------- | ------------: | ------------: | ------------: | -------------: | ------------------: | ------------: | ------------: | ------------: | ------------: | ------------: |
| Certificate Administrator     |             B |             B |             B |              B |                   B |             B |             B |             B |             B |             — |
| Branch Manager                |             B |             B |             B |              B |                   B |             B |             B |             B |             B |             — |
| Academic Coordinator          |             B |           B\* |             B |              B |                   B |             B |             — |             — |             — |             — |
| Training Manager              |           B/C |         B/C\* |           B/C |            B/C |                 B/C |           B/C |             — |             — |             — |             — |
| Finance User                  |             B |           B\* |             B |              B |                   B |             — |             — |             — |             — |             — |
| Compliance / Internal Auditor |         B/C/G |         B/C/G |         B/C/G |          B/C/G |                   — |         B/C/G |         B/C/G |         B/C/G |         B/C/G |             — |
| Executive / Management Viewer |             C |           C\* |             — |              C |                   C |             C |             C |             C |             — |             C |
| Student Portal User           |             — |             — |             — |              — |                   — |             — |             — |             — |             — |             — |
| Trainer Portal User           |             — |             — |             — |              — |                   — |             — |             — |             — |             — |             — |
| Support / Front Desk User     |             — |             — |             — |              — |                   — |             — |             — |             — |             — |             — |
| Trusted System Integration    | Explicit only | Explicit only | Explicit only |  Explicit only |       Explicit only | Explicit only | Explicit only | Explicit only | Explicit only | Explicit only |
| Public Verifier               |             — |             — |             — |              — |                   — |             — |             — |             — |             — |             — |

`*` Export may be withheld in a stricter deployment even when report read is granted. The table shows the recommended maximum profile, not mandatory assignment.

### 7.1 Consolidated Reporting Guard

A user can receive a consolidated report only when both conditions are true:

```text
Has required certificate report permission(s)
AND IAM scope resolver returns canViewConsolidated = true
```

The report query must still limit branches to the user's assigned/authorized hierarchy. Consolidated does not mean unrestricted global access.

### 7.2 Global Report Guard

Global reporting is reserved for explicit compliance/administrative policy. A global permission must not be inferred from:

- job title;
- head-office branch alone;
- executive role name;
- ability to switch branches;
- consolidated-report access.

---

# 8. Permission-to-Screen Mapping

| Screen / Surface            | Menu Permission                          | Minimum Data Permission                         | Additional Action Permission(s)                                                 | Scope     |
| --------------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | --------- |
| Certificate Dashboard       | `certificate.menu.dashboard`             | `certificate.read` or `certificate.report.read` | report-specific permissions for KPI drill-down                                  | B / C     |
| Certificate Readiness List  | `certificate.menu.readiness`             | `certificate.read`                              | `certificate.generate` for generate CTA                                         | B         |
| Readiness Detail            | `certificate.menu.readiness`             | `certificate.read`                              | `certificate.generate`                                                          | B         |
| Certificate Registry        | `certificate.menu.registry`              | `certificate.read`                              | `certificate.download`, `certificate.issue`, `certificate.revoke` as applicable | B         |
| Certificate Detail          | `certificate.menu.registry`              | `certificate.read`                              | download/issue/revoke/notification permissions                                  | B         |
| Artifact Preview / Download | inherited from registry/detail           | `certificate.download`                          | —                                                                               | B         |
| Issue Confirmation Dialog   | inherited                                | `certificate.read`                              | `certificate.issue`                                                             | B         |
| Revoke Dialog               | inherited                                | `certificate.read`                              | `certificate.revoke`                                                            | B / G     |
| Verification Activity       | `certificate.menu.verification-activity` | `certificate.verification.activity.read`        | —                                                                               | B / G     |
| Lifecycle / Audit View      | `certificate.menu.audit`                 | `certificate.audit.read`                        | —                                                                               | B / G     |
| Reissue Request List        | `certificate.menu.reissue`               | `certificate.reissue.read`                      | request/approve permissions where applicable                                    | B         |
| Reissue Request Detail      | `certificate.menu.reissue`               | `certificate.reissue.read`                      | `certificate.reissue.approve`, `certificate.reissue.generate`                   | B         |
| Report Catalog              | `certificate.menu.reports`               | `certificate.report.read`                       | report-specific permission                                                      | B / C / G |
| Registry Report Export      | `certificate.menu.reports`               | `certificate.report.registry`                   | `certificate.report.export`                                                     | B / C     |
| Student My Certificates     | `certificate.menu.student-certificates`  | `certificate.student.read-own`                  | `certificate.student.download-own`                                              | S         |
| Student My Reissue Requests | `certificate.menu.student-reissue`       | `certificate.reissue.read` / self entitlement   | `certificate.student.reissue-own`                                               | S         |
| Trainer Certificate Status  | `certificate.menu.trainer-status`        | `certificate.trainer-status.read`               | —                                                                               | T         |
| Public Verification         | None                                     | None; public route policy applies               | None                                                                            | P         |

---

# 9. Permission-to-API Mapping

| API ID       | Endpoint Purpose                  | Permission                                                      | Scope                     |
| ------------ | --------------------------------- | --------------------------------------------------------------- | ------------------------- |
| API-CERT-001 | List certificate readiness        | `certificate.read`                                              | B                         |
| API-CERT-002 | Readiness detail                  | `certificate.read`                                              | B                         |
| API-CERT-003 | Generate certificate              | `certificate.generate`                                          | B                         |
| API-CERT-004 | Search registry                   | `certificate.read`                                              | B                         |
| API-CERT-005 | Certificate detail                | `certificate.read`                                              | B                         |
| API-CERT-006 | Artifact download                 | `certificate.download`                                          | B                         |
| API-CERT-007 | Issue certificate                 | `certificate.issue`                                             | B                         |
| API-CERT-008 | Revoke certificate                | `certificate.revoke`                                            | B / G explicit            |
| API-CERT-009 | Verification activity             | `certificate.verification.activity.read`                        | B / G                     |
| API-CERT-010 | Lifecycle/audit view              | `certificate.audit.read`                                        | B / G                     |
| API-CERT-011 | Submit reissue request            | `certificate.reissue.request`                                   | B                         |
| API-CERT-012 | List reissue requests             | `certificate.reissue.read`                                      | B                         |
| API-CERT-013 | Reissue request detail            | `certificate.reissue.read`                                      | B                         |
| API-CERT-014 | Approve reissue request           | `certificate.reissue.approve`                                   | B                         |
| API-CERT-015 | Reject reissue request            | `certificate.reissue.approve`                                   | B                         |
| API-CERT-016 | Generate replacement              | `certificate.reissue.generate`                                  | B                         |
| API-CERT-017 | Public verify by code             | Public route policy                                             | P                         |
| API-CERT-018 | Public QR/deep-link verify        | Public route policy                                             | P                         |
| API-CERT-019 | Student own list                  | `certificate.student.read-own` or equivalent portal entitlement | S                         |
| API-CERT-020 | Student own detail                | `certificate.student.read-own`                                  | S                         |
| API-CERT-021 | Student own download              | `certificate.student.download-own`                              | S                         |
| API-CERT-022 | Student submit own reissue        | `certificate.student.reissue-own`                               | S                         |
| API-CERT-023 | Student list own reissue requests | `certificate.student.reissue-own` or self read entitlement      | S                         |
| API-CERT-024 | Trainer downstream status         | `certificate.trainer-status.read`                               | T                         |
| API-CERT-025 | Certificate dashboard             | `certificate.read` and/or dashboard/report policy               | B / C                     |
| API-CERT-026 | Registry report query             | `certificate.report.read` + `certificate.report.registry`       | B / C                     |
| API-CERT-027 | Registry export                   | API-CERT-026 permissions + `certificate.report.export`          | B / C                     |
| API-CERT-028 | Request notification              | `certificate.notification.request`                              | B / S according to caller |

---

# 10. Branch-Scoping Rules by Permission Category

## 10.1 Branch-Scoped Operational Permissions

The following are branch-scoped by default:

```text
certificate.read
certificate.download
certificate.generate
certificate.issue
certificate.reissue.request
certificate.reissue.read
certificate.reissue.approve
certificate.reissue.generate
certificate.notification.request
certificate.report.read
certificate.report.export
certificate.report.registry
certificate.report.issuance
certificate.report.readiness
certificate.report.reissue
```

The authoritative branch is resolved through the certificate's Enrollment/Batch/Branch relationship or the denormalized branch key in an approved read model. The client cannot select an arbitrary branch to bypass scope.

## 10.2 Branch or Global Compliance Permissions

These may be branch-scoped or explicitly global:

```text
certificate.revoke
certificate.verify.internal
certificate.verification.activity.read
certificate.audit.read
certificate.report.revocation
certificate.report.verification
certificate.report.audit
```

Global access must be an explicit IAM policy outcome. It must not be inferred from role names.

## 10.3 Consolidated-Report Permissions

The following may operate across multiple authorized branches only for reporting:

```text
certificate.report.read
certificate.report.export
certificate.report.registry
certificate.report.issuance
certificate.report.readiness
certificate.report.reissue
certificate.report.revocation
certificate.report.verification
certificate.report.audit
certificate.report.executive
```

`C` scope never grants cross-branch mutation.

## 10.4 Self-Scoped Permissions

```text
certificate.student.read-own
certificate.student.download-own
certificate.student.reissue-own
```

Self-scope is resolved from authenticated user -> Person -> StudentProfile -> Enrollment -> Certificate. A student-supplied `studentProfileId`, `personId`, or `enrollmentId` is never trusted as the authorization source.

## 10.5 Trainer-Scoped Permission

```text
certificate.trainer-status.read
```

Trainer scope is resolved from authenticated user/person -> TrainerProfile -> authorized BatchTrainer/Session relationships -> related Enrollment certificate-status read model. Trainer access remains read-only.

---

# 11. Authorization Decision Tables

## 11.1 Internal Branch-Scoped Read

| Check                                                        | Failure Result                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Authenticated session exists                                 | `401 UNAUTHENTICATED`                                            |
| Required permission granted                                  | `403 PERMISSION_DENIED`                                          |
| Resource branch is in effective branch set                   | `403 BRANCH_SCOPE_DENIED` or concealed `404` per endpoint policy |
| Resource exists and is not unavailable by soft-delete policy | `404 NOT_FOUND`                                                  |
| Field-level redaction policy satisfied                       | Restricted fields omitted                                        |

## 11.2 Sensitive Mutation

| Check                                                | Failure Result                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Authenticated                                        | 401                                                                                       |
| Action permission granted                            | 403                                                                                       |
| Resource within branch scope                         | 403/404                                                                                   |
| Current aggregate version matches `expectedVersion`  | `409 VERSION_CONFLICT`                                                                    |
| Lifecycle transition allowed                         | `409 INVALID_STATE_TRANSITION`                                                            |
| Upstream authoritative gates pass where required     | `422 COMPLETION_NOT_APPROVED`, `PAYMENT_VALIDATION_FAILED`, or `CERTIFICATE_NOT_ELIGIBLE` |
| Idempotency key valid where required                 | `409 IDEMPOTENCY_KEY_CONFLICT`                                                            |
| Audit write accepted according to transaction policy | Command fails or compensating operational path applies according to architecture decision |

## 11.3 Consolidated Report

| Check                                                       | Failure Result |
| ----------------------------------------------------------- | -------------- |
| Authenticated                                               | 401            |
| Menu/report permissions present                             | 403            |
| Report-specific permission present                          | 403            |
| `canViewConsolidated = true`                                | 403            |
| Requested branches subset of effective authorized hierarchy | 403            |
| Export permission present for export                        | 403            |

---

# 12. Field and Data Visibility Rules

Permission to read a certificate does not automatically expose all related cross-context fields.

| Data Category                 | Certificate Operator               | Manager                            | Finance User                                     | Auditor                                                     | Student                                    | Trainer                            | Public Verifier                         |
| ----------------------------- | ---------------------------------- | ---------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------- | --------------------------------------- |
| Certificate number/status     | Yes                                | Yes                                | Yes                                              | Yes                                                         | Own only                                   | Status only in trainer scope       | Verification result subset              |
| Student display name          | Yes                                | Yes                                | Yes where operationally required                 | Yes                                                         | Own                                        | Limited authorized learner context | Minimal public display only as approved |
| Course/batch name             | Yes                                | Yes                                | Yes                                              | Yes                                                         | Own                                        | Authorized training scope          | Minimal approved display                |
| Completion gate result        | Read outcome only                  | Read outcome only                  | Read outcome only                                | Read evidence projection                                    | No internal evidence                       | No internal evidence               | No                                      |
| Raw marks/attendance evidence | No by Certificate permission alone | No by Certificate permission alone | No                                               | Only via separately authorized Completion/Attendance access | No                                         | No                                 | No                                      |
| Payment validation result     | Boolean/status outcome only        | Outcome only                       | Finance-authorized detail through Finance module | Evidence only with Finance/Audit permission                 | No payment details through Certificate API | No                                 | No                                      |
| Verification activity         | With permission                    | With permission                    | No                                               | With permission                                             | No                                         | No                                 | No history; only immediate result       |
| Audit history                 | With audit permission              | With audit permission              | No                                               | Yes                                                         | No                                         | No                                 | No                                      |
| Civil ID/passport/visa        | No by Certificate permission alone | No by Certificate permission alone | No by Certificate permission alone               | Only through separate authorized data owner                 | No                                         | No                                 | Never                                   |
| Invoice/payment details       | No                                 | No                                 | Through Finance context only                     | Through separately authorized Finance/Audit access          | No                                         | No                                 | Never                                   |

---

# 13. Permission Assignment Rules

## 13.1 Mandatory Rules

1. Permission assignment is managed by IAM, not Certificate Management.
2. Certificate module code must check permission codes, never role names.
3. Menu permission is insufficient for data access.
4. Action permission is insufficient without resource scope.
5. Report access is separate from operational read access.
6. Export is separate from report read.
7. Consolidated reporting is a separate scope entitlement, not implied by report permission.
8. Global scope must be explicitly granted.
9. Student self-service permissions cannot be reused for administrative access.
10. Trainer status permission cannot be used to generate, issue, download, revoke, or reissue certificates.
11. Public verification does not create an IAM user permission requirement.
12. Service identities receive minimal explicit grants and cannot inherit human role assumptions.

## 13.2 Recommended Approval Governance for High-Risk Grants

The following grants should require elevated IAM administration and audit:

```text
certificate.generate
certificate.issue
certificate.reissue.approve
certificate.reissue.generate
certificate.revoke
certificate.audit.read with global scope
certificate.report.audit with global scope
certificate.report.export with consolidated/global scope
```

---

# 14. DDD Ownership and Permission Boundary Check

| Capability                             | Owning Context                                       | Certificate Permission Role                                                                                  | Boundary Result |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------- |
| Authenticate user                      | Identity & Access                                    | Certificate consumes authenticated principal                                                                 | Aligned         |
| Grant/revoke roles and permissions     | Identity & Access                                    | No Certificate permission to manage IAM                                                                      | Aligned         |
| Resolve branch access                  | Identity & Access                                    | Certificate consumes effective scope                                                                         | Aligned         |
| Evaluate completion rules              | Exam, Result & Completion                            | Certificate reads approved outcome only                                                                      | Aligned         |
| Record exam results                    | Exam, Result & Completion                            | No Certificate permission exists                                                                             | Aligned         |
| Calculate attendance percentage        | Attendance / Completion evaluation                   | No Certificate permission exists                                                                             | Aligned         |
| Determine payment truth                | Finance & Receivables                                | Certificate reads validation outcome only                                                                    | Aligned         |
| Create invoice/payment/refund          | Finance & Receivables                                | No Certificate permission exists                                                                             | Aligned         |
| Generate/issue/revoke certificate      | Certificate Management                               | Certificate action permissions                                                                               | Aligned         |
| Verify certificate                     | Certificate Management                               | Internal permission or public policy                                                                         | Aligned         |
| Manage reissue request and replacement | Certificate Management; approval history Audit-owned | Certificate action permissions + Audit integration                                                           | Aligned         |
| Store audit history                    | Audit & Compliance                                   | Certificate emits/requests audit evidence; reads via `certificate.audit.read` projection                     | Aligned         |
| Send notification                      | Communication & Notification                         | Certificate requests delivery; does not own provider send permissions                                        | Aligned         |
| Build executive aggregate reports      | Reporting & Dashboards                               | Certificate report permissions govern access to certificate report views; Reporting remains read-model owner | Aligned         |

### 14.1 Permissions That Must Not Exist in This Module

The following permission patterns would violate the DDD ownership model and must not be introduced under the Certificate module namespace:

```text
certificate.completion.approve
certificate.completion.evaluate
certificate.result.record
certificate.attendance.override
certificate.payment.mark-paid
certificate.invoice.update
certificate.refund.approve
certificate.user.role.assign
certificate.branch.access.grant
certificate.audit.delete
```

Any UI needing such behavior must navigate to or call the owning context's authorized application service.

---

# 15. Audit Requirements for Permission-Sensitive Actions

| Action                     | Required Audit Content                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate certificate       | actor, enrollment/certificate identity, source eligibility/payment outcomes, certificate number allocation result, timestamp, branch, request/idempotency correlation |
| Issue certificate          | actor, certificate, old/new status, issued timestamp, branch, reason/remarks where applicable                                                                         |
| Submit reissue request     | requester, certificate, reason, source channel, timestamp, branch/self-scope source                                                                                   |
| Approve/reject reissue     | approver, request, old/new status, decision, remarks, timestamp                                                                                                       |
| Generate replacement       | actor, original certificate, reissue request, new certificate, lineage linkage, timestamp                                                                             |
| Revoke certificate         | actor, certificate, old/new status, reason, timestamp, branch/scope, approval reference if required                                                                   |
| Consolidated/global export | actor, report type, filters, branch set, record count, export format, timestamp                                                                                       |
| Global audit access        | actor, query criteria, target branch/resource scope, timestamp according to security logging policy                                                                   |
| IAM permission changes     | Owned and audited by IAM/Audit contexts; Certificate module must not write these changes                                                                              |

---

# 16. Negative Authorization Scenarios

| Scenario                                                                                           | Expected Result                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| User sees Generate button through stale UI but lacks `certificate.generate`                        | API returns 403; no certificate created.                                                                                            |
| Branch A operator submits Branch B certificate ID directly                                         | 403/404 according to endpoint concealment policy; no data leakage.                                                                  |
| User has `certificate.report.read` but not consolidated entitlement and requests multiple branches | 403; query must not silently expand scope.                                                                                          |
| User has consolidated-report access and attempts cross-branch revocation                           | Denied unless separately granted mutation permission and target branch scope. Consolidated report access never authorizes mutation. |
| Student alters certificate ID to another student's certificate                                     | 404/403; own-scope resolver rejects access.                                                                                         |
| Trainer requests artifact download for learner in assigned batch                                   | Denied; trainer status permission is read-only and does not include artifact access.                                                |
| Support user attempts reissue approval                                                             | 403; request/read permission does not imply approval.                                                                               |
| Certificate Administrator attempts completion approval through Certificate API                     | Route must not exist; owning Completion context handles it.                                                                         |
| Auditor has global audit read but no revoke permission                                             | Can view audit data but cannot revoke.                                                                                              |
| Anonymous user calls internal verification activity endpoint                                       | 401; anonymous access only through restricted public verification endpoints.                                                        |

---

# 17. Seed and Migration Guidance

The following permission records should be seeded into the IAM permission catalog under module code `CERTIFICATE` or the repository's equivalent module identifier.

## 17.1 Menu Permission Seed List

```text
certificate.menu.dashboard
certificate.menu.readiness
certificate.menu.registry
certificate.menu.reissue
certificate.menu.verification-activity
certificate.menu.audit
certificate.menu.reports
certificate.menu.student-certificates
certificate.menu.student-reissue
certificate.menu.trainer-status
```

## 17.2 Action Permission Seed List

```text
certificate.read
certificate.download
certificate.generate
certificate.issue
certificate.revoke
certificate.verify.internal
certificate.verification.activity.read
certificate.audit.read
certificate.reissue.request
certificate.reissue.read
certificate.reissue.approve
certificate.reissue.generate
certificate.notification.request
certificate.trainer-status.read
certificate.student.read-own
certificate.student.download-own
certificate.student.reissue-own
```

## 17.3 Report Permission Seed List

```text
certificate.report.read
certificate.report.export
certificate.report.registry
certificate.report.issuance
certificate.report.readiness
certificate.report.reissue
certificate.report.revocation
certificate.report.verification
certificate.report.audit
certificate.report.executive
```

### 17.4 Migration Rule

Where earlier implementation work has already created aliases such as `certificate.reissue.submit`, `certificate.reissue.reject`, or `certificate.verify.read`, migration must either:

1. map existing role grants to the canonical permissions in this document and retire the aliases; or
2. retain aliases temporarily as compatibility mappings while all API/UI guards migrate to the canonical catalog.

Duplicate permissions with identical semantics should not remain indefinitely because they create inconsistent authorization behavior.

---

# 18. Final Permission Model Summary

Certificate Management authorization is intentionally layered:

```text
IAM role composition
        ↓
Fine-grained menu / action / report permission
        ↓
Branch, global, consolidated, self, trainer, or public scope
        ↓
Application-service authorization guard
        ↓
Aggregate state and cross-context business-rule validation
        ↓
Audited sensitive action
```

The model ensures that:

- operational users work only within authorized branches;
- executives can receive consolidated visibility without cross-branch mutation rights;
- auditors can receive controlled branch or global read visibility without automatically receiving lifecycle mutation rights;
- students can access only their own certificates;
- trainers receive narrowly scoped downstream status visibility only;
- public users can verify certificates without receiving internal data access;
- Certificate permissions cannot be used to mutate Completion, Finance, Attendance, IAM, or Audit-owned source data;
- dynamic RBAC remains the IAM source of truth, with no hardcoded role-name authorization in Certificate Management.
