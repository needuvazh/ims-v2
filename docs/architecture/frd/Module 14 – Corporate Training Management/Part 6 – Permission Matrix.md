# Part 6 – Permission Matrix

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Authorization Model | Dynamic RBAC with server-side branch, account, assignment, and self-scope enforcement |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1–5 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the permission model for Module 14 – Corporate Training Management.

The matrix is capability-oriented and does not make business roles the source of authorization truth. Roles are recommended permission bundles managed by Identity & Access Management. At runtime, the server must authorize every request from:

```text
Authenticated User
    +
Granted Permission Code
    +
Assigned Branch Scope
    +
Account / Assignment / Self Scope
    +
Entity Lifecycle Guard
    +
Cross-Context Authorization, where applicable
```

A visible menu item or enabled UI button is never sufficient authorization.

---

# 2. Authorization Principles

## 2.1 Dynamic RBAC

The following rules are mandatory:

1. Roles must not be hardcoded into Corporate Training application services.
2. CTM application services check permission codes, not role names.
3. IAM owns `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, and branch-access assignment.
4. CTM defines the capability catalog required by this module; IAM grants those capabilities.
5. A user may have multiple roles.
6. Denied branch or account scope cannot be bypassed by possession of a permission code.
7. Cross-context operations require the owning context's authorization where that context exposes a user-driven command.
8. Consolidated reporting requires both:
   - the relevant report permission; and
   - explicit consolidated scope.
9. External users use account- or self-scoped permissions and never inherit ASTI staff branch administration semantics.
10. Sensitive fields require field-level permissions in addition to entity read permissions.

---

# 3. Scope Legend

| Code | Scope | Meaning |
|---|---|---|
| `B` | Branch-scoped | Access limited to the user's active/assigned branch set and permitted child branches |
| `G` | Global administrative | Cross-branch capability intended only for explicitly authorized central administration |
| `C` | Consolidated-report only | May aggregate across authorized branches for reports/dashboard reads only; does not grant cross-branch mutation |
| `A` | Corporate-account scoped | Limited to explicitly assigned/authorized CorporateAccount records |
| `X` | External corporate account scope | Limited to the authenticated external user's own CorporateAccount relationship |
| `S` | Self-scoped | Limited to the authenticated participant/student/trainer identity |
| `D` | Derived assignment scope | Limited to batches, enrollments, participants, or sessions assigned to the actor |
| `N/A` | No CTM transaction scope | Capability belongs to another bounded context |

### Scope Precedence

```text
Permission Granted
    ↓
Resolve User Scope
    ↓
Intersect Permission Scope with Assigned Branches
    ↓
Apply Account / Assignment / Self Restrictions
    ↓
Apply Entity Lifecycle Rules
    ↓
Authorize or Deny
```

A client-supplied `branchId`, `corporateAccountId`, `participantId`, or `enrollmentId` is never accepted as authorization evidence.

---

# 4. Business Role Catalog

## 4.1 Internal Business Roles

| Role | Purpose | Default CTM Access Pattern |
|---|---|---|
| Corporate Training Administrator | Full operational administration of corporate customers, contracts, participants, and enrollment coordination | Broad branch-scoped operational access |
| Corporate Account Manager | Manages customer relationship, contacts, contracts, and account visibility | Branch/account-scoped |
| Corporate Sales / Marketing User | Handover and delivery-status visibility after quotation/order confirmation | Read-only CTM access |
| Admission / Enrollment Officer | Performs enrollment creation through Admission & Enrollment boundary | CTM participant/enrollment coordination reads plus orchestration permission where approved |
| Training Coordinator | Coordinates participants, batches, readiness, and delivery status | Branch-scoped participant and enrollment operations |
| Branch Manager | Supervises branch CTM operations and exceptions | Branch/child-branch read, lifecycle approval where granted |
| Finance User | Uses CTM linkage to perform Finance-context billing and receivable operations | CTM read-only; Finance mutations remain outside CTM |
| Trainer | Views assigned corporate training and roster | Assignment-scoped |
| Academic Coordinator | Uses corporate linkage during completion review | Read-only limited operational linkage |
| Certificate Administrator | Uses corporate linkage for certificate operations in Certificate context | Read-only limited operational linkage |
| Compliance / Document Verifier | Verifies documents in Document Management context | CTM account/participant read only as required |
| Auditor / Compliance Reviewer | Reviews audit evidence and traceability | Read-only audit/reconciliation visibility |
| Executive / Management Viewer | Reviews consolidated CTM KPIs and reports | Consolidated-report only |
| IAM Administrator | Maintains roles and permission assignments | No implied CTM business data access |

## 4.2 External Roles

| Role | Purpose | Scope |
|---|---|---|
| Corporate Coordinator | Submits/manages approved participant information and views own organization's training status where portal capability is enabled | `X` |
| Corporate Primary Contact | Views permitted contract/training information and receives communication | `X` |
| Corporate Participant / Student | Views own corporate training status | `S` |
| Trainer Portal User | Views assigned corporate training and roster | `D` |

---

# 5. Action-Level Permission Catalog

## 5.1 Corporate Account Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.account.read` | View corporate account list/detail within authorized scope | B/A/G | No |
| `corporate-training.account.create` | Create CTM CorporateAccount linked to Organization | B/G | Yes |
| `corporate-training.account.update` | Update CTM-owned operational account fields | B/A/G | Yes |
| `corporate-training.account.status.manage` | Activate, suspend, or otherwise transition account lifecycle state | B/G | Yes |
| `corporate-training.account.archive` | Soft-delete/archive account when guards allow | B/G | Yes |
| `corporate-training.account.sensitive-finance.read` | View credit/commercial fields permitted for CTM read surfaces | B/A/G | Yes |
| `corporate-training.account.audit.read` | View account-level CTM audit metadata and linked audit references | B/A/G | Yes |

