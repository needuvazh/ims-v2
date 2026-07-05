# Part 6 – Permission Matrix

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines the fine-grained authorization matrix for Module 09. Authorization is permission-based, not role-name based. Role mappings below are recommended default grants for ASTI business roles and may be adjusted by authorized IAM administrators without changing application code.

A user must satisfy both:

1. the required permission; and
2. server-derived branch scope for the target record or report.

Menu visibility is a usability concern only. Hidden menus do not replace server authorization.

## 2. Business Roles

| Role | Type | Module 09 Responsibility |
|---|---|---|
| Super Admin | Internal | Full platform administration subject to explicit sensitive permission grants. |
| Institute Administrator | Internal | Institute-wide operational administration and consolidated reporting. |
| Branch Admin | Internal | Full trainer administration for assigned branch scope, excluding compensation unless separately granted. |
| Branch Manager | Internal | Branch oversight, status control, authorizations, reporting, and audit review. |
| Academic Coordinator | Internal | Qualifications, availability review, course authorization, and eligible trainer selection. |
| Training Coordinator | Internal | Trainer search, availability review, eligible trainer selection, and assignment reference review. |
| Compliance Officer | Internal | Qualification, document reference, audit, and compliance reporting access. |
| Accountant | Internal | Compensation configuration and compensation coverage reporting where granted. |
| Counselor | Internal | No operational Trainer Management access by default. |
| Reporting Analyst | Internal | Read/report access within explicit branch and consolidated scope; no mutations. |
| Trainer | External/Future Portal | No current Admin Portal Module 09 permissions by default. |
| Student | External | No Module 09 permissions. |
| Corporate Coordinator | External/Future Portal | No Module 09 permissions. |

Legend: `✓` default grant, `R` restricted/conditional grant, `—` no default grant.

## 3. Action-Level Permissions

| Permission | Super Admin | Institute Admin | Branch Admin | Branch Manager | Academic Coord. | Training Coord. | Compliance Officer | Accountant | Counselor | Reporting Analyst | Trainer | Student | Corporate Coord. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `trainer.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ | — | — | — |
| `trainer.create` | ✓ | ✓ | ✓ | R | R | — | — | — | — | — | — | — | — |
| `trainer.update` | ✓ | ✓ | ✓ | R | R | — | — | — | — | — | — | — | — |
| `trainer.status.manage` | ✓ | ✓ | R | ✓ | R | — | — | — | — | — | — | — | — |
| `trainer.qualification.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | R | — | — | — |
| `trainer.qualification.manage` | ✓ | ✓ | ✓ | R | ✓ | — | R | — | — | — | — | — | — |
| `trainer.availability.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | — | R | — | — | — |
| `trainer.availability.manage` | ✓ | ✓ | ✓ | R | ✓ | R | — | — | — | — | — | — | — |
| `trainer.authorization.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | R | — | — | — |
| `trainer.authorization.manage` | ✓ | ✓ | R | ✓ | ✓ | R | — | — | — | — | — | — | — |
| `trainer.compensation.read` | ✓ | R | — | — | — | — | — | ✓ | — | R | — | — | — |
| `trainer.compensation.manage` | ✓ | R | — | — | — | — | — | ✓ | — | — | — | — | — |
| `trainer.eligibility.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | — | R | — | — | — |
| `trainer.report.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ | — | — | — |
| `trainer.report.export` | ✓ | ✓ | R | R | R | R | R | R | — | ✓ | — | — | — |
| `trainer.audit.read` | ✓ | ✓ | R | ✓ | R | — | ✓ | — | — | R | — | — | — |

### 3.1 Restricted Grant Interpretation

`R` means the permission is not inherent to the role and must be explicitly granted by IAM policy. Typical reasons include financial sensitivity, separation of duties, or institute-wide visibility.

## 4. Action Permission Definitions

