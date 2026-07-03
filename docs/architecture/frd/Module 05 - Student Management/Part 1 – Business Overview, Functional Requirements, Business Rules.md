# Part 1 – Business Overview, Functional Requirements, Business Rules

## 1. Comprehensive Introduction

The Student Management module is the institutional foundation for managing learners as durable, reusable student identities across ASTI’s complete training lifecycle. In the ASTI IMS domain model, a learner may originate from enquiry conversion, approved admission, website registration, walk-in registration, or corporate nomination. Regardless of intake channel, the platform must avoid creating fragmented learner identities. The module therefore operationalizes the shared `Person` identity pattern and creates a reusable `StudentProfile` that can participate in one or more enrollments over time.

This module is not the owner of enrollment, finance, attendance, completion, or certificates. Instead, it provides the trusted student master reference those modules consume. It is the boundary that determines whether ASTI is dealing with an existing student, an existing person who is not yet a student, or a completely new learner. This design supports the agreed principles that enrollment remains central, learner identity is not duplicated, and branch access is always enforced server-side.

### 1.1 Business Benefits

1. **Identity integrity:** prevents duplicate students across branches and intake channels.
2. **Operational speed:** reduces counselor and front-desk effort through fast student search and reuse.
3. **Enrollment readiness:** ensures each learner can be attached to admission and enrollment consistently.
4. **Corporate continuity:** enables corporate participants to become students without losing corporate billing lineage.
5. **Audit readiness:** supports traceable lifecycle changes, archival, restoration, and merge history.
6. **Branch governance:** ensures staff access only the student records they are allowed to view or manage.
7. **Data quality:** enforces field validation, uniqueness, and duplicate checks before persistence.
8. **Downstream reliability:** provides a stable student reference to enrollment, finance, attendance, completion, certificate, and reporting flows.
9. **Localization readiness:** supports bilingual display fields and Oman timezone aligned business timestamps.
10. **Compliance posture:** preserves historical records through soft deletes and immutable audit history.

## 2. Functional Requirements Specifications

### FR-SM-001 — Create Student Profile from Approved Admission

**Description & Actors**  
The system shall create a `StudentProfile` from an approved `Admission` record by reusing the existing `Person` record and preventing duplicate student creation.  
Actors: Admission Counselor, Student Administration Officer, System.

**Preconditions**
1. User is authenticated.
2. User has `student.create` permission.
3. User has write access to the admission branch.
4. Admission exists and is in `Approved` status.
5. Admission is linked to a valid `Person`.
6. No active `StudentProfile` already exists for the same person unless an explicit reuse path is selected.

**Inputs**
- admissionId
- personId derived from admission
- branchId derived from admission context
- joinedAt
- optional remarks
- user context
- request metadata

**Processing Steps**
1. Load admission by `admissionId`.
2. Validate admission status equals `Approved`.
3. Validate admission branch is accessible to requesting user.
4. Load associated `Person`.
5. Search `StudentProfile` by `personId`.
6. If active or non-archived student already exists for the person, stop creation and route to reuse result.
7. Run duplicate checks against other persons using Civil ID, passport number, visa number, email, and phone.
8. If duplicate confidence is above blocking threshold, require resolution before create.
9. Generate `studentNumber` using numbering series applicable to target branch.
10. Create `StudentProfile` with:
   - personId
   - studentNumber
   - studentStatus = `Active`
   - idCardIssued = `false`
   - idCardNumber = null
   - joinedAt
   - status = `Active`
11. Persist in one transaction with audit entry.
12. Return created profile identifier and summary.

**Outputs & Postconditions**
- New `StudentProfile` is created.
- Student is now available for enrollment linking.
- Audit entry is written.
- Admission remains separate and unchanged except for referenceability.

**Priority**  
Must

---

### FR-SM-002 — Create Student Profile through Authorized Direct Registration

**Description & Actors**  
The system shall allow an authorized back-office user to create a student profile directly when a formal admission record is not the initiating artifact, such as controlled walk-in or exceptional administrative registration.  
Actors: Front Desk Executive, Student Administration Officer, System.