## 5.2 Corporate Contact Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.contact.read` | View CTM corporate contacts | B/A/G | No |
| `corporate-training.contact.create` | Create CorporateContact relationship after Person resolution | B/A/G | Yes |
| `corporate-training.contact.update` | Update CTM-owned contact relationship fields | B/A/G | Yes |
| `corporate-training.contact.deactivate` | Deactivate contact linkage | B/A/G | Yes |
| `corporate-training.contact.primary.manage` | Change primary contact designation | B/A/G | Yes |
| `corporate-training.contact.portal-access.manage` | Enable/disable portal-access flag when portal policy is enabled | B/A/G | Yes |

## 5.3 Corporate Contract Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.contract.read` | View contracts within scope | B/A/G | No |
| `corporate-training.contract.create` | Create a corporate contract | B/A/G | Yes |
| `corporate-training.contract.update` | Update editable contract terms before lifecycle restrictions apply | B/A/G | Yes |
| `corporate-training.contract.status.manage` | Activate, suspend, expire, terminate, or otherwise transition contract state | B/G | Yes |
| `corporate-training.contract.commercial.read` | View contract value, billing model, and payment terms | B/A/G | Yes |
| `corporate-training.contract.audit.read` | View contract audit metadata/history references | B/A/G | Yes |

## 5.4 Corporate Participant Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.participant.read` | View corporate participants | B/A/G | No |
| `corporate-training.participant.create` | Register participant relationship after identity resolution | B/A/G | Yes |
| `corporate-training.participant.update` | Update CTM-owned participant employment metadata | B/A/G | Yes |
| `corporate-training.participant.status.manage` | Activate/deactivate participant relationship | B/A/G | Yes |
| `corporate-training.participant.identity-sensitive.read` | View unmasked Civil ID/passport-derived identity data where justified | B/A/G | Yes |
| `corporate-training.participant.import` | Upload and validate bulk participant import | B/A/G/X* | Yes |
| `corporate-training.participant.import.commit` | Commit validated import rows to CTM-owned entities | B/A/G | Yes |
| `corporate-training.participant.audit.read` | View participant audit metadata/history references | B/A/G | Yes |

`X*` applies only if a future corporate portal explicitly enables controlled nomination upload; commit remains an internal operation unless separately approved.

## 5.5 Corporate Enrollment Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.enrollment.read` | View CTM CorporateEnrollment linkage and read-only operational projection | B/A/G | No |
| `corporate-training.enrollment.create` | Orchestrate one corporate enrollment through owning contexts | B/A/G | Yes |
| `corporate-training.enrollment.bulk.create` | Orchestrate bulk corporate enrollment | B/A/G | Yes |
| `corporate-training.enrollment.billing-status.manage` | Update CTM-owned billing coordination status only | B/A/G | Yes |
| `corporate-training.enrollment.cross-context-finance.read` | View Finance-derived billing/receivable projection | B/A/G/X | Yes |
| `corporate-training.enrollment.cross-context-attendance.read` | View Attendance-derived training participation status | B/A/G/X/S/D | No |
| `corporate-training.enrollment.cross-context-completion.read` | View Completion-derived status | B/A/G/X/S/D | No |
| `corporate-training.enrollment.cross-context-certificate.read` | View Certificate-derived issue status | B/A/G/X/S | No |

## 5.6 Reconciliation and Recovery Permissions

