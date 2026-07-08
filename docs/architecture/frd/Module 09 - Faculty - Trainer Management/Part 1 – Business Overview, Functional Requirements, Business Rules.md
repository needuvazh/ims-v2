# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 09 – Faculty / Trainer Management

## 1. Introduction

Faculty / Trainer Management is the bounded context responsible for ASTI’s trainer operational master data. The module establishes who is recognized as a trainer, what type of trainer the person is, which branch the trainer is operationally affiliated with, which qualifications are recorded, when and where the trainer is available, which courses the trainer is authorized to deliver, and which compensation rate structures are configured for delivery.

The module uses the shared Party/Person model. A TrainerProfile shall reference a canonical Person and shall not duplicate identity fields such as name, Civil ID, passport number, email, phone, nationality, or photo. This preserves a single identity that may also participate as User, Student, Corporate Contact, Corporate Participant, or a future EmployeeProfile.

Trainer Management does not own course definitions, batches, sessions, timetable reservations, payroll, attendance, completion evaluation, certificates, or documents. It provides governed trainer master data and eligibility checks to the contexts that own those processes.

### 1.1 Business Benefits

- Reduces duplicate and inconsistent trainer identity data.
- Prevents assignment of inactive or unauthorized trainers.
- Improves timetable planning through reliable availability windows.
- Supports FullTime, PartTime, and Freelance trainer operating models.
- Gives academic teams structured qualification and authorization evidence.
- Gives authorized finance users governed compensation-rate inputs without prematurely introducing payroll functionality.
- Improves branch-level workforce planning and consolidated management reporting.
- Creates a complete audit trail for sensitive trainer administration actions.
- Preserves clean bounded-context ownership in the modular monolith.

---

## 2. Functional Requirements Specifications

## FR-FTM-001 – Search and List Trainers

**Description & Actors**  
The system shall allow authorized Trainer Administrators, Academic Coordinators, Training Coordinators, Branch Managers, Auditors, and Reporting Users to search and list trainers within their permitted branch scope.

**Preconditions**

1. User is authenticated.
2. User has `trainer.read` or an explicitly mapped reporting permission.
3. Active branch context is valid for the user.

**Inputs**

- `branchId` constrained by authorized branch scope.
- `searchText` matched against trainerCode and permitted Person display-name fields.
- `trainerType`: FullTime, PartTime, Freelance.
- `status`.
- `courseId` optional authorization filter.
- `specialization` optional filter.
- `effectiveOn` date optional.
- `page` minimum 1.
- `pageSize` allowed values 25, 50, or 100.
- `sortBy`: trainerCode, displayName, trainerType, status, effectiveStartDate, createdAt.
- `sortDirection`: asc or desc.

**Processing Steps**

1. Resolve authenticated user permissions and authorized branches.
2. Reject requested branch scope outside authorized branches.
3. Build a query excluding soft-deleted TrainerProfile rows.
4. Apply branch filter before optional search filters.
5. Join Person only for permitted display fields required by the response.
6. When `courseId` is supplied, include only trainers with a non-deleted authorization whose status is active and whose effective period contains `effectiveOn` or the current Oman business date.
7. Apply deterministic secondary sorting by trainerCode and id.
8. Apply server-side pagination.
9. Exclude compensation amounts unless the user separately has `trainer.compensation.read`.

**Outputs & Postconditions**

- Paginated trainer summary list.
- Total count matching the authorized query.
- Applied filters metadata.
- No data outside authorized branch scope is returned.

**Priority:** Must

---

## FR-FTM-002 – Create Trainer Profile

**Description & Actors**  
Authorized users shall create a TrainerProfile linked to an existing canonical Person or to a newly created Person through the shared identity capability.

**Preconditions**

1. User has `trainer.create`.
2. Target branch is in the user’s write-authorized branch scope.
3. Referenced Person exists, or supplied person creation input passes shared Person validation.
4. The Person is not already linked to a non-deleted TrainerProfile.

**Inputs**

- `personId` or validated Person creation command.
- `branchId`.
- `trainerCode` when manual numbering is allowed; otherwise generated from NumberingSeries.
- `trainerType`: FullTime, PartTime, Freelance.
- `specialization`.
- `qualificationSummary`.
- `status` initial value subject to rules.
- `effectiveStartDate`.
- `effectiveEndDate` optional.

**Processing Steps**

1. Authorize action and branch.
2. Resolve or create canonical Person using Party/Person rules.
3. Check uniqueness of Person-to-TrainerProfile relation.
4. Generate or validate unique trainerCode.
5. Validate trainerType enum.
6. Validate effective date range.
7. Validate initial status against allowed initial states.
8. Create TrainerProfile with audit metadata and version.
9. Record audit entry and publish in-process `TrainerCreated` event after successful transaction.

**Outputs & Postconditions**

- Created TrainerProfile identifier and trainerCode.
- TrainerProfile is linked to exactly one Person and one operational branch.
- Audit evidence exists.