**Preconditions**
1. User is authenticated.
2. User has `student.create`.
3. User has branch write access.
4. Direct registration is allowed by policy for the actor’s role and branch.
5. Minimum mandatory person identity fields are supplied.

**Inputs**
- firstName
- middleName optional
- lastName
- fullName localized optional
- gender optional
- dateOfBirth optional
- nationality
- civilId optional
- passportNumber optional
- visaNumber optional
- primaryEmail optional
- primaryPhone
- photoUrl optional
- joinedAt
- branchId
- creationSource
- remarks optional

**Processing Steps**
1. Validate branch write access.
2. Validate mandatory identity set:
   - at least full personal name,
   - at least one contact method,
   - nationality,
   - one of Civil ID, passport number, visa number, email, or phone for uniqueness screening.
3. Standardize email to lowercase trimmed form.
4. Standardize phone to canonical storage form.
5. Run duplicate detection against existing persons and students.
6. If exact match person exists and no student profile exists, reuse the person.
7. If exact match student exists, stop with existing student result.
8. If partial duplicates exist, present conflict result for operator resolution.
9. Create or reuse `Person`.
10. Generate student number.
11. Create `StudentProfile`.
12. Write audit entry with creation source.
13. Return student summary.

**Outputs & Postconditions**
- New student profile exists or user is redirected to matched existing student.
- Duplicate student creation is avoided.
- Audit trail records source and creator.

**Priority**  
Must

---

### FR-SM-003 — Convert Corporate Participant into Student Profile

**Description & Actors**  
The system shall convert a `CorporateParticipant` into a `StudentProfile` when enrollment requires a student reference, without removing the participant’s corporate linkage.  
Actors: Corporate Coordinator, Student Administration Officer, Enrollment System.

**Preconditions**
1. User has `student.create` or workflow executes as trusted internal system action.
2. Corporate participant exists and is active.
3. Associated person exists or is creatable from corporate participant source data.
4. Enrollment branch context is known.

**Inputs**
- corporateParticipantId
- corporateAccountId
- targetBranchId
- joinedAt
- source enrollment context
- user/system context

**Processing Steps**
1. Load `CorporateParticipant`.
2. Validate participant belongs to an active corporate account.
3. Load or resolve linked `Person`.
4. Search for existing `StudentProfile` by `personId`.
5. If existing student found, return it and retain participant linkage.
6. If not found, run duplicate checks against other persons and students.
7. If blocking duplicate exists, halt and require merge/resolution.
8. Generate student number for target branch.
9. Create `StudentProfile`.
10. Update corporate participant link `linkedStudentProfileId` to new student profile.
11. Write audit log for conversion action.
12. Return both student and participant linkage summary.

**Outputs & Postconditions**
- Corporate participant is linked to a student profile.
- Corporate linkage remains intact for billing and reporting.
- Student can now participate in enrollment.

**Priority**  
Must

---

### FR-SM-004 — Generate Unique Student Number

**Description & Actors**  
The system shall generate a unique student number using configured numbering series rules.  
Actors: System Administrator configures rules; System generates number during create operations.

**Preconditions**
1. Numbering series exists for entity type `Student`.
2. Series is active for target branch or global fallback is defined.
3. Current transaction holds a write lock or equivalent concurrency-safe mechanism.

**Inputs**
- entityType = Student
- branchId
- current business date in Oman timezone
- numbering series configuration

**Processing Steps**
1. Retrieve applicable numbering series in priority order:
   - branch-specific active series,
   - otherwise institute/global active series.
2. Validate series is effective for current business date.
3. Build prefix, year format, and padded sequence.
4. Lock sequence row for update.
5. Read `nextNumber`.
6. Construct candidate number.
7. Check uniqueness against `StudentProfile.studentNumber`.
8. If collision exists, increment sequence and retry within same transaction.
9. Persist updated sequence value.
10. Return student number.

**Outputs & Postconditions**
- Unique student number is produced.
- Numbering series advances exactly once for committed transaction.

**Priority**  
Must

---

### FR-SM-005 — Search and Filter Students within Branch Scope

**Description & Actors**  
The system shall allow branch-scoped search and filtering of students for operations, enrollment preparation, finance lookup, and reporting.  
Actors: Admission Counselor, Front Desk Executive, Student Administration Officer, Finance Officer, Reporting User.