| Permission Code | Description | Default Scope | Sensitive |
|---|---|---:|---:|
| `corporate-training.reconciliation.read` | View CTM linkage inconsistencies and reconciliation status | B/G | Yes |
| `corporate-training.reconciliation.repair` | Execute approved deterministic linkage repair | B/G | Yes |
| `corporate-training.reconciliation.audit.read` | View repair evidence and audit correlation IDs | B/G | Yes |

## 5.7 Export Permissions

| Permission Code | Description | Default Scope |
|---|---|---:|
| `corporate-training.report.export` | Request/download an export for a report the actor is separately authorized to read | B/A/C/G |

Export permission never grants report visibility by itself.

## 5.8 Portal/Self-Service Permissions

| Permission Code | Description | Scope |
|---|---|---:|
| `student.corporate-training.self.read` | Student/participant reads own corporate training status | S |
| `trainer.corporate-training.assignment.read` | Trainer views assigned corporate training deliveries | D |
| `trainer.corporate-training.roster.read` | Trainer views roster for assigned batch/session only | D |
| `corporate-portal.training.read` | Corporate user views own organization's training status | X |
| `corporate-portal.participant.submit` | Corporate Coordinator submits participant/nomination data where portal feature is approved | X |
| `corporate-portal.contract.read` | Corporate Primary Contact views permitted own-account contract summary | X |
| `corporate-portal.finance-summary.read` | Authorized corporate contact views own-account Finance projection | X |

---

# 6. Menu-Level Permissions

Menu permissions control navigation visibility only. The server must still enforce the action permission required by the underlying route or command.

| Permission Code | Menu / Navigation Item | Default Scope |
|---|---|---:|
| `menu.corporate-training` | Corporate Training module root | B/A/G/C |
| `menu.corporate-training.accounts` | Corporate Accounts | B/A/G |
| `menu.corporate-training.contacts` | Corporate Contacts | B/A/G |
| `menu.corporate-training.contracts` | Corporate Contracts | B/A/G |
| `menu.corporate-training.participants` | Corporate Participants | B/A/G |
| `menu.corporate-training.participant-import` | Participant Import | B/A/G |
| `menu.corporate-training.enrollments` | Corporate Enrollments | B/A/G |
| `menu.corporate-training.bulk-enrollment` | Bulk Corporate Enrollment | B/A/G |
| `menu.corporate-training.operations` | Corporate Training Operations / Account 360 | B/A/G |
| `menu.corporate-training.reconciliation` | Reconciliation & Recovery | B/G |
| `menu.corporate-training.reports` | Corporate Training Reports | B/A/C/G |
| `menu.student.corporate-training` | My Corporate Training | S |
| `menu.trainer.corporate-training` | Assigned Corporate Training | D |
| `menu.corporate-portal.training` | Organization Training | X |

### Menu Rendering Rule

A menu item should normally require both:

```text
Menu Permission
AND
At Least One Usable Underlying Action/Read Permission
```

Example:

```text
menu.corporate-training.contracts
AND
corporate-training.contract.read
```

Possessing a menu permission without a usable underlying permission must not expose an unusable route.

---

# 7. Report-Level Permissions

## 7.1 Operational Reports

| Permission Code | Report | Scope |
|---|---|---:|
| `corporate-training.report.account-summary.read` | Corporate Account Summary | B/A/C/G |
| `corporate-training.report.contract-status.read` | Contract Status and Expiry | B/A/C/G |
| `corporate-training.report.participant-register.read` | Corporate Participant Register | B/A/C/G |
| `corporate-training.report.enrollment-status.read` | Corporate Enrollment Status | B/A/C/G |
| `corporate-training.report.training-status.read` | Training Delivery Status | B/A/C/G |
| `corporate-training.report.batch-allocation.read` | Participant-to-Batch Allocation | B/A/C/G |
| `corporate-training.report.document-compliance.read` | Corporate/Participant Document Compliance Projection | B/A/C/G |
| `corporate-training.report.corporate-revenue.read` | Corporate Revenue Projection | B/A/C/G |
| `corporate-training.report.receivables-summary.read` | Corporate Receivables Summary Projection | B/A/C/G |
| `corporate-training.report.certificate-status.read` | Corporate Certificate Status Projection | B/A/C/G |
| `corporate-training.report.branch-performance.read` | Corporate Training Branch Performance | B/C/G |
| `corporate-training.report.account-360.read` | Corporate Account 360 Report | B/A/C/G |

Cross-context report data remains owned by the source context. Report permission authorizes consumption of an approved read model; it does not permit CTM to mutate source transactions.

