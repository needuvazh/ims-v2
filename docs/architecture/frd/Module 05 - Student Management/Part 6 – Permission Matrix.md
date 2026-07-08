# Part 6 – Permission Matrix

## Module 5 – Student Management

## 1. Purpose

This document defines the fine-grained permission matrix for **Module 5 – Student Management**. Permissions are grouped into:

1. **Action-level permissions** – transactional operations on student data.
2. **Menu-level permissions** – visibility and navigation to screens.
3. **Report-level permissions** – access to reporting and export-oriented views.

The matrix is designed for dynamic RBAC. Role names are examples of default role bundles for ASTI and must not be treated as hardcoded authorization logic.

---

## 2. Business Roles Covered

| Role Code            | Business Role                   | Description                                                                 |
| -------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| ROLE-SUPER-ADMIN     | Super Admin                     | Institute-wide administrative authority                                     |
| ROLE-INSTITUTE-ADMIN | Institute Admin                 | Central operations administrator with broad cross-branch access             |
| ROLE-BRANCH-ADMIN    | Branch Admin                    | Branch-level administrative owner                                           |
| ROLE-COUNSELOR       | Counselor / Admission Counselor | Handles admissions handoff and identity creation from admission             |
| ROLE-FRONT-DESK      | Front Desk Executive            | Direct registration and lookup for walk-ins and reception workflows         |
| ROLE-STU-OPS         | Student Administration Officer  | Primary owner of student master maintenance                                 |
| ROLE-BRANCH-MANAGER  | Branch Manager                  | Oversight, approval, and read-heavy governance role                         |
| ROLE-COMPLIANCE      | Compliance / Audit Officer      | Audit, duplicate resolution review, and sensitive action monitoring         |
| ROLE-CORP-COORD      | Corporate Coordinator           | Converts corporate participants into students and verifies identity linkage |
| ROLE-ACCOUNTANT      | Accountant / Finance Officer    | Read-only operational lookup for finance use cases                          |
| ROLE-TRAINER         | Trainer                         | Read-only student quick-view in roster context                              |
| ROLE-REPORTING       | Reporting User / MIS Analyst    | Read-only reporting and export within granted scope                         |
| ROLE-STUDENT         | Student Portal User             | Self-view only                                                              |
| ROLE-SYSTEM          | Internal System Service         | Non-human workflow invoker                                                  |

---

## 3. Action-Level Permission Catalog

| Permission Code                   | Description                                               |
| --------------------------------- | --------------------------------------------------------- |
| `student.read`                    | View student profile, list, lookup, and related summaries |
| `student.create`                  | Create student profile                                    |
| `student.update`                  | Update editable student fields                            |
| `student.status.change`           | Change lifecycle status and write status history          |
| `student.archive`                 | Archive student using soft delete                         |
| `student.restore`                 | Restore archived student                                  |
| `student.idcard.manage`           | Issue, update, revoke, or reissue ID card details         |
| `student.duplicate.read`          | View duplicate cases and candidate details                |
| `student.duplicate.resolve`       | Resolve duplicate cases without merge                     |
| `student.merge`                   | Merge duplicate student profiles                          |
| `student.export`                  | Export student datasets and create export logs            |
| `student.audit.read`              | View student-specific audit trails                        |
| `student.identity.unmasked.read`  | View unmasked identity values where policy allows         |
| `student.portal.self.read`        | Student self-view profile access                          |
| `student.trainer.roster.read`     | Trainer read-only quick view from batch roster            |
| `student.related.admission.read`  | View linked admission summary                             |
| `student.related.enrollment.read` | View linked enrollment summary                            |
| `student.related.document.read`   | View linked document summary                              |

---

## 4. Menu-Level Permission Catalog

| Permission Code                             | Description                                  |
| ------------------------------------------- | -------------------------------------------- |
| `menu.studentManagement`                    | Show Student Management root menu            |
| `menu.studentManagement.list`               | Show student list/search page                |
| `menu.studentManagement.create`             | Show create student actions/forms            |
| `menu.studentManagement.detail`             | Show student detail page                     |
| `menu.studentManagement.duplicateWorkbench` | Show duplicate workbench                     |
| `menu.studentManagement.audit`              | Show audit tab/screen                        |
| `menu.studentManagement.export`             | Show export dialog/action                    |
| `menu.studentManagement.reports`            | Show student management report menu          |
| `menu.studentPortal.myProfile`              | Show My Student Profile in student portal    |
| `menu.trainerPortal.studentQuickView`       | Enable quick-view access from trainer roster |