**Preconditions**
1. User has `student.read`.
2. User has branch access to requested branch or consolidated permission where applicable.

**Inputs**
- activeBranchId
- optional consolidated flag
- filters:
  - studentNumber
  - fullName
  - primaryPhone
  - primaryEmail
  - civilId
  - passportNumber
  - visaNumber
  - studentStatus
  - joinedAt range
  - admissionNumber
  - enrollmentNumber
  - isArchived
- pagination inputs
- sort inputs

**Processing Steps**
1. Validate user permission.
2. Resolve effective branch scope.
3. Build query predicates only for allowed fields.
4. Apply soft delete visibility rules.
5. Join person table for identity and contact fields.
6. Join admission/enrollment summary views only when requested.
7. Apply exact match for student number and identity numbers.
8. Apply case-insensitive partial match for names and email.
9. Apply normalized match for phone number.
10. Apply status and date-range filters.
11. Apply pagination and deterministic sort.
12. Return result set and filter metadata.

**Outputs & Postconditions**
- Authorized user receives only branch-scoped matching results.
- Query execution is logged for audit only where policy requires, not as a business audit event by default.

**Priority**  
Must

---

### FR-SM-006 — View Student Profile with Linked Summaries

**Description & Actors**  
The system shall display a consolidated student profile view containing student master details and references to related admissions and enrollments.  
Actors: Student Administration Officer, Branch Manager, Finance Officer, Trainer, Academic Coordinator.

**Preconditions**
1. User has `student.read`.
2. Student exists and is accessible within branch rules.

**Inputs**
- studentProfileId or studentNumber
- activeBranchId
- user context

**Processing Steps**
1. Load student profile.
2. Validate branch access.
3. Load linked `Person` and supporting internal reference data.
4. Retrieve profile attributes:
   - student number,
   - status,
   - joined date,
   - ID card indicators.
5. Retrieve person attributes:
   - names,
   - nationality,
   - DOB,
   - identity numbers,
   - contact details,
   - photo reference.
6. Retrieve linked admissions summary.
7. Retrieve linked enrollments summary with read-only minimal fields:
   - enrollment number,
   - course,
   - batch,
   - status.
8. Retrieve corporate linkage summary if any.
9. Retrieve document summary counts if available from document module contract.
10. Mask restricted fields according to permission.
11. Return full profile view model.

**Outputs & Postconditions**
- Authorized user can view a single trusted student profile.
- No cross-module ownership is transferred; related data remains read-only references.

**Priority**  
Must

---

### FR-SM-007 — Update Student Profile

**Description & Actors**  
The system shall allow controlled updates to student master and linked person fields, subject to validation, duplicate checks, and concurrency control.  
Actors: Student Administration Officer, Branch Manager.

**Preconditions**
1. User has `student.update`.
2. Student exists and is not hard deleted.
3. User has write access to student branch context.
4. Request carries latest version token or equivalent concurrency value.

**Inputs**
- studentProfileId
- editable person fields
- editable student fields
- reason optional or mandatory by policy
- version token

**Processing Steps**
1. Load student and person records.
2. Validate branch write access.
3. Validate record is not archived if policy blocks direct edit on archived records.
4. Compare version token to current version.
5. Validate field formats, lengths, and mandatory constraints.
6. Re-run duplicate detection if any identity or contact field is changed.
7. Reject update when blocked duplicate conflict is detected.
8. Apply allowed field updates only.
9. Increment version.
10. Persist updates in one transaction.
11. Write audit entry capturing old and new values.
12. Return updated summary.

**Outputs & Postconditions**
- Student/person data is updated safely.
- Silent overwrite is prevented.
- Audit history reflects the change.

**Priority**  
Must

---

### FR-SM-008 — Detect and Block Duplicate Student Creation or Update

**Description & Actors**  
The system shall detect potential duplicates during create and update actions and shall block or warn according to matching severity.  
Actors: System, Student Administration Officer, Front Desk Executive.

**Preconditions**
1. Create or update workflow is in progress.
2. Relevant identity/contact fields are present.

**Inputs**
- civilId optional
- passportNumber optional
- visaNumber optional
- primaryEmail optional
- primaryPhone optional
- fullName
- dateOfBirth optional
- nationality optional