## 7.2 Consolidated Report Permissions

| Permission Code | Purpose | Scope |
|---|---|---:|
| `corporate-training.report.consolidated.read` | Enables cross-branch aggregation for CTM reports already granted to the actor | C |
| `corporate-training.dashboard.executive.read` | View consolidated executive CTM KPI dashboard | C |
| `corporate-training.dashboard.branch.read` | View CTM dashboard for current/authorized branch scope | B |
| `corporate-training.dashboard.account-manager.read` | View assigned account portfolio dashboard | A |

### Consolidated Permission Rule

`corporate-training.report.consolidated.read` is an additive scope permission. It is not a wildcard report permission.

Example:

```text
Allowed:
corporate-training.report.contract-status.read
+
corporate-training.report.consolidated.read
+
AuthContext.canViewConsolidated = true

Result:
Consolidated Contract Status report across authorized branch tree

Not Allowed:
corporate-training.report.consolidated.read alone

Result:
No report access
```

---

# 8. Internal Role × Action Permission Matrix

Legend:

- `✓B` = allowed, branch-scoped
- `✓A` = allowed, assigned-account scoped
- `✓G` = global only when explicitly assigned
- `R-B` = branch-scoped read only
- `R-A` = account-scoped read only
- `D` = derived assignment scope
- `—` = not granted by default
- `CTX` = operation belongs to another context; CTM role does not grant that mutation

## 8.1 Account, Contact, and Contract Permissions

| Role | Account Read | Account Create | Account Update | Account Status | Account Archive | Contact Manage | Contract Read | Contract Create/Update | Contract Status |
|---|---|---|---|---|---|---|---|---|---|
| CTM Administrator | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B |
| Account Manager | ✓A | ✓B | ✓A | — | — | ✓A | ✓A | ✓A | — |
| Sales/Marketing User | R-A | — | — | — | — | R-A | R-A | — | — |
| Enrollment Officer | R-B | — | — | — | — | — | R-B | — | — |
| Training Coordinator | R-B | — | — | — | — | R-B | R-B | — | — |
| Branch Manager | ✓B | — | — | ✓B | — | R-B | ✓B | — | ✓B |
| Finance User | R-B | — | — | — | — | — | R-B | — | — |
| Trainer | — | — | — | — | — | — | — | — | — |
| Academic Coordinator | R-B | — | — | — | — | — | R-B | — | — |
| Certificate Administrator | R-B | — | — | — | — | — | R-B | — | — |
| Compliance Verifier | R-B | — | — | — | — | R-B | R-B | — | — |
| Auditor | R-B | — | — | — | — | R-B | R-B | — | — |
| Executive Viewer | — | — | — | — | — | — | — | — | — |

## 8.2 Participant and Enrollment Permissions

| Role | Participant Read | Participant Create/Update | Participant Status | Import Validate | Import Commit | Enrollment Read | Single Enrollment | Bulk Enrollment | Billing Status |
|---|---|---|---|---|---|---|---|---|---|
| CTM Administrator | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B |
| Account Manager | ✓A | ✓A | — | ✓A | — | ✓A | — | — | — |
| Sales/Marketing User | R-A | — | — | — | — | R-A | — | — | — |
| Enrollment Officer | ✓B | — | — | — | — | ✓B | ✓B | ✓B | — |
| Training Coordinator | ✓B | ✓B | — | ✓B | — | ✓B | ✓B | ✓B | — |
| Branch Manager | ✓B | — | ✓B | R-B | — | ✓B | — | — | R-B |
| Finance User | R-B | — | — | — | — | R-B | — | — | ✓B* |
| Trainer | D | — | — | — | — | D | — | — | — |
| Academic Coordinator | R-B | — | — | — | — | R-B | — | — | — |
| Certificate Administrator | R-B | — | — | — | — | R-B | — | — | — |
| Compliance Verifier | R-B | — | — | — | — | R-B | — | — | — |
| Auditor | R-B | — | — | — | — | R-B | — | — | R-B |
| Executive Viewer | — | — | — | — | — | — | — | — | — |

`*` Finance User may update only CTM's coordination status when explicitly required by approved integration/workflow. Invoice, payment, receipt, refund, credit note, and receivable mutations remain Finance-context commands.

---

# 9. Internal Role × Menu Permission Matrix