**Priority:** Must

---

## FR-FTM-003 – View Complete Trainer Profile

**Description & Actors**  
Authorized users shall view a trainer detail record with data segmented by permission.

**Preconditions**

1. User has `trainer.read`.
2. Trainer belongs to an accessible branch or is visible through permitted consolidated scope.

**Inputs**

- `trainerId`.
- Optional `effectiveOn` date for effective-dated views.

**Processing Steps**

1. Enforce branch scope.
2. Load non-deleted TrainerProfile and canonical Person display fields.
3. Load non-deleted qualifications if qualification read permission exists.
4. Load availability if availability read permission exists.
5. Load course authorizations if authorization read permission exists.
6. Load compensation rate metadata only when compensation read permission exists.
7. Load current BatchTrainer and Session assignment references from Training Delivery read interfaces without taking ownership of those records.
8. Load document reference verification status through Document Management interface when permitted.
9. Return explicit section-level access indicators where data is intentionally withheld.

**Outputs & Postconditions**

- Complete authorized trainer detail view.
- No unauthorized financial or branch data is exposed.

**Priority:** Must

---

## FR-FTM-004 – Update Trainer Profile

**Description & Actors**  
Authorized users shall update mutable TrainerProfile attributes while preserving Person identity ownership and preventing lost updates.

**Preconditions**

1. User has `trainer.update`.
2. Trainer is within writable branch scope.
3. Submitted `version` matches current record version.

**Inputs**

- `trainerId`.
- `version`.
- `branchId` if branch reassignment is permitted by policy.
- `trainerType`.
- `specialization`.
- `qualificationSummary`.
- `effectiveStartDate`.
- `effectiveEndDate` optional.
- `reason` when sensitive fields change.

**Processing Steps**

1. Authorize user and branch.
2. Load current record and reject stale version.
3. Compare requested changes with current values.
4. Reject attempts to mutate Person-owned identity attributes through TrainerProfile endpoint.
5. Validate trainer type and date range.
6. For branch changes, validate no active future assignments conflict with new operational scope; if assignments exist, reject with a structured business-rule error unless an explicitly defined authorized migration workflow is used.
7. Update fields, increment version, set updatedBy and updatedAt.
8. Write old/new values to audit log.
9. Publish `TrainerUpdated` in-process event.

**Outputs & Postconditions**

- Updated TrainerProfile.
- Version incremented.
- Audit trail persisted.

**Priority:** Must

---

## FR-FTM-005 – Change Trainer Operational Status

**Description & Actors**  
Authorized users shall manage trainer operational status using controlled state transitions.

**Preconditions**

1. User has `trainer.status.manage`.
2. Trainer is in writable branch scope.
3. Requested transition is permitted.

**Inputs**

- `trainerId`.
- `targetStatus`: Active, Inactive, Suspended.
- `effectiveDate`.
- `reason` mandatory for Suspended and for Active-to-Inactive transition.
- `version`.

**Processing Steps**

1. Load trainer and validate optimistic version.
2. Validate transition against BR-FTM status matrix.
3. For activation, verify effective date validity and required Person linkage.
4. For suspension or inactivation, query Training Delivery/Scheduling for future confirmed assignments from effectiveDate onward.
5. If future assignments exist, return blocking assignment references unless the consuming workflow supports reassignment before status change.
6. Persist status and effective metadata.
7. Record audit values and reason.
8. Publish appropriate event: `TrainerActivated`, `TrainerDeactivated`, `TrainerSuspended`, and `TrainerStatusChanged`.

**Outputs & Postconditions**

- New trainer status.
- Status history is auditable.
- Invalid future delivery states are not silently created.

**Priority:** Must

---

## FR-FTM-006 – Manage Trainer Qualifications

**Description & Actors**  
Authorized users shall add, update, view, and soft delete structured TrainerQualification records.

**Preconditions**

1. User has `trainer.qualification.manage` for writes or `trainer.qualification.read` for reads.
2. Trainer is accessible within branch scope.

**Inputs**

- `trainerId`.
- `qualificationName` non-empty.
- `institution` non-empty.
- `yearCompleted` four-digit year not later than current Oman calendar year.
- `documentId` optional.

**Processing Steps**

1. Validate trainer access.
2. Normalize text inputs according to application text rules without changing legal meaning.
3. Validate year range.
4. If documentId exists, validate document exists and is visible through Document Management ownership rules.
5. Create or update qualification.
6. Soft deletion sets `isDeleted=true`, `deletedAt`, `updatedBy`, and version increment; no physical delete occurs.
7. Record audit entry.
8. Publish `TrainerQualificationAdded` or `TrainerQualificationUpdated` as applicable.

**Outputs & Postconditions**

- Structured qualification record linked to trainer.
- Optional document reference retained.
- Audit record generated for writes.

**Priority:** Must

---