**Processing Steps**
1. Normalize all candidate fields.
2. Search existing persons/students using exact identity-number matches first.
3. Search using exact email and canonical phone match.
4. Search using name plus DOB fuzzy rule for possible duplicates.
5. Assign severity:
   - Blocking Exact Identity Match,
   - Blocking Existing Student For Same Person,
   - Review Required Contact Match,
   - Advisory Similar Name Match.
6. If blocking severity present, reject save and present matched records.
7. If review severity present, require explicit user confirmation or supervisor override according to policy.
8. Log duplicate detection outcome for traceability.

**Outputs & Postconditions**
- Duplicate student creation risk is minimized.
- User receives deterministic duplicate response categories.

**Priority**  
Must

---

### FR-SM-009 — Change Student Lifecycle Status

**Description & Actors**  
The system shall support controlled student status transitions without altering enrollment-owned statuses.  
Actors: Student Administration Officer, Branch Manager.

**Preconditions**
1. User has `student.status.update`.
2. Student exists within authorized branch scope.
3. Requested transition is allowed by business rules.

**Inputs**
- studentProfileId
- currentStatus
- targetStatus
- effectiveStartDate
- effectiveEndDate optional
- reason

**Processing Steps**
1. Load student profile.
2. Validate permission and branch access.
3. Validate target transition against business-rule matrix.
4. Validate effective dates:
   - start date required,
   - end date optional,
   - end date cannot be earlier than start date.
5. For suspension or archival, optionally check whether active enrollments exist and enforce policy.
6. Update status fields.
7. Persist status history or audit detail.
8. Write audit entry with reason.
9. Return new status snapshot.

**Outputs & Postconditions**
- Student lifecycle status changes consistently.
- Status history is retained through audit and effective-date data.

**Priority**  
Must

---

### FR-SM-010 — Manage Student ID Card Issuance

**Description & Actors**  
The system shall maintain whether an institutional ID card has been issued to the student and shall store a unique card number where used.  
Actors: Student Administration Officer, Front Desk Executive.

**Preconditions**
1. User has `student.idcard.issue`.
2. Student exists and is accessible.
3. Student is not archived.
4. Requested card number is unique if provided.

**Inputs**
- studentProfileId
- idCardIssued boolean
- idCardNumber optional
- issuedAt optional
- reason optional

**Processing Steps**
1. Load student profile.
2. Validate permission and branch access.
3. If `idCardIssued = true`, validate `idCardNumber` is provided when policy requires numbered cards.
4. Check uniqueness of `idCardNumber`.
5. Update student profile card fields.
6. Write audit entry for issue, reissue, correction, or revocation action.
7. Return updated card status.

**Outputs & Postconditions**
- Student ID card state is current and traceable.
- Duplicate card numbers are prevented.

**Priority**  
Should

---

### FR-SM-011 — Archive Student Record Using Soft Delete

**Description & Actors**  
The system shall archive a student record without removing it from the database.  
Actors: Student Administration Officer, Branch Manager.

**Preconditions**
1. User has `student.archive`.
2. Student exists.
3. User has write access to student branch.
4. Archive policy checks pass.

**Inputs**
- studentProfileId
- archiveReason
- archivedAt from system clock
- user context

**Processing Steps**
1. Load student profile.
2. Validate permission and branch scope.
3. Check whether active enrollments or legal retention conditions block archival.
4. Set `isDeleted = true`.
5. Set `deletedAt = current timestamp`.
6. Set operational status to `Archived` if model distinguishes status from delete flag.
7. Persist in transaction.
8. Write audit entry.

**Outputs & Postconditions**
- Student no longer appears in default active views.
- Authorized restoration remains possible.
- Historical references remain intact.

**Priority**  
Must

---

### FR-SM-012 — Prevent Hard Delete

**Description & Actors**  
The system shall prevent hard deletion of student records from user-facing application services and APIs.  
Actors: System.

**Preconditions**
1. Any delete command is submitted through application layer.

**Inputs**
- delete request
- studentProfileId

**Processing Steps**
1. Intercept delete command.
2. Reject any hard-delete operation.
3. Route user to archival flow if authorized.
4. Log security or audit event when prohibited delete is attempted.