| Role | Module Root | Accounts | Contacts | Contracts | Participants | Import | Enrollments | Bulk Enrollment | Operations | Reconciliation | Reports |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CTM Administrator | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B |
| Account Manager | ✓A | ✓A | ✓A | ✓A | ✓A | ✓A | ✓A | — | ✓A | — | ✓A |
| Sales/Marketing User | ✓A | ✓A | ✓A | ✓A | ✓A | — | ✓A | — | ✓A | — | ✓A |
| Enrollment Officer | ✓B | R-B | — | R-B | ✓B | — | ✓B | ✓B | ✓B | — | ✓B |
| Training Coordinator | ✓B | R-B | R-B | R-B | ✓B | ✓B | ✓B | ✓B | ✓B | — | ✓B |
| Branch Manager | ✓B | ✓B | R-B | ✓B | ✓B | — | ✓B | — | ✓B | R-B | ✓B |
| Finance User | ✓B | R-B | — | R-B | — | — | R-B | — | R-B | — | ✓B |
| Trainer | — | — | — | — | — | — | — | — | — | — | — |
| Academic Coordinator | ✓B | R-B | — | R-B | R-B | — | R-B | — | R-B | — | ✓B |
| Certificate Administrator | ✓B | R-B | — | R-B | R-B | — | R-B | — | R-B | — | ✓B |
| Compliance Verifier | ✓B | R-B | R-B | R-B | R-B | — | R-B | — | R-B | — | ✓B |
| Auditor | ✓B | R-B | R-B | R-B | R-B | — | R-B | — | R-B | R-B | ✓B |
| Executive Viewer | ✓C | — | — | — | — | — | — | — | — | — | ✓C |

Trainer portal navigation is controlled by `menu.trainer.corporate-training`, not the admin CTM menu hierarchy.

---

# 10. Internal Role × Report Permission Matrix

Legend:

- `✓B` = branch report
- `✓A` = assigned-account portfolio report
- `✓C` = consolidated report only
- `R-B` = branch-scoped read
- `—` = not granted by default

| Role | Account Summary | Contract Status | Participant Register | Enrollment Status | Training Status | Document Compliance | Corporate Revenue | Receivables | Certificate Status | Branch Performance | Consolidated |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CTM Administrator | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | R-B* | R-B* | ✓B | ✓B | — |
| Account Manager | ✓A | ✓A | ✓A | ✓A | ✓A | ✓A | R-A* | R-A* | ✓A | — | — |
| Sales/Marketing User | ✓A | ✓A | ✓A | ✓A | ✓A | — | R-A* | — | ✓A | — | — |
| Enrollment Officer | R-B | R-B | ✓B | ✓B | ✓B | — | — | — | R-B | — | — |
| Training Coordinator | R-B | R-B | ✓B | ✓B | ✓B | R-B | — | — | R-B | ✓B | — |
| Branch Manager | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B | ✓B* | ✓B* | ✓B | ✓B | Optional |
| Finance User | R-B | R-B | — | R-B | — | — | ✓B* | ✓B* | — | ✓B* | Optional |
| Academic Coordinator | — | R-B | R-B | R-B | ✓B | — | — | — | R-B | — | — |
| Certificate Administrator | — | — | R-B | R-B | R-B | — | — | — | ✓B | — | — |
| Compliance Verifier | — | — | R-B | R-B | R-B | ✓B | — | — | — | — | — |
| Auditor | R-B | R-B | R-B | R-B | R-B | R-B | R-B* | R-B* | R-B | R-B | Optional |
| Executive Viewer | ✓C | ✓C | — | ✓C | ✓C | — | ✓C* | ✓C* | ✓C | ✓C | ✓C |

`*` Requires the corresponding Finance/Reporting data-access permission in addition to CTM report permission.

---

# 11. External Role Permission Matrix

## 11.1 External Action and Read Permissions

| External Role | Own Account Training | Submit Participants | Own Contract Summary | Own Finance Summary | Own Training Status | Own Certificate Status |
|---|---|---|---|---|---|---|
| Corporate Coordinator | ✓X | ✓X* | R-X | Optional X | ✓X | ✓X |
| Corporate Primary Contact | ✓X | — | ✓X | Optional X | ✓X | ✓X |
| Corporate Participant / Student | — | — | — | — | ✓S | ✓S |
| Trainer Portal User | — | — | — | — | ✓D | — |

`*` Controlled external nomination/participant submission is subject to portal feature approval. It must not expose unrestricted internal participant-import commit authority.

## 11.2 External Data Isolation Rules

1. Corporate external users may access only the CorporateAccount linked to their authenticated contact relationship.
2. Corporate users cannot select arbitrary `corporateAccountId` values to widen access.
3. Participant users access only training records linked through their own `Person`/`StudentProfile`.
4. Trainer users access only assigned Batch/Session rosters.
5. Corporate users must never receive another company's participant list, contract information, invoice summary, or certificate list.
6. Sensitive participant identity fields are masked by default.
7. External finance summary is read-only and sourced from Finance-approved projections.