---

## 5. Report-Level Permission Catalog

| Permission Code                        | Description                           |
| -------------------------------------- | ------------------------------------- |
| `report.studentMaster`                 | View student master listing report    |
| `report.studentStatusHistory`          | View student status history report    |
| `report.studentDuplicateCases`         | View duplicate cases report           |
| `report.studentMergeHistory`           | View merge history report             |
| `report.studentExportHistory`          | View export log report                |
| `report.studentBranchSummary`          | View branch-wise student summary      |
| `report.studentCorporateOriginSummary` | View corporate-origin student summary |

---

## 6. Branch Scope Profiles

| Scope Code                 | Meaning                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `BR-SELF`                  | Active branch only                                         |
| `BR-ASSIGNED`              | Any explicitly assigned branch                             |
| `BR-ASSIGNED-CONSOLIDATED` | Assigned branches plus permitted consolidated reporting    |
| `BR-INSTITUTE`             | All institute branches                                     |
| `BR-ROSTER-CONTEXT`        | Trainer only for students in assigned batch/roster context |
| `BR-SELF-PROFILE`          | Student only for own linked student profile                |

---

## 7. Action-Level Permission Matrix

Legend:

- **Y** = Granted by default
- **C** = Conditional / optional by policy or approval matrix
- **—** = Not granted

| Role                           | student.read | student.create | student.update | student.status.change | student.archive | student.restore | student.idcard.manage | student.duplicate.read | student.duplicate.resolve | student.merge | student.export | student.audit.read | student.identity.unmasked.read | student.portal.self.read | student.trainer.roster.read | student.related.admission.read | student.related.enrollment.read | student.related.document.read | Branch Scope             |
| ------------------------------ | ------------ | -------------- | -------------- | --------------------- | --------------- | --------------- | --------------------- | ---------------------- | ------------------------- | ------------- | -------------- | ------------------ | ------------------------------ | ------------------------ | --------------------------- | ------------------------------ | ------------------------------- | ----------------------------- | ------------------------ |
| Super Admin                    | Y            | Y              | Y              | Y                     | Y               | Y               | Y                     | Y                      | Y                         | Y             | Y              | Y                  | Y                              | —                        | —                           | Y                              | Y                               | Y                             | BR-INSTITUTE             |
| Institute Admin                | Y            | Y              | Y              | Y                     | Y               | Y               | Y                     | Y                      | Y                         | Y             | Y              | Y                  | C                              | —                        | —                           | Y                              | Y                               | Y                             | BR-INSTITUTE             |
| Branch Admin                   | Y            | Y              | Y              | Y                     | Y               | Y               | Y                     | Y                      | Y                         | C             | Y              | Y                  | C                              | —                        | —                           | Y                              | Y                               | Y                             | BR-ASSIGNED              |
| Counselor                      | Y            | Y              | C              | —                     | —               | —               | —                     | C                      | —                         | —             | —              | —                  | —                              | —                        | —                           | Y                              | Y                               | C                             | BR-ASSIGNED              |
| Front Desk Executive           | Y            | Y              | C              | —                     | —               | —               | —                     | —                      | —                         | —             | —              | —                  | —                              | —                        | —                           | C                              | C                               | —                             | BR-SELF                  |
| Student Administration Officer | Y            | Y              | Y              | Y                     | Y               | Y               | Y                     | Y                      | Y                         | —             | Y              | Y                  | C                              | —                        | —                           | Y                              | Y                               | Y                             | BR-ASSIGNED-CONSOLIDATED |
| Branch Manager                 | Y            | —              | C              | Y                     | Y               | Y               | C                     | Y                      | Y                         | Y             | C              | Y                  | C                              | —                        | —                           | Y                              | Y                               | Y                             | BR-ASSIGNED              |
| Compliance / Audit Officer     | Y            | —              | —              | —                     | —               | —               | —                     | Y                      | Y                         | Y             | C              | Y                  | Y                              | —                        | —                           | Y                              | Y                               | Y                             | BR-ASSIGNED-CONSOLIDATED |
| Corporate Coordinator          | Y            | Y              | C              | —                     | —               | —               | —                     | C                      | —                         | —             | —              | —                  | —                              | —                        | —                           | C                              | Y                               | —                             | BR-ASSIGNED              |
| Accountant / Finance Officer   | Y            | —              | —              | —                     | —               | —               | —                     | —                      | —                         | —             | —              | —                  | C                              | —                        | —                           | —                              | Y                               | —                             | BR-ASSIGNED              |
| Trainer                        | C            | —              | —              | —                     | —               | —               | —                     | —                      | —                         | —             | —              | —                  | —                              | —                        | Y                           | —                              | Y                               | —                             | BR-ROSTER-CONTEXT        |
| Reporting User                 | Y            | —              | —              | —                     | —               | —               | —                     | Y                      | —                         | —             | Y              | Y                  | C                              | —                        | —                           | Y                              | Y                               | Y                             | BR-ASSIGNED-CONSOLIDATED |
| Student Portal User            | —            | —              | —              | —                     | —               | —               | —                     | —                      | —                         | —             | —              | —                  | —                              | Y                        | —                           | —                              | C                               | C                             | BR-SELF-PROFILE          |
| Internal System Service        | Y            | Y              | Y              | Y                     | Y               | Y               | Y                     | Y                      | Y                         | Y             | Y              | Y                  | Y                              | —                        | —                           | Y                              | Y                               | Y                             | System scoped            |