## FR-FTM-007 – Manage Trainer Availability

**Description & Actors**  
Authorized users shall configure recurring weekly availability windows for a trainer by branch and effective period.

**Preconditions**

1. User has `trainer.availability.manage`.
2. Trainer and target branch are within authorized scope.
3. TrainerProfile is not soft-deleted.

**Inputs**

- `trainerId`.
- `dayOfWeek`: Monday through Sunday.
- `startTime` local Oman business time.
- `endTime` local Oman business time.
- `branchId`.
- `status`: Active or Inactive.
- `effectiveStartDate`.
- `effectiveEndDate` optional.

**Processing Steps**

1. Validate branch scope.
2. Validate dayOfWeek.
3. Validate `startTime < endTime` and same-day recurring interval semantics.
4. Validate date range.
5. Check overlapping active availability windows for same trainer, day, branch, and intersecting effective period.
6. Merge is not automatic; exact duplicates are rejected and overlapping records are rejected with conflicting record IDs.
7. Create or update availability.
8. Audit changes.
9. Publish `TrainerAvailabilityUpdated`.

**Outputs & Postconditions**

- Effective recurring availability window.
- No conflicting duplicate active availability records for the same branch/day/effective intersection.

**Priority:** Must

---

## FR-FTM-008 – Validate Availability Window Bounds and Overlaps

**Description & Actors**  
The module shall provide deterministic validation for proposed availability changes and scheduling queries.

**Preconditions**

1. Trainer exists and is accessible.
2. Candidate interval is supplied.

**Inputs**

- trainerId, branchId, date, startDateTime, endDateTime.

**Processing Steps**

1. Convert target timestamp handling to configured Oman GST business timezone for calendar-day/day-of-week evaluation.
2. Require target end timestamp to be later than start timestamp.
3. Determine local day of week.
4. Select active, non-deleted availability records whose effective period contains target date.
5. Select records matching target branch and local weekday.
6. Determine whether requested interval is fully contained within at least one valid availability window.
7. Return explicit reason codes: AVAILABLE, NO_WINDOW, OUTSIDE_WINDOW, INACTIVE_TRAINER, BRANCH_MISMATCH, INVALID_INTERVAL.

**Outputs & Postconditions**

- Structured availability-validation result.
- No schedule mutation occurs in this module.

**Priority:** Must

---

## FR-FTM-009 – Manage Trainer Course Authorization

**Description & Actors**  
Authorized Academic Coordinators or delegated administrators shall authorize trainers to deliver specific courses for defined effective periods.

**Preconditions**

1. User has `trainer.authorization.manage`.
2. Trainer is accessible and not soft-deleted.
3. Course exists in Course Catalog.

**Inputs**

- `trainerId`.
- `courseId`.
- `status`: Active, Inactive, Suspended, Expired.
- `effectiveStartDate`.
- `effectiveEndDate` optional.
- `reason` required for suspension or manual expiration.

**Processing Steps**

1. Validate permission and branch context.
2. Validate course reference through Course Catalog read boundary.
3. Validate effective date range.
4. Detect overlapping active authorization periods for same trainer/course.
5. Reject duplicate or overlapping active authorization periods.
6. Persist authorization.
7. Audit old/new values.
8. Publish `TrainerCourseAuthorized` for activation and `TrainerCourseAuthorizationExpired` when authorization expires or is manually expired.

**Outputs & Postconditions**

- Effective course authorization record.
- Eligibility queries can use authorization immediately after commit.

**Priority:** Must

---

## FR-FTM-010 – Query Eligible Trainers for Course, Branch, and Time

**Description & Actors**  
Training Coordinators and system consumers shall retrieve trainers eligible for a proposed course delivery slot.

**Preconditions**

1. User/system caller has `trainer.eligibility.read` or trusted internal module authorization.
2. Course and branch exist.
3. Date/time interval is valid.

**Inputs**

- `courseId`.
- `branchId`.
- `startDateTime`.
- `endDateTime`.
- optional `trainerType`.
- optional specialization filter.

**Processing Steps**

1. Validate caller and branch scope.
2. Select non-deleted trainers with Active status and effective profile period containing target date.
3. Restrict by branch compatibility policy.
4. Join active course authorizations valid on target date.
5. Evaluate recurring availability containment for target local weekday and interval.
6. Call Scheduling conflict check for existing trainer booking overlap.
7. Return only trainers passing all checks; optionally include exclusion reason counts but not unauthorized personal data.
8. Sort by exact branch match, then trainerCode unless a defined business ranking rule is configured.

**Outputs & Postconditions**

- Eligible trainer list with authorization and availability evidence summary.
- Read-only operation; no reservation is created.

**Priority:** Must

---

## FR-FTM-011 – Configure Trainer Compensation Rate

**Description & Actors**  
Authorized Finance users or specifically delegated managers shall configure effective-dated trainer compensation rate structures.

**Preconditions**