**Outputs & Postconditions**
- Student row remains physically present.
- Requestor receives denial or archival guidance.

**Priority**  
Must

---

### FR-SM-013 — Audit Sensitive Student Actions

**Description & Actors**  
The system shall create immutable audit entries for all sensitive student actions.  
Actors: System, Compliance/Audit Officer as reader.

**Preconditions**
1. Sensitive action occurs.

**Inputs**
- entityType
- entityId
- action
- oldValue
- newValue
- performedBy
- performedAt
- reason optional
- source metadata

**Processing Steps**
1. Detect action category.
2. Build audit payload.
3. Persist audit entry in the same transaction as the business change where feasible.
4. Mark payload immutable after write.
5. Make audit queryable only to authorized users.

**Outputs & Postconditions**
- Sensitive student actions are historically traceable.

**Priority**  
Must

---

### FR-SM-014 — Merge Duplicate Student Records

**Description & Actors**  
The system shall support supervised merge of duplicate student records into one survivor record.  
Actors: Branch Manager, Student Administration Officer with `student.merge`.

**Preconditions**
1. User has `student.merge`.
2. Two or more student records are identified as duplicates.
3. Merge policy checks pass.
4. Survivor record is explicitly selected.

**Inputs**
- sourceStudentProfileId
- survivorStudentProfileId
- mergeReason
- field-level survivor decisions
- user context

**Processing Steps**
1. Validate source and survivor are different records.
2. Validate both are within authorized branch scope or user has consolidated/central permission.
3. Load linked person, admissions, enrollments, and references.
4. Determine whether merge is person-level reuse or student-profile consolidation only.
5. Prevent merge if conflicting active legal or finance locks exist and policy blocks operation.
6. Move or relink downstream references allowed by policy to survivor record.
7. Mark source record as merged-retired and non-operational, not hard deleted.
8. Preserve lineage mapping from source to survivor.
9. Write detailed audit entry with before/after mapping.
10. Return survivor summary.

**Outputs & Postconditions**
- One operational student record remains.
- Retired record remains historically traceable.
- Downstream references are preserved according to allowed relinking rules.

**Priority**  
Should

---

### FR-SM-015 — Export Student List

**Description & Actors**  
The system shall allow export of student list results within the same field-level and branch-level restrictions applied to interactive search.  
Actors: Student Administration Officer, Branch Manager, Reporting User.

**Preconditions**
1. User has `student.export`.
2. User has access to all requested branches.

**Inputs**
- active filters
- export format
- selected columns
- active branch context

**Processing Steps**
1. Re-run authorized filtered query.
2. Remove restricted fields not permitted for export.
3. Generate export file.
4. Stamp export metadata:
   - user,
   - generated at,
   - branch scope,
   - filter summary.
5. Log export event.
6. Return downloadable artifact.

**Outputs & Postconditions**
- Authorized export file is produced.
- Export is traceable.

**Priority**  
Could

---

### FR-SM-016 — Enforce Permission and Branch Context on Every Action

**Description & Actors**  
The system shall enforce both permission and branch-access rules for every student module command and query.  
Actors: System.

**Preconditions**
1. Any student module request is submitted.

**Inputs**
- authenticated user ID
- permission set
- assigned branches
- active branch context
- target record identifiers

**Processing Steps**
1. Resolve user permissions.
2. Resolve branch assignments and consolidated flag.
3. Resolve target record branch.
4. Compare requested action to permission matrix.
5. Compare target branch to effective access scope.
6. Deny request when any check fails.
7. Log failed authorization per security policy.

**Outputs & Postconditions**
- Only authorized requests succeed.
- Cross-branch leakage is prevented.

**Priority**  
Must

---

### FR-SM-017 — Provide Internal Student Reference Contract

**Description & Actors**  
The system shall expose an internal read contract so downstream modules can retrieve trusted student reference data without owning student master state.  
Actors: Enrollment, Finance, Attendance, Completion, Certificate, Reporting modules.

**Preconditions**
1. Calling module is trusted internal consumer.
2. Student exists and is not inaccessible by policy.