---

## 8. Menu-Level Permission Matrix

| Role                           | menu.studentManagement | menu.studentManagement.list | menu.studentManagement.create | menu.studentManagement.detail | menu.studentManagement.duplicateWorkbench | menu.studentManagement.audit | menu.studentManagement.export | menu.studentManagement.reports | menu.studentPortal.myProfile | menu.trainerPortal.studentQuickView |
| ------------------------------ | ---------------------- | --------------------------- | ----------------------------- | ----------------------------- | ----------------------------------------- | ---------------------------- | ----------------------------- | ------------------------------ | ---------------------------- | ----------------------------------- |
| Super Admin                    | Y                      | Y                           | Y                             | Y                             | Y                                         | Y                            | Y                             | Y                              | —                            | —                                   |
| Institute Admin                | Y                      | Y                           | Y                             | Y                             | Y                                         | Y                            | Y                             | Y                              | —                            | —                                   |
| Branch Admin                   | Y                      | Y                           | Y                             | Y                             | Y                                         | Y                            | Y                             | Y                              | —                            | —                                   |
| Counselor                      | Y                      | Y                           | Y                             | Y                             | C                                         | —                            | —                             | —                              | —                            | —                                   |
| Front Desk Executive           | Y                      | Y                           | Y                             | Y                             | —                                         | —                            | —                             | —                              | —                            | —                                   |
| Student Administration Officer | Y                      | Y                           | Y                             | Y                             | Y                                         | Y                            | Y                             | Y                              | —                            | —                                   |
| Branch Manager                 | Y                      | Y                           | —                             | Y                             | Y                                         | Y                            | C                             | Y                              | —                            | —                                   |
| Compliance / Audit Officer     | Y                      | Y                           | —                             | Y                             | Y                                         | Y                            | C                             | Y                              | —                            | —                                   |
| Corporate Coordinator          | Y                      | Y                           | Y                             | Y                             | C                                         | —                            | —                             | —                              | —                            | —                                   |
| Accountant / Finance Officer   | C                      | C                           | —                             | C                             | —                                         | —                            | —                             | —                              | —                            | —                                   |
| Trainer                        | —                      | —                           | —                             | —                             | —                                         | —                            | —                             | —                              | —                            | Y                                   |
| Reporting User                 | C                      | C                           | —                             | C                             | C                                         | Y                            | Y                             | Y                              | —                            | —                                   |
| Student Portal User            | —                      | —                           | —                             | —                             | —                                         | —                            | —                             | —                              | Y                            | —                                   |
| Internal System Service        | —                      | —                           | —                             | —                             | —                                         | —                            | —                             | —                              | —                            | —                                   |

---

## 9. Report-Level Permission Matrix