1. User has `trainer.compensation.manage`.
2. Trainer is accessible within permitted branch scope.
3. Referenced batch/session exists when provided.

**Inputs**

- `trainerId`.
- `batchId` optional.
- `sessionId` optional.
- `paymentBasis`: Per Hour, Per Session, Per Student, Fixed.
- `amount` decimal greater than zero.
- `status`: Active or Inactive.
- `remarks` optional.
- `effectiveStartDate`.
- `effectiveEndDate` optional.

**Processing Steps**

1. Authorize separate compensation management permission.
2. Validate trainer and reference scope.
3. Validate amount greater than zero and within database currency precision bounds.
4. Validate paymentBasis enum.
5. If sessionId is provided, validate session belongs to the provided batch when batchId is also supplied and validate trainer relevance where required.
6. Validate date range.
7. Detect ambiguous overlapping active rates at the same specificity level for the same trainer and payment basis.
8. Reject ambiguity; permit different specificity levels because resolution precedence is deterministic.
9. Persist rate with audit metadata.
10. Record sensitive audit entry.
11. Publish `TrainerCompensationRateConfigured`.

**Outputs & Postconditions**

- Effective compensation rate record.
- Compensation data is visible only to separately authorized readers.

**Priority:** Must

---

## FR-FTM-012 – Resolve Applicable Compensation Rate

**Description & Actors**  
The module shall resolve the most specific active compensation rate for an authorized internal consumer.

**Preconditions**

1. Caller has `trainer.compensation.read` or trusted finance/payroll integration authorization.
2. Trainer and target date are valid.

**Inputs**

- trainerId.
- sessionId optional.
- batchId optional.
- targetDate.
- paymentBasis optional filter.

**Processing Steps**

1. Select active, non-deleted rates whose effective period contains targetDate.
2. Filter to trainerId.
3. Apply optional paymentBasis filter.
4. Rank specificity: exact session rate first; exact batch rate second; trainer-level rate with both batchId and sessionId null third.
5. If two active rates remain at the winning specificity for the same payment basis and effective date, return configuration ambiguity error rather than selecting nondeterministically.
6. Return amount, basis, source rate ID, specificity level, and effective period.

**Outputs & Postconditions**

- Deterministically resolved rate or explicit NO_RATE / AMBIGUOUS_RATE outcome.
- No payroll calculation occurs.

**Priority:** Should

---

## FR-FTM-013 – Validate Trainer Assignment Eligibility for Training Delivery

**Description & Actors**  
Training Delivery shall be able to validate a trainer before creating or confirming BatchTrainer or Session assignment.

**Preconditions**

1. Trusted internal call or authorized user.
2. Batch/course/branch references are supplied by Training Delivery.

**Inputs**

- trainerId, courseId, batchId, branchId, assignmentStart, assignmentEnd, assignmentRole.

**Processing Steps**

1. Verify trainer exists, is Active, non-deleted, and effective for assignment date.
2. Verify branch compatibility.
3. Verify active course authorization valid for assignment period.
4. Verify availability coverage for time-bound session assignment; for batch-level assignment without time window, validate profile and authorization and return availability as NOT_EVALUATED until sessions are scheduled.
5. Ask Scheduling for booking conflict evaluation when exact date/time is provided.
6. Return all failed checks together where safe so coordinator can correct assignment.

**Outputs & Postconditions**

- Eligibility result: ELIGIBLE or NOT_ELIGIBLE.
- Structured reasons: TRAINER_INACTIVE, PROFILE_NOT_EFFECTIVE, BRANCH_MISMATCH, COURSE_NOT_AUTHORIZED, AUTHORIZATION_EXPIRED, NOT_AVAILABLE, SCHEDULE_CONFLICT.
- No BatchTrainer or Session mutation is made by Module 09.

**Priority:** Must

---

## FR-FTM-014 – Provide Availability Validation to Scheduling

**Description & Actors**  
Scheduling shall validate trainer availability before confirming timetable changes.

**Preconditions**

1. Trusted internal Scheduling call.
2. Proposed schedule interval is valid.

**Inputs**

- trainerId, branchId, scheduledDate, startTime, endTime.

**Processing Steps**

1. Validate trainer status and profile effective date.
2. Validate branch scope.
3. Evaluate recurring availability window containment.
4. Return eligibility evidence and the applicable availability record ID.
5. Scheduling remains responsible for trainer double-booking and timetable conflict ownership.

**Outputs & Postconditions**

- Availability decision suitable for Scheduling validation.
- No schedule record is created or changed.

**Priority:** Must

---

## FR-FTM-015 – View Trainer Assignment References

**Description & Actors**  
Authorized users shall view batches and sessions currently referencing a trainer.

**Preconditions**

1. User has `trainer.read`.
2. Trainer is within branch scope.

**Inputs**

- trainerId.
- date range.
- assignment status filter.

**Processing Steps**