**Inputs**
- studentProfileId or studentNumber
- contract version
- caller context

**Processing Steps**
1. Validate internal caller authorization.
2. Load student profile and linked person.
3. Map to reference DTO containing only approved fields.
4. Omit fields not required by consumer contract.
5. Return stable versioned payload.

**Outputs & Postconditions**
- Downstream modules receive consistent student references.
- Ownership remains in Student Management.

**Priority**  
Must

---

### FR-SM-018 — Support Bilingual Name Display

**Description & Actors**  
The system shall display English and Arabic student name values where localized person-name data exists.  
Actors: All read-capable users.

**Preconditions**
1. User has `student.read`.
2. Localized full-name fields exist for the person.

**Inputs**
- studentProfileId
- language preference

**Processing Steps**
1. Load person name fields.
2. If localized name is available for requested language, use it.
3. Otherwise fall back to default full name.
4. Preserve source value without overwriting alternate language data.

**Outputs & Postconditions**
- Student identity is viewable in appropriate language context.

**Priority**  
Should

---

### FR-SM-019 — Preserve Effective-Date Aware Lifecycle History

**Description & Actors**  
The system shall preserve effective dating for sensitive lifecycle actions such as activation, suspension, and archival where policy requires date-ranged validity.  
Actors: Student Administration Officer, Branch Manager, Compliance/Audit Officer.

**Preconditions**
1. Lifecycle action includes effective dating.

**Inputs**
- studentProfileId
- targetStatus
- effectiveStartDate
- effectiveEndDate optional
- reason

**Processing Steps**
1. Validate status transition.
2. Validate date boundaries.
3. Persist status change with effective dates or record them in associated history structure/audit payload.
4. Ensure overlapping effective periods for the same status type are not allowed when policy forbids.
5. Return effective history summary.

**Outputs & Postconditions**
- Historical lifecycle validity is traceable in business time, not only system time.

**Priority**  
Should

---

### FR-SM-020 — Validate Mandatory Fields and Data Bounds

**Description & Actors**  
The system shall validate mandatory fields, field lengths, formats, uniqueness, and cross-field consistency before saving any student record.  
Actors: System.

**Preconditions**
1. Create or update request is submitted.

**Inputs**
- person fields
- student fields
- metadata

**Processing Steps**
1. Validate mandatory fields:
   - name,
   - branch context,
   - joinedAt,
   - student status on create,
   - at least one contact method.
2. Validate email format where supplied.
3. Validate phone format and length.
4. Validate date fields are not future-invalid where policy forbids.
5. Validate identity numbers are within configured maximum lengths.
6. Validate status and lookup codes exist in master data.
7. Validate number uniqueness where applicable.
8. Reject request with field-specific errors on failure.

**Outputs & Postconditions**
- Only valid student records are persisted.

**Priority**  
Must

## 3. Comprehensive Business Rules