---

# 12. Cross-Context Authorization Matrix

CTM permissions do not automatically grant mutation rights in another bounded context.

| CTM Screen/Operation | Owning Context of Foreign Data/Command | Required Authorization Principle |
|---|---|---|
| Resolve Organization | Organization Management | Organization read/resolve permission or approved internal service policy |
| Resolve/Create Person | Shared Party/Person owner | Identity resolution/create permission through owner service |
| Create StudentProfile / Enrollment | Admission & Enrollment | Admission/Enrollment command permission evaluated by owner service |
| Resolve Course Pricing | Course Catalog | Read/resolve service authorization |
| Validate Batch Capacity | Training Delivery | Batch read/validation service authorization |
| Validate Trainer/Classroom Feasibility | Scheduling | Scheduling read/validation authorization |
| Validate Corporate Credit | Finance & Receivables | Finance service policy; CTM consumes pass/block result |
| View Invoice/Outstanding | Finance & Receivables | Finance read permission plus CTM scope |
| View Attendance | Attendance | Attendance read permission or approved CTM projection policy |
| View Completion | Exam & Completion | Completion read permission or approved projection policy |
| View Certificate | Certificate | Certificate read permission or approved projection policy |
| View Document Verification | Document Management | Document compliance read permission |
| View Audit Evidence | Audit & Compliance | Audit read permission |
| Export Consolidated Report | Reporting & Dashboards | Report permission + consolidated scope + source-field permissions |

### Important Rule

A CTM permission may authorize the CTM orchestration command but the collaborating context still enforces its own invariant and authorization policy.

Example:

```text
corporate-training.enrollment.create
        ↓
Allows user to request CTM enrollment orchestration
        ↓
Admission & Enrollment service validates its own command authorization and invariants
        ↓
Finance validates credit
        ↓
Training Delivery validates batch/capacity
```

CTM must not bypass those checks by directly writing foreign tables.

---

# 13. Branch-Scoping Rules

## 13.1 Current Architectural Constraint

The ER baseline does not yet define an approved direct branch relationship for pre-enrollment CorporateAccount records. Therefore:

1. Production authorization cannot infer CorporateAccount branch scope solely from `Enrollment.branchId`.
2. A formal Account-to-Branch association or approved ownership rule is required before production branch-scoped CorporateAccount CRUD is complete.
3. Until resolved, implementations must not silently treat every CorporateAccount as globally accessible.
4. A temporary implementation must use an explicitly approved branch-assignment policy, not a UI filter.

## 13.2 Branch Read Rules

For branch-scoped users:

```text
Allowed Branch Set =
    Direct UserBranchAccess
    +
    Child Branches only when canViewChildBranches = true
```

For normal operational reads:

```text
requestedEntity.scope ∩ allowedBranchSet ≠ ∅
```

must be true.

## 13.3 Mutation Rules

A user with consolidated-report permission may not mutate outside normal operational branch scope.

```text
Consolidated Read Scope ≠ Mutation Scope
```

Example:

An Executive Viewer may see totals across Muscat and Salalah but cannot edit a Salalah CorporateParticipant unless separately granted operational branch access and the relevant mutation permission.

---

# 14. Permission Conditions by Sensitive Field

| Data | Base Read Permission | Additional Permission |
|---|---|---|
| CorporateAccount basic profile | `corporate-training.account.read` | None |
| Credit limit / exposure fields | `corporate-training.account.read` | `corporate-training.account.sensitive-finance.read` and Finance-approved projection permission where applicable |
| Contract value | `corporate-training.contract.read` | `corporate-training.contract.commercial.read` |
| Payment terms | `corporate-training.contract.read` | `corporate-training.contract.commercial.read` |
| Unmasked Civil ID | `corporate-training.participant.read` | `corporate-training.participant.identity-sensitive.read` |
| Audit metadata/history | Entity read | corresponding `*.audit.read` or Audit-context read permission |
| Finance summary | Enrollment/account read | Finance read permission plus CTM cross-context finance read |
| Reconciliation evidence | `corporate-training.reconciliation.read` | `corporate-training.reconciliation.audit.read` |

Sensitive fields must be omitted or masked in the server DTO. UI hiding alone is insufficient.

---

# 15. Lifecycle Permission Guards

Permission possession does not override state-machine constraints.