| Permission | Allowed Actions | Explicitly Not Allowed |
|---|---|---|
| `trainer.read` | List trainers; read base operational profile; read assignment references. | Qualification, availability, authorization, compensation, or audit access unless separately granted. |
| `trainer.create` | Create TrainerProfile linked to canonical Person. | Create duplicate Person identity; assign IAM login. |
| `trainer.update` | Update TrainerProfile-owned attributes. | Update Person-owned identity fields; change status without status permission. |
| `trainer.status.manage` | Execute allowed Active/Inactive/Suspended transitions. | Hard delete; bypass transition rules. |
| `trainer.qualification.read` | Read structured qualification records and Document verification projection. | Modify Document verification status. |
| `trainer.qualification.manage` | Add, update, soft-delete qualifications and link evidence references. | Upload/verify Document records through Trainer-owned route. |
| `trainer.availability.read` | Read recurring availability. | Create or mutate schedules. |
| `trainer.availability.manage` | Create, update, deactivate, soft-delete availability. | Resolve timetable conflicts owned by Scheduling. |
| `trainer.authorization.read` | Read trainer-course authorization. | Modify Course records. |
| `trainer.authorization.manage` | Create authorization and perform valid lifecycle transitions. | Publish Course or change Course status. |
| `trainer.compensation.read` | Read compensation rates and resolution results. | Payroll calculation or payment. |
| `trainer.compensation.manage` | Configure effective-dated compensation rates. | Generate payroll, payslip, or payment transaction. |
| `trainer.eligibility.read` | Query eligible trainers and validate assignment eligibility. | Confirm BatchTrainer/Session assignment. |
| `trainer.report.view` | View operational trainer reports. | Export without export permission. |
| `trainer.report.export` | Export authorized report rows and fields. | Export compensation fields without compensation-read permission. |
| `trainer.audit.read` | Read immutable trainer-related audit history. | Modify or delete audit entries. |

## 5. Menu-Level Permissions

Menu permissions control navigation exposure. Route handlers still enforce action permissions.

| Menu Permission | Menu / Route | Super Admin | Institute Admin | Branch Admin | Branch Manager | Academic Coord. | Training Coord. | Compliance | Accountant | Counselor | Reporting Analyst | Trainer | Student |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `menu.faculty` | Faculty top-level menu | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ | — | — |
| `menu.faculty.trainers` | `/faculty/trainers` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ | — | — |
| `menu.faculty.eligible-trainers` | `/faculty/eligible-trainers` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | — | R | — | — |
| `menu.faculty.reports` | `/faculty/reports` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ | — | — |

### 5.1 Menu-to-Action Dependency

| Menu Permission | Minimum Action Permission |
|---|---|
| `menu.faculty` | At least one Module 09 action permission. |
| `menu.faculty.trainers` | `trainer.read` |
| `menu.faculty.eligible-trainers` | `trainer.eligibility.read` |
| `menu.faculty.reports` | `trainer.report.view` |

A user who possesses an action permission but lacks a corresponding menu permission may still access the route only when application navigation policy permits direct route access; the route remains protected by the action permission. ASTI recommended policy grants menu permission together with its minimum action permission.

## 6. Report-Level Permissions

| Report Permission | Report Code | Super Admin | Institute Admin | Branch Admin | Branch Manager | Academic Coord. | Training Coord. | Compliance | Accountant | Reporting Analyst |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `trainer.report.roster.view` | `trainer-roster` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | ✓ |
| `trainer.report.authorization-coverage.view` | `authorization-coverage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `trainer.report.availability-coverage.view` | `availability-coverage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ |
| `trainer.report.utilization-reference.view` | `trainer-utilization-reference` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | R | — | ✓ |
| `trainer.report.qualification-compliance.view` | `qualification-compliance` | ✓ | ✓ | ✓ | ✓ | ✓ | R | ✓ | — | ✓ |
| `trainer.report.compensation-coverage.view` | `compensation-configuration-coverage` | ✓ | R | — | — | — | — | — | ✓ | R |
| `trainer.report.consolidated.view` | Cross-branch consolidated mode | ✓ | ✓ | — | R | — | — | R | R | R |