1. Validate branch access.
2. Query Training Delivery read model for BatchTrainer references.
3. Query Session references for trainerId.
4. Do not update or duplicate assignment records in Trainer Management.
5. Return course, batch, session, role, dates, and statuses allowed by caller permissions.

**Outputs & Postconditions**

- Read-only assignment reference view.

**Priority:** Should

---

## FR-FTM-016 – Soft Delete and Deactivate Trainer-Owned Records

**Description & Actors**  
The system shall prevent physical deletion and provide controlled soft deletion or deactivation.

**Preconditions**

1. User has the manage permission for the target entity type.
2. Target record is accessible.

**Inputs**

- entityType: TrainerProfile, TrainerQualification, TrainerAvailability, TrainerCourseAuthorization, TrainerCompensationRate.
- entityId.
- reason.
- version where supported.

**Processing Steps**

1. Authorize action.
2. Check active references and business constraints.
3. TrainerProfile soft deletion is blocked while active/future BatchTrainer or Session references exist.
4. For effective-dated child records, prefer status deactivation/end-dating when historical business evidence must remain operationally interpretable.
5. When soft delete is allowed, set `isDeleted=true` and `deletedAt` without removing row.
6. Record audit entry with reason.
7. Exclude soft-deleted records from normal queries.

**Outputs & Postconditions**

- Record deactivated or soft-deleted according to rule.
- Historical audit evidence remains.

**Priority:** Must

---

## FR-FTM-017 – Trainer Operational Reports and Export

**Description & Actors**  
Authorized users shall view and export trainer operational datasets.

**Preconditions**

1. `trainer.report.view` for viewing.
2. `trainer.report.export` for export.
3. Consolidated cross-branch access requires `trainer.report.consolidated.view` and appropriate branch access.

**Inputs**

- branch scope.
- date range.
- trainer status/type.
- course authorization filter.
- report type: roster, qualification coverage, authorization coverage, availability coverage, compensation configuration coverage, assignment utilization reference.
- export format allowed by platform standard.

**Processing Steps**

1. Resolve authorized branch set.
2. Apply report filters server-side.
3. Read owned trainer data and authorized read models from dependent contexts.
4. Remove compensation fields unless caller has compensation read permission.
5. Generate export with English/Arabic display fields where available.
6. Record audit event for sensitive exports.

**Outputs & Postconditions**

- On-screen report or exported file.
- Scope and filter metadata included.

**Priority:** Should

---

## FR-FTM-018 – Audit Sensitive Trainer Actions

**Description & Actors**  
The system shall create immutable audit evidence for critical trainer management actions.

**Preconditions**

1. A critical action is attempted.

**Inputs**

- entityType, entityId, action, oldValue, newValue, performedBy, performedAt, ipAddress where available, reason where applicable, branch context, correlation ID.

**Processing Steps**

1. Classify action sensitivity.
2. Redact protected identity values from generic logs while preserving approved audit representation.
3. Persist AuditLog in coordination with Audit & Compliance.
4. Ensure failed authorization attempts are captured in security logging without creating false business-state audit entries.
5. Make audit records read-only to ordinary module users.

**Outputs & Postconditions**

- Immutable auditable action record for successful sensitive business changes.

**Priority:** Must

---

## FR-FTM-019 – Enforce Branch Isolation

**Description & Actors**  
Every Trainer Management operation shall enforce branch access on the server.

**Preconditions**

1. User is authenticated.

**Inputs**

- Session userId.
- active branch context.
- requested branchId or entity identifier.

**Processing Steps**

1. Resolve UserBranchAccess from IAM.
2. Determine assigned branches, permitted child branches, and consolidated visibility.
3. Intersect requested branch scope with permitted scope.
4. Reject out-of-scope single-entity access with a non-leaking authorization/not-found response strategy defined by security architecture.
5. Apply permitted branch predicates to every query and write.
6. Do not trust browser filters or route parameters as authorization evidence.

**Outputs & Postconditions**

- Only permitted branch data can be viewed or changed.

**Priority:** Must

---

## FR-FTM-020 – Publish In-Process Domain Events

**Description & Actors**  
The module shall publish domain events inside the modular monolith after successful state changes so in-process consumers can react without transferring ownership.

**Preconditions**

1. Business transaction commits successfully.

**Inputs**

- Event type and minimum identifiers needed by consumers.

**Processing Steps**

1. Create event from committed domain change.
2. Include entity identifier, actor identifier, branch context, occurredAt in Oman-aware timestamp representation, and correlation ID.
3. Dispatch using modular-monolith in-process application integration mechanism.
4. Do not introduce an external broker.
5. Ensure consumers re-read authoritative data through owned boundaries when detailed state is required.

**Outputs & Postconditions**
Supported events include:

- TrainerCreated
- TrainerUpdated
- TrainerActivated
- TrainerDeactivated
- TrainerSuspended
- TrainerQualificationAdded
- TrainerQualificationUpdated
- TrainerAvailabilityUpdated
- TrainerCourseAuthorized
- TrainerCourseAuthorizationExpired
- TrainerCompensationRateConfigured
- TrainerStatusChanged

**Priority:** Should

---

## 3. Business Rules

| Rule ID    | Business Rule                                                                                                                                                                                                                            | Enforcement                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| BR-FTM-001 | A Person may be linked to at most one non-deleted TrainerProfile.                                                                                                                                                                        | Unique application/database constraint.     |
| BR-FTM-002 | TrainerProfile shall reference the shared Person model and shall not duplicate core identity fields.                                                                                                                                     | Domain/schema boundary.                     |
| BR-FTM-003 | `trainerCode` shall be unique among non-deleted trainer profiles and generated from configured numbering when configured.                                                                                                                | Unique constraint + numbering service.      |
| BR-FTM-004 | `trainerType` is limited to FullTime, PartTime, Freelance.                                                                                                                                                                               | Enum validation.                            |
| BR-FTM-005 | Trainer is not automatically an Employee; employee lifecycle belongs to future HRMS.                                                                                                                                                     | Context boundary.                           |
| BR-FTM-006 | Allowed trainer status transitions are Inactive→Active, Active→Inactive, Active→Suspended, Suspended→Active, Suspended→Inactive. Same-state transitions are idempotent reads/no-op updates and shall not create duplicate change events. | Domain state machine.                       |
| BR-FTM-007 | Initial TrainerProfile status may be Inactive or Active; Suspended is not a valid initial state.                                                                                                                                         | Create validation.                          |
| BR-FTM-008 | A trainer cannot be activated before `effectiveStartDate` and cannot be considered active after `effectiveEndDate`.                                                                                                                      | Eligibility evaluation.                     |
| BR-FTM-009 | `effectiveEndDate`, when present, must be on or after `effectiveStartDate`.                                                                                                                                                              | Validation for all effective-dated records. |
| BR-FTM-010 | Trainer assignment validation requires active profile status and effective profile period coverage.                                                                                                                                      | Eligibility service.                        |
| BR-FTM-011 | Qualification `yearCompleted` cannot be later than the current Oman business calendar year.                                                                                                                                              | Qualification validation.                   |
| BR-FTM-012 | Qualification evidence is referenced through Document Management; Trainer Management does not own document storage or verification workflow.                                                                                             | Context boundary.                           |
| BR-FTM-013 | Availability weekday must be one of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.                                                                                                                                      | Enum validation.                            |
| BR-FTM-014 | Availability startTime must be earlier than endTime. Cross-midnight recurring windows shall be represented as two day-specific availability records.                                                                                     | Time validation.                            |
| BR-FTM-015 | Exact duplicate or overlapping active availability windows for the same trainer, branch, weekday, and intersecting effective period are not allowed.                                                                                     | Overlap validation.                         |
| BR-FTM-016 | A proposed time-bound assignment is available only when the requested interval is fully contained within an effective active availability window.                                                                                        | Availability algorithm.                     |
| BR-FTM-017 | Availability timestamps and weekday calculations use Oman GST, UTC+4, as default business timezone.                                                                                                                                      | Timezone rule.                              |
| BR-FTM-018 | TrainerCourseAuthorization must reference an existing Course owned by Course Catalog.                                                                                                                                                    | Referential/domain validation.              |
| BR-FTM-019 | A trainer must have an active effective TrainerCourseAuthorization for the course before a course-specific assignment can be confirmed.                                                                                                  | Eligibility validation.                     |
| BR-FTM-020 | Overlapping active authorization periods for the same trainer and course are not allowed.                                                                                                                                                | Overlap validation.                         |
| BR-FTM-021 | Authorization status values are Active, Inactive, Suspended, Expired. An authorization with passed effectiveEndDate is treated as ineffective even if a stale status field has not yet been normalized.                                  | Effective-state evaluation.                 |
| BR-FTM-022 | Course authorization does not grant system access; IAM roles and permissions remain separate.                                                                                                                                            | Security boundary.                          |
| BR-FTM-023 | Trainer assignment must respect availability; Scheduling additionally owns double-booking and timetable conflict prevention.                                                                                                             | Cross-context rule.                         |
| BR-FTM-024 | Compensation payment basis is limited to Per Hour, Per Session, Per Student, Fixed.                                                                                                                                                      | Enum validation.                            |
| BR-FTM-025 | Compensation amount must be greater than zero and use configured financial precision.                                                                                                                                                    | Numeric validation.                         |
| BR-FTM-026 | Compensation rates are sensitive and require explicit compensation read/manage permissions independent of generic trainer read permission.                                                                                               | Authorization.                              |
| BR-FTM-027 | At the same specificity level, trainer, payment basis, and effective date range shall not produce multiple simultaneously applicable active rates.                                                                                       | Ambiguity prevention.                       |
| BR-FTM-028 | Rate resolution precedence is Session-specific, then Batch-specific, then Trainer-level.                                                                                                                                                 | Deterministic resolution algorithm.         |
| BR-FTM-029 | Trainer Management configures rate inputs only; payroll calculation and payment are outside current scope.                                                                                                                               | Context boundary.                           |
| BR-FTM-030 | A TrainerProfile with active or future batch/session references cannot be soft-deleted.                                                                                                                                                  | Referential business constraint.            |
| BR-FTM-031 | No hard delete is allowed for trainer-owned business records.                                                                                                                                                                            | Persistence rule.                           |
| BR-FTM-032 | Soft-deleted records are excluded from normal search, eligibility, and resolution queries.                                                                                                                                               | Query invariant.                            |
| BR-FTM-033 | Sensitive actions require audit capture of actor, timestamp, entity, action, old value, new value, and reason where applicable.                                                                                                          | Audit requirement.                          |
| BR-FTM-034 | Branch scoping is enforced server-side for every read and write.                                                                                                                                                                         | Security invariant.                         |
| BR-FTM-035 | A user cannot expand branch scope by supplying a branchId in a client request.                                                                                                                                                           | Security invariant.                         |
| BR-FTM-036 | Consolidated cross-branch reporting requires explicit consolidated reporting permission plus branch visibility.                                                                                                                          | Reporting authorization.                    |
| BR-FTM-037 | Trainer profile updates shall use optimistic concurrency control through version checking or equivalent.                                                                                                                                 | Concurrency rule.                           |
| BR-FTM-038 | Person-owned fields must be changed through the Party/Person owning boundary, not through TrainerProfile mutation endpoints.                                                                                                             | Ownership rule.                             |
| BR-FTM-039 | BatchTrainer and Session assignment records are owned by Training Delivery and are never duplicated into Trainer Management.                                                                                                             | Ownership rule.                             |
| BR-FTM-040 | Course definitions are owned by Course Catalog; Trainer Management stores only course references in authorization records.                                                                                                               | Ownership rule.                             |
| BR-FTM-041 | Qualification document verification status is owned by Document Management.                                                                                                                                                              | Ownership rule.                             |
| BR-FTM-042 | Domain events are published only after successful business-state commit and do not transfer aggregate ownership.                                                                                                                         | Integration rule.                           |
| BR-FTM-043 | External message brokers shall not be introduced for this module under the current modular-monolith architecture.                                                                                                                        | Architecture constraint.                    |
| BR-FTM-044 | English and Arabic shared Person display values shall be presented when available; TrainerProfile must not maintain duplicate localized person names.                                                                                    | Localization/ownership rule.                |
| BR-FTM-045 | All user-visible operational dates and times default to Oman GST unless a defined display conversion requirement exists.                                                                                                                 | Localization rule.                          |