| ID | Rule Category | Business Rule |
|---|---|---|
| BR-SM-001 | Identity Ownership | A student shall always be represented through the shared `Person` model; student profile data shall not duplicate person identity independently. |
| BR-SM-002 | Student Creation Source | Student profile creation is permitted only from approved admission, authorized direct registration, walk-in handoff, online-registration handoff, or corporate participant conversion. |
| BR-SM-003 | Single Student Per Person | One person may have only one operational student profile at a time. |
| BR-SM-004 | Corporate Conversion | A corporate participant becomes a student when enrollment requires a student reference; corporate linkage must remain retained. |
| BR-SM-005 | Enrollment Separation | Student Management does not own enrollment state; student status changes shall not directly mutate enrollment statuses. |
| BR-SM-006 | Branch Scope | Access to a student profile is granted dynamically to any branch containing an active relationship (Home/Origin Branch, Lead, Admission, or Enrollment). A user may read/write student records only if they have access to at least one of these relationship branches. |
| BR-SM-007 | Consolidated Read | Consolidated multi-branch reading requires explicit permission in addition to branch assignments. |
| BR-SM-008 | Branch Trust Boundary | Client-provided branch identifiers shall never be trusted without server-side authorization checks. |
| BR-SM-009 | Numbering Series Priority | Student numbers shall use branch-specific numbering series when active; otherwise use configured fallback series. |
| BR-SM-010 | Student Number Uniqueness | `studentNumber` must be globally unique within the ASTI instance. |
| BR-SM-011 | Duplicate Blocking Identity | Exact match on Civil ID, passport number, or visa number with another operational person/student shall block create or update until resolved. |
| BR-SM-012 | Duplicate Existing Student | If a person already has a student profile, the system must reuse that student and must not create another. |
| BR-SM-013 | Contact Duplicate Review | Exact match on email or phone with another person/student requires duplicate review and may block based on policy severity. |
| BR-SM-014 | Mandatory Contact | At least one contact method, phone or email, must be stored for a student-capable person. |
| BR-SM-015 | Joined Date | `joinedAt` must be present when a student profile is created. |
| BR-SM-016 | Status on Create | New student profile shall start in `Active` status unless an approved exception policy defines `Pending`. |
| BR-SM-017 | Allowed Student States | Allowed student lifecycle states are `Pending`, `Active`, `Suspended`, and `Archived`. |
| BR-SM-018 | Transition Matrix | Allowed transitions are: `Pending → Active`, `Pending → Archived`, `Active → Suspended`, `Active → Archived`, `Suspended → Active`, `Suspended → Archived`, `Archived → Active` through restoration only. |
| BR-SM-019 | Prohibited Transition | `Archived → Suspended` is not allowed. |
| BR-SM-020 | Effective Dates | When effective dates are used, `effectiveStartDate` is mandatory and `effectiveEndDate` cannot be earlier than `effectiveStartDate`. |
| BR-SM-021 | Soft Delete Only | Student records shall never be hard deleted by user-facing business functions. |
| BR-SM-022 | Archive Flags | Archival shall set `isDeleted = true` and `deletedAt` to the business timestamp. |
| BR-SM-023 | Restore Semantics | Restoration shall clear soft-delete flags and move status back to an allowed operational state, typically `Active`. |
| BR-SM-024 | Archived Visibility | Archived students are excluded from default operational searches unless the user explicitly requests archived records and has permission. |
| BR-SM-025 | Sensitive Edit Audit | Create, update, status change, merge, archival, restoration, and ID-card actions shall always be audited. |
| BR-SM-026 | Immutable Audit | Audit records are immutable after creation. |
| BR-SM-027 | Concurrency | Student update commands must use optimistic locking or an equivalent concurrency control mechanism. |
| BR-SM-028 | ID Card Uniqueness | `idCardNumber` must be unique when ID-card numbering is enabled. |
| BR-SM-029 | ID Card Preconditions | An ID card may not be marked issued for an archived student. |
| BR-SM-030 | Merge Survivor | Duplicate merge requires explicit survivor record selection. |
| BR-SM-031 | Merge Traceability | Merge must preserve lineage from retired record to survivor record. |
| BR-SM-032 | Merge Deletion | Merge does not hard delete the retired record. |
| BR-SM-033 | Restricted Fields | Civil ID, passport number, visa number, and full profile photo references are sensitive fields subject to permission-based visibility. |
| BR-SM-034 | Bilingual Display | Where localized name values exist, UI may display English or Arabic according to user preference without changing source data. |
| BR-SM-035 | Business Timestamp | Business operations shall use Oman timezone default UTC+4 for stored operational timestamps and effective-date evaluation. |
| BR-SM-036 | Export Security | Export shall include only fields allowed by permission and branch scope. |
| BR-SM-037 | Export Audit | Every student export must be logged with user, time, branch context, and filters used. |
| BR-SM-038 | Student-to-Enrollment Link | Enrollment creation must reference an existing operational student profile; Student Management does not create placeholder enrollment-only students. |
| BR-SM-039 | Person Merge Caution | Person-level identity consolidation and student-profile consolidation must not be treated as the same operation without explicit rule handling. |
| BR-SM-040 | Lookup Validity | Nationality, status, and other coded fields must come from active master data entries. |
| BR-SM-041 | Search Determinism | Result ordering for paginated student search must be deterministic to prevent duplicate or skipped rows across pages. |
| BR-SM-042 | Cross-Module Read Model | Downstream modules may consume student reference contracts but may not independently persist master student identity changes. |
| BR-SM-043 | Active Enrollment Archive Check | If branch policy blocks archival of students with active enrollments, archival must fail until operational dependencies are resolved. |
| BR-SM-044 | Duplicate Review Logging | Duplicate detection outcomes shall be logged for operational traceability even when save is blocked. |
| BR-SM-045 | Restoration Audit | Student restoration shall produce the same level of audit detail as archival. |