| Role                           | report.studentMaster | report.studentStatusHistory | report.studentDuplicateCases | report.studentMergeHistory | report.studentExportHistory | report.studentBranchSummary | report.studentCorporateOriginSummary |
| ------------------------------ | -------------------- | --------------------------- | ---------------------------- | -------------------------- | --------------------------- | --------------------------- | ------------------------------------ |
| Super Admin                    | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | Y                                    |
| Institute Admin                | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | Y                                    |
| Branch Admin                   | Y                    | Y                           | Y                            | C                          | Y                           | Y                           | C                                    |
| Counselor                      | —                    | —                           | —                            | —                          | —                           | —                           | —                                    |
| Front Desk Executive           | —                    | —                           | —                            | —                          | —                           | —                           | —                                    |
| Student Administration Officer | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | Y                                    |
| Branch Manager                 | Y                    | Y                           | Y                            | C                          | Y                           | Y                           | C                                    |
| Compliance / Audit Officer     | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | C                                    |
| Corporate Coordinator          | —                    | —                           | —                            | —                          | —                           | C                           | Y                                    |
| Accountant / Finance Officer   | C                    | —                           | —                            | —                          | —                           | C                           | —                                    |
| Trainer                        | —                    | —                           | —                            | —                          | —                           | —                           | —                                    |
| Reporting User                 | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | Y                                    |
| Student Portal User            | —                    | —                           | —                            | —                          | —                           | —                           | —                                    |
| Internal System Service        | Y                    | Y                           | Y                            | Y                          | Y                           | Y                           | Y                                    |

---

## 10. Derived UI Behavior Rules

1. A role may have `student.read` but still not see the Student Management root menu if `menu.studentManagement` is not granted.
2. Detail-page tabs must be hidden individually if the matching related-read permission is missing:
   - admission tab requires `student.related.admission.read`
   - enrollments summary requires `student.related.enrollment.read`
   - documents summary requires `student.related.document.read`
3. Audit tab requires `student.audit.read` or equivalent audit permission.
4. Duplicate workbench requires both:
   - menu visibility: `menu.studentManagement.duplicateWorkbench`
   - data access: `student.duplicate.read`
5. Export button requires:
   - `student.export`
   - and menu/report visibility depending on placement
6. Unmasked identity values require `student.identity.unmasked.read`; otherwise sensitive values remain masked even if the user has `student.read`.
7. Trainer sees student quick view only through batch roster context and never through Student Management menu.
8. Student portal users never get list/browse permissions; only self-resolved record access.
9. Merge requires both `student.merge` and `student.duplicate.resolve`.
10. Archive and restore are separate permissions and must not be inferred from update rights.

---

## 11. Default Role Bundle Recommendations

| Role                           | Recommended Bundle Notes                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| Super Admin                    | Full institute-wide rights for setup, troubleshooting, and governance |
| Institute Admin                | Near-full rights but may optionally exclude unmasked identity access  |
| Branch Admin                   | Full branch rights; merge can be conditional                          |
| Counselor                      | Read/create with limited update to pre-enrollment profile corrections |
| Front Desk Executive           | Direct create and lookup only in own branch                           |
| Student Administration Officer | Full operational ownership of Student Management                      |
| Branch Manager                 | Review, approval, audit, archive/restore, status-change authority     |
| Compliance Officer             | Read-heavy oversight, duplicate workbench, audit, merge by policy     |
| Corporate Coordinator          | Create/lookup for corporate-origin students and related read access   |
| Accountant                     | Lookup and downstream summary read only                               |
| Trainer                        | Roster-context quick view only                                        |
| Reporting User                 | Read/export/report access, no transactional writes                    |
| Student                        | Self profile only                                                     |

---

## 12. Permission Assignment Principles

1. Roles are examples; authorization must evaluate permissions, not role names.
2. Branch scoping is an independent dimension and must be checked even when permission is granted.
3. Sensitive permissions should be separated rather than bundled by default:
   - `student.identity.unmasked.read`
   - `student.merge`
   - `student.audit.read`
   - `student.export`
4. Consolidated reporting is not implied by institute-level menu access. It must be granted explicitly through branch-access policy.
5. System services use trusted service identities and must still carry explicit scope context in commands and events.