---

## 4. State Transition Rules

### 4.1 TrainerProfile Status

| From      | To        | Allowed | Conditions                                             | Permission              |
| --------- | --------- | ------: | ------------------------------------------------------ | ----------------------- |
| Inactive  | Active    |     Yes | Effective period valid; no blocking integrity issue.   | `trainer.status.manage` |
| Inactive  | Suspended |      No | Trainer must first become Active.                      | Not applicable          |
| Active    | Inactive  |     Yes | Reason required; future assignments must be resolved.  | `trainer.status.manage` |
| Active    | Suspended |     Yes | Reason required; future assignments must be resolved.  | `trainer.status.manage` |
| Suspended | Active    |     Yes | Suspension condition resolved; effective period valid. | `trainer.status.manage` |
| Suspended | Inactive  |     Yes | Reason required.                                       | `trainer.status.manage` |

### 4.2 TrainerCourseAuthorization Status

| From      | To        | Allowed | Conditions                                                                |
| --------- | --------- | ------: | ------------------------------------------------------------------------- |
| Inactive  | Active    |     Yes | Effective dates valid; no overlapping active authorization.               |
| Active    | Suspended |     Yes | Reason required.                                                          |
| Active    | Inactive  |     Yes | Administrative withdrawal.                                                |
| Active    | Expired   |     Yes | End date reached or authorized manual expiration.                         |
| Suspended | Active    |     Yes | Suspension resolved and authorization remains effective.                  |
| Suspended | Inactive  |     Yes | Administrative withdrawal.                                                |
| Suspended | Expired   |     Yes | Effective end date reached or authorized manual expiration.               |
| Expired   | Active    |      No | Create a new authorization effective period instead of rewriting history. |

---

## 5. Cross-Module Dependencies Mapping