Report-level permission is additive to `trainer.report.view`. Export additionally requires `trainer.report.export`. Compensation report rows additionally require `trainer.compensation.read`.

## 7. Screen-to-Permission Matrix

| Screen | Read / Entry Permission | Mutation Permission |
|---|---|---|
| Trainer Directory | `trainer.read` | Row actions depend on `trainer.update` and `trainer.status.manage`. |
| Create Trainer Profile | `trainer.create` | `trainer.create` |
| Trainer Overview | `trainer.read` | Section-specific permissions. |
| Edit Trainer Profile | `trainer.update` | `trainer.update` |
| Status Management Drawer | `trainer.read` | `trainer.status.manage` |
| Qualifications Tab | `trainer.qualification.read` | `trainer.qualification.manage` |
| Availability Tab | `trainer.availability.read` | `trainer.availability.manage` |
| Course Authorizations Tab | `trainer.authorization.read` | `trainer.authorization.manage` |
| Compensation Rates Tab | `trainer.compensation.read` | `trainer.compensation.manage` |
| Eligible Trainer Finder | `trainer.eligibility.read` | None; assignment mutation belongs to Training Delivery. |
| Assignment References | `trainer.read` | None. |
| Trainer Reports | `trainer.report.view` | Export requires `trainer.report.export`. |
| Audit History | `trainer.audit.read` | None. |

## 8. Separation of Duties Rules

1. Compensation access is independent of generic trainer read access.
2. Qualification management does not grant Document verification authority.
3. Course authorization management does not grant Course Catalog editing authority.
4. Trainer eligibility access does not grant BatchTrainer or Session assignment mutation authority.
5. Audit history is read-only and separate from operational update permissions.
6. Consolidated reporting requires explicit cross-branch report permission plus visible branch scope.
7. A Branch Admin has no default compensation permission.
8. An Accountant has no default trainer profile mutation, status, qualification, availability, or authorization permission.
9. A Counselor has no default Module 09 access.
10. Trainer and Student roles receive no Admin Portal Module 09 permission by default.

## 9. Branch Scope Matrix

| Role | Default Branch Scope Behavior |
|---|---|
| Super Admin | Explicitly assigned all/institute branches; no implicit bypass in query code. |
| Institute Administrator | Assigned institute branches and consolidated reporting when granted. |
| Branch Admin | Assigned branch and permitted child branches only. |
| Branch Manager | Managed branch and explicitly configured child branches. |
| Academic Coordinator | Assigned operational branches. |
| Training Coordinator | Assigned operational branches. |
| Compliance Officer | Assigned audit/compliance scope; consolidated access only when granted. |
| Accountant | Assigned financial scope; compensation records only in those branches. |
| Reporting Analyst | Read-only assigned branches; consolidated mode only with explicit permission. |

## 10. Permission Evaluation Order

For every request:

1. Authenticate the user.
2. Verify menu permission only for navigation rendering, not API security.
3. Verify endpoint action permission.
4. Resolve current branch context.
5. Resolve assigned and child-branch visibility rules.
6. Intersect client filters with server scope.
7. Apply sensitive-field permission checks.
8. Perform domain validation.
9. Execute query or mutation.
10. Audit sensitive action or export.

## 11. Denial Behavior

| Condition | UI Behavior | API Behavior |
|---|---|---|
| Missing menu permission | Menu item hidden. | No effect on API authorization. |
| Missing action permission | Action hidden or screen access denied. | HTTP 403 `ERR_AUTH_PERMISSION_DENIED`. |
| Out-of-scope branch | Data omitted from lists; direct screen shows not found/access denied pattern. | HTTP 403 or scope-safe 404 according to endpoint policy; no existence leakage. |
| Missing compensation permission | Compensation tab hidden and data not requested. | HTTP 403; compensation fields omitted from composite DTOs. |
| Missing audit permission | Audit tab hidden. | HTTP 403. |
| Missing consolidated-report permission | Consolidated selector hidden. | HTTP 403 `ERR_FTM_CONSOLIDATED_REPORT_PERMISSION_REQUIRED`. |