| Entity | Transition Category | Permission | Additional Guard |
|---|---|---|---|
| CorporateAccount | Activate/Suspend | `corporate-training.account.status.manage` | Valid lifecycle transition and no blocking invariant |
| CorporateAccount | Archive | `corporate-training.account.archive` | No prohibited active dependency; soft-delete only |
| CorporateContract | Activate/Suspend/Expire/Terminate | `corporate-training.contract.status.manage` | Transition allowed by contract state machine |
| CorporateParticipant | Deactivate/Reactivate | `corporate-training.participant.status.manage` | Must preserve historical enrollment linkage |
| CorporateEnrollment | Billing coordination transition | `corporate-training.enrollment.billing-status.manage` | Must not fabricate Finance transaction state |
| Reconciliation | Repair linkage | `corporate-training.reconciliation.repair` | Deterministic approved repair case and audit reason required |

---

# 16. Recommended Default Role Bundles

These are implementation recommendations for IAM role setup. They are not hardcoded authorization rules.

## 16.1 Corporate Training Administrator Bundle

Recommended:

- all branch-scoped CTM account, contact, contract, participant, enrollment, import, operational report, and reconciliation read permissions;
- enrollment orchestration;
- bulk enrollment;
- import commit;
- report export;
- branch dashboard access.

Not granted automatically:

- consolidated reporting;
- global cross-branch mutation;
- unmasked identity viewing;
- finance-sensitive data;
- reconciliation repair.

These require explicit additional assignment.

## 16.2 Corporate Account Manager Bundle

Recommended:

- assigned-account read;
- account operational update;
- contact management;
- contract create/update;
- participant create/update;
- import validation;
- account-level reports.

Not granted by default:

- account archival;
- contract status transition;
- import commit;
- bulk enrollment;
- reconciliation repair;
- consolidated reporting.

## 16.3 Training Coordinator Bundle

Recommended:

- participant read/create/update;
- participant import validation;
- enrollment read;
- single/bulk enrollment orchestration;
- training-status reports;
- batch allocation report;
- operational dashboard.

## 16.4 Branch Manager Bundle

Recommended:

- branch-wide read;
- account status manage;
- contract status manage;
- participant status manage;
- branch reports;
- branch dashboard.

Optional by policy:

- consolidated report read for permitted branch hierarchy;
- sensitive commercial/finance reads.

## 16.5 Executive Viewer Bundle

Recommended:

- no transaction mutation permissions;
- executive dashboard;
- selected consolidated report permissions;
- `corporate-training.report.consolidated.read`;
- `canViewConsolidated = true`.

---

# 17. Segregation of Duties

The following combinations require deliberate governance review:

| Combination | Risk | Control |
|---|---|---|
| Participant import validation + import commit | Same user validates and commits bulk identity data | Prefer maker-checker for large or high-risk imports |
| Account create + archive | Full lifecycle authority | Audit reason and enhanced review for archive |
| Contract create/update + status activation | Commercial terms creator can self-activate | Consider approval threshold/policy for high-value contracts |
| Enrollment bulk create + reconciliation repair | User can create and repair linkage | Strong audit and separate repair permission |
| Finance-sensitive view + broad consolidated reporting | Excessive exposure of customer financial data | Explicit field-level and report-specific permissions |
| IAM Admin + CTM business permissions | Privilege administration and business operation combined | Keep IAM administration separate where possible |

---

# 18. Denial and UI Behavior

## 18.1 Server Responses

| Condition | HTTP | Application Code |
|---|---:|---|
| Not authenticated | 401 | `AUTHENTICATION_REQUIRED` |
| Permission missing | 403 | `CTM_PERMISSION_DENIED` |
| Branch scope denied | 403 | `CTM_BRANCH_SCOPE_DENIED` |
| Account scope denied | 403 | `CTM_ACCOUNT_SCOPE_DENIED` |
| Self/assignment scope denied | 403 | `CTM_ENTITY_SCOPE_DENIED` |
| Sensitive field permission missing | 403 or field omission | `CTM_SENSITIVE_FIELD_DENIED` |
| Valid permission but lifecycle transition prohibited | 409 | `CTM_INVALID_STATE_TRANSITION` |
| Consolidated scope not granted | 403 | `CTM_CONSOLIDATED_SCOPE_DENIED` |

## 18.2 UI Rules

1. Hide menu entries when the actor lacks the menu permission or any usable child capability.
2. Hide mutation controls when action permission is absent.
3. Disable an action only when permission exists but a visible business prerequisite is unmet.
4. Never display a "no data" empty state when the actual condition is lack of authorization.
5. Hide or mask sensitive columns based on server-provided DTO shape.
6. Consolidated branch selector must appear only when both report permission and consolidated scope are present.
7. External portals must never render internal branch selectors.