| Dependent Context                | Direction                         | Data / Contract                                                                    | Module 09 Responsibility                                                          | Other Context Responsibility                                                          |
| -------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Identity & Access Management     | Upstream                          | User identity, permissions, UserBranchAccess                                       | Enforce permission and branch context                                             | Own authentication, roles, permissions, branch access assignments                     |
| Party / Person                   | Upstream shared identity          | Person identity and localized display data                                         | Reference Person; prevent duplicate trainer identity                              | Own Party and Person lifecycle/data                                                   |
| Organization Management          | Upstream                          | Branch reference and hierarchy                                                     | Validate trainer branch and availability branch references                        | Own Institute/Branch/Department/Classroom structure                                   |
| Configuration / Master Data      | Upstream                          | NumberingSeries and configurable lookup values where used                          | Consume configuration without hardcoding business-critical values                 | Own numbering and lookup configuration                                                |
| Course Catalog Management        | Upstream                          | Course reference                                                                   | Own TrainerCourseAuthorization referencing Course                                 | Own Course lifecycle, category, pricing, discounts, completion rules                  |
| Training Delivery Management     | Bidirectional                     | BatchTrainer, Session assignment references; eligibility validation                | Provide trainer status, authorization, eligibility; display assignment references | Own Batch, BatchTrainer, Session and assignment lifecycle                             |
| Scheduling, Calendar & Holiday   | Bidirectional                     | Proposed schedule interval and conflict result                                     | Provide availability validation                                                   | Own timetable, double-booking, classroom conflict, holiday and venue-block validation |
| Document Management              | Bidirectional reference           | documentId and verification status                                                 | Store qualification evidence reference; display status                            | Own document binary metadata, verification and expiry workflow                        |
| Exam, Result & Completion        | Downstream consumer               | Trainer reference                                                                  | Provide valid trainer reference data                                              | Own trainer recommendation, results, completion evaluation and approval               |
| Communication & Notification     | Downstream consumer               | Trainer reference/contact through Person                                           | Emit relevant trainer events and references                                       | Own templates, delivery request/logs and channel status                               |
| Reporting & Executive Dashboards | Downstream consumer               | Trainer roster, authorization, availability, qualification, utilization references | Provide governed source data/read models                                          | Own dashboard/report definitions, snapshots and presentation                          |
| Audit & Compliance               | Bidirectional platform capability | AuditLog action contract                                                           | Produce auditable change facts                                                    | Own AuditLog and approval history capability                                          |
| Future HRMS                      | Future peer                       | Person reference and employee relationship                                         | Keep Trainer independent from Employee                                            | Own EmployeeProfile and employment lifecycle                                          |
| Future Payroll                   | Future downstream                 | Compensation rate inputs                                                           | Provide authorized effective compensation configuration                           | Own payroll calculation, approval, payslip and payment processes                      |

---

## 6. Integration Contract Expectations

### 6.1 Trainer Eligibility Result

```ts
type TrainerEligibilityResult = {
  trainerId: string;
  courseId: string;
  batchId?: string;
  branchId: string;
  eligible: boolean;
  evaluatedAt: string;
  checks: {
    trainerActive: boolean;
    profileEffective: boolean;
    branchCompatible: boolean;
    courseAuthorized: boolean;
    authorizationEffective: boolean;
    availabilitySatisfied: boolean | null;
    scheduleConflictFree: boolean | null;
  };
  reasonCodes: Array<
    | 'TRAINER_INACTIVE'
    | 'PROFILE_NOT_EFFECTIVE'
    | 'BRANCH_MISMATCH'
    | 'COURSE_NOT_AUTHORIZED'
    | 'AUTHORIZATION_EXPIRED'
    | 'NOT_AVAILABLE'
    | 'SCHEDULE_CONFLICT'
  >;
};
```

### 6.2 Compensation Rate Resolution Result

```ts
type CompensationRateResolution = {
  trainerId: string;
  targetDate: string;
  result: 'RESOLVED' | 'NO_RATE' | 'AMBIGUOUS_RATE';
  rate?: {
    compensationRateId: string;
    paymentBasis: 'PerHour' | 'PerSession' | 'PerStudent' | 'Fixed';
    amount: string;
    specificity: 'Session' | 'Batch' | 'Trainer';
    effectiveStartDate: string;
    effectiveEndDate: string | null;
  };
};
```

---

## 7. Acceptance Baseline for Part 1

Part 1 is considered aligned when implementation and later FRD parts preserve all of the following:

1. TrainerProfile is linked to Person and does not duplicate identity.
2. Trainer type supports FullTime, PartTime, and Freelance.
3. Qualifications, availability, course authorization, and compensation rate are first-class trainer-owned concepts.
4. Batch and Session remain owned by Training Delivery.
5. Scheduling owns booking conflicts while Trainer Management owns availability facts.
6. Course Catalog owns Course; Trainer Management owns trainer-to-course authorization.
7. Compensation configuration is not payroll.
8. Branch isolation is enforced server-side.
9. No hard delete exists.
10. Effective dates, auditability, and optimistic concurrency are applied to sensitive mutable data.
11. Oman GST is the default operational timezone.
12. Domain integration remains inside the modular monolith without an external broker.