## 4. Cross-Module Dependencies Mapping

| Dependent / Related Module | Dependency Type | Student Management Dependency Detail |
|---|---|---|
| Identity & Access Management | Upstream | Provides authenticated user context, permission codes, branch access, and consolidated reporting authorization. |
| Organization Management | Upstream | Provides institute and branch structure used for branch scoping and branch-aware numbering selection. |
| Configuration / Master Data | Upstream | Provides numbering series, lookup values, nationality lists, status codes, and localization metadata. |
| Lead, Enquiry & CRM | Upstream / Adjacent | Qualified lead data may flow into admission, which then leads to student creation; CRM does not own student master. |
| Admission & Enrollment Management | Bidirectional Adjacent | Approved admissions create or link students; enrollment requires operational student reference. Student module must not own enrollment transaction state. |
| Walk-In Fast Track Enrollment | Upstream / Adjacent | Walk-in intake may trigger rapid student lookup or controlled direct creation before enrollment finalization. |
| Corporate Training Management | Upstream / Adjacent | Corporate participant conversion uses participant and corporate account data while preserving corporate linkage. |
| Course Catalog Management | Indirect | No direct ownership dependency, but student lifecycle ultimately supports enrollment into courses and batches defined there. |
| Training Delivery Management | Downstream Consumer | Uses student reference via enrollment context for batch participation visibility. |
| Scheduling, Calendar & Holiday | Indirect | No direct ownership dependency; student module does not schedule sessions. |
| Attendance Management | Downstream Consumer | Consumes student and enrollment references for attendance records and reports. |
| Fee, Billing & Receivables Management | Downstream Consumer | Consumes student identity and student reference for invoices, payments, receipts, refunds, and receivables. |
| Faculty / Trainer Management | Downstream Consumer | Trainers and academic coordinators may view student profile data in read-only educational workflows. |
| Exam, Result & Completion Management | Downstream Consumer | Consumes student references for assessments, results, and completion approvals. |
| Certificate Management | Downstream Consumer | Uses student profile and enrollment references for certificate issuance, verification, and reissue records. |
| Communication & Notification Management | Downstream Consumer | Uses student contact and language fields to deliver messages; does not own contact master. |
| Document Management | Bidirectional Adjacent | Student profile screens may show student-owned document summaries; document upload and verification remain owned by Document Management. |
| Reporting & Executive Dashboards | Downstream Consumer | Consumes student counts, lifecycle statuses, and branch distribution for reporting and dashboards. |
| Audit & Compliance | Cross-Cutting Consumer | Receives audit events and exposes compliance review capabilities for student actions. |

## 5. Recommended Internal Contract Shape for Downstream Consumers

The following reference payload should be used for internal consumers that need student data without owning the master record.

```json
{
  "studentProfileId": "uuid",
  "studentNumber": "string",
  "studentStatus": "Pending | Active | Suspended | Archived",
  "joinedAt": "ISO-8601 datetime",
  "branchId": "uuid",
  "person": {
    "personId": "uuid",
    "fullName": "string",
    "fullNameLocalized": {
      "en": "string",
      "ar": "string"
    },
    "nationality": "string",
    "primaryEmail": "string | null",
    "primaryPhone": "string | null"
  },
  "corporateLink": {
    "corporateParticipantId": "uuid | null",
    "corporateAccountId": "uuid | null"
  },
  "flags": {
    "isDeleted": false,
    "idCardIssued": false
  }
}
```

## 6. Summary

The Student Management module is the identity-stable operational owner of ASTI student profiles. It ensures that each learner is represented once, managed securely, accessed only within authorized branch boundaries, and reused consistently across admission, enrollment, finance, attendance, completion, certificate, communication, and reporting workflows. Its success criteria are low duplication, high traceability, strict branch control, and consistent downstream reference quality.