---

# 19. Audit Requirements for Permissioned Actions

The following CTM actions require audit correlation:

- CorporateAccount create/update/status/archive;
- primary contact change;
- portal-access flag change;
- CorporateContract create/update/status transition;
- CorporateParticipant create/update/status transition;
- bulk import upload validation summary and commit;
- single/bulk corporate enrollment orchestration;
- billing coordination status change;
- reconciliation repair;
- report export request for sensitive/consolidated datasets.

Audit must capture, directly or through the Audit & Compliance context:

```text
actorUserId
permissionCode
scopeContext
entityType
entityId
action
oldValue
newValue
reason, where required
performedAt
correlationId
requestId
ipAddress, where applicable
```

---

# 20. DDD Ownership Fit Check

| Permission Area | Owner | Fit Decision |
|---|---|---|
| CTM accounts, contacts, contracts, participants, CorporateEnrollment linkage | Corporate Training | CTM permissions defined here |
| Role and permission assignment | Identity & Access | CTM must not own role records |
| Organization legal identity | Organization Management | CTM may resolve/reference only |
| Person master identity | Shared Person/Party owner | CTM may resolve/reference only |
| Enrollment transaction | Admission & Enrollment | CTM orchestration does not grant direct table mutation |
| Course and pricing rules | Course Catalog | CTM consumes resolved result |
| Batch/session delivery | Training Delivery | CTM reads/validates through owner boundary |
| Timetable/conflict logic | Scheduling | CTM consumes feasibility result |
| Invoice/payment/receivable | Finance & Receivables | CTM reads projection; Finance permissions govern source commands |
| Attendance | Attendance | CTM reads projection only |
| Completion | Exam & Completion | CTM reads projection only |
| Certificate issue/verification | Certificate | CTM reads projection only |
| Document verification | Document Management | CTM reads compliance projection |
| Audit history | Audit & Compliance | CTM emits/requests audit; source history owned externally |
| Consolidated reporting | Reporting & Dashboards | Report permission and consolidated scope required |

---

# 21. Permission Gaps and Decisions Required

| Gap ID | Issue | Impact | Required Decision |
|---|---|---|---|
| GAP-CTM-PERM-001 | CorporateAccount has no approved direct branch relation in ER model | Cannot safely implement branch-scoped account CRUD | Define Account-to-Branch authorization relationship or approved ownership policy |
| GAP-CTM-PERM-002 | Corporate portal is a future application structure, while DDD describes portal capabilities | External role permissions cannot be fully activated yet | Confirm portal phase and authentication model |
| GAP-CTM-PERM-003 | Corporate Nomination entity is not approved in ER | Cannot define nomination lifecycle/action permissions against durable aggregate | Approve model and owner before adding nomination CRUD permissions |
| GAP-CTM-PERM-004 | CorporateTrainingProgram/Project is not physically modeled | No project closure permissions should be invented | Resolve aggregate ownership first |
| GAP-CTM-PERM-005 | Credit-related fields overlap CTM ER and Finance DDD responsibilities | Sensitive-field write authority is ambiguous | Define authoritative write owner; recommended Finance for computed exposure/credit validation |
| GAP-CTM-PERM-006 | Exact consolidated dashboard permission catalog is an open DDD question | Executive bundle cannot be final | Approve IAM permission catalog during implementation governance |
| GAP-CTM-PERM-007 | Maker-checker threshold for bulk import and high-value contract activation is not defined | Segregation-of-duty policy incomplete | Define approval thresholds/policy |
| GAP-CTM-PERM-008 | Exact account-assignment model for Account Manager is not defined | `A` scope requires a durable assignment source | Define account portfolio assignment mechanism |

---

# 22. Final Permission Model Summary

The Corporate Training permission model uses three distinct permission layers:

```text
Menu Permission
    → controls navigation visibility

Action Permission
    → controls commands and entity operations

Report Permission
    → controls specific report datasets and dashboards
```

All three layers are further constrained by:

```text
Branch Scope
Corporate Account Scope
Assignment Scope
Self Scope
Consolidated-Report Scope
Sensitive Field Permission
Lifecycle Invariants
Cross-Context Authorization
```

The most important enforcement rule is:

> A permission code never grants unrestricted data access. Every CTM request must be server-authorized against the user's current branch, account, assignment, or self scope, and cross-context data must remain subject to the owning context's authorization rules.

No CTM role grants direct write authority over Enrollment, Course, Batch, Schedule, Invoice, Payment, Attendance, Completion, Certificate, Document Verification, AuditLog, User, Role, or Permission records.
