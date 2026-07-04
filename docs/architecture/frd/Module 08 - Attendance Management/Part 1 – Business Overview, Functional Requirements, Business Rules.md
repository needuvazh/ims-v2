# Part 1 – Business Overview, Functional Requirements, Business Rules

## Module 08 – Attendance Management

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | M08-ATT |
| Bounded Context | Attendance Management |
| Application | Admin Portal |
| Architecture | Next.js TypeScript modular monolith |
| Primary Package | `packages/attendance` |
| Timezone | Oman GST, UTC+4 |
| Version | 1.0 |

---

## 1. Comprehensive Introduction

Attendance Management is the operational control point for verifying learner participation in ASTI training sessions. It connects scheduled training delivery with enrollment progress, course completion eligibility, certificate readiness, corporate training evidence, and management reporting.

In ASTI IMS, attendance must never exist as an isolated list of names. It must be attached to the central learning lifecycle:

```text
Student / Corporate Participant
        ↓
StudentProfile
        ↓
Enrollment
        ↓
Course + Batch
        ↓
Session
        ↓
AttendanceSession
        ↓
AttendanceRecord
```

This design ensures that every attendance mark contributes to the correct learner, course, batch, trainer, branch, and enrollment lifecycle. Regular learners, walk-in learners, website-originated learners, and corporate participants all converge into the `Enrollment` aggregate before attendance is captured.

The module supports Phase 1 manual attendance. Trainers and authorized academic staff can mark attendance for scheduled sessions, submit final attendance, and request corrections after submission. Branch managers and authorized coordinators can approve or reject correction requests. The module calculates attendance percentages and exposes them to Completion Management. Certificate Management must not directly compute attendance eligibility; it consumes approved completion status, while Completion Management consumes attendance evidence from this module.

---

## 2. Business Benefits

| Benefit ID | Business Benefit | Operational Impact |
|---|---|---|
| BB-M08-001 | Reliable attendance evidence | Supports defensible completion and certificate decisions. |
| BB-M08-002 | Reduced manual administration | Trainers mark attendance directly against generated rosters rather than spreadsheet-based registers. |
| BB-M08-003 | Better branch control | Branch-scoped access prevents accidental cross-branch data exposure. |
| BB-M08-004 | Strong audit posture | Corrections, approvals, submissions, exports, and soft deletes are traceable. |
| BB-M08-005 | Corporate reporting support | Corporate account attendance summaries can be generated from enrollment-linked participant records. |
| BB-M08-006 | Early intervention | Low attendance detection helps coordinators follow up before students become completion-ineligible. |
| BB-M08-007 | Completion readiness | Completion module receives consistent calculated attendance percentages. |
| BB-M08-008 | Bilingual operations | English and Arabic labels improve usability for ASTI users and learners where required. |
| BB-M08-009 | Data consistency | Attendance is linked to batch sessions and active enrollments, reducing duplicate or orphan records. |
| BB-M08-010 | Future integration readiness | Manual attendance remains source of truth while future biometric integration can be added as an input channel. |

---

## 3. Functional Requirements Specifications

### FR-M08-ATT-001 – Attendance Session Initialization

| Field | Specification |
|---|---|
| Description | The system shall create or initialize an `AttendanceSession` for a valid training `Session` so that attendance can be marked for enrolled learners. |
| Actors | Trainer, Academic Coordinator, Registrar, System Scheduler only for future automated pre-initialization jobs. Phase 1 attendance creation is manual. |
| Preconditions | User is authenticated; user has `attendance.session.create` for initialization or `attendance.session.submit` for final submission; target `Session` exists, is not soft-deleted, belongs to an active `Batch`, and is within the user’s authorized branch scope. |
| Inputs | `sessionId`, optional `attendanceDate`, optional `remarks`, current user context, active branch context. |
| Processing Steps | 1. Load `Session` by `sessionId` with `Batch`, `Course`, `Branch`, `TrainerProfile`, and `Classroom` references. 2. Reject if session is cancelled, deleted, outside branch scope, or has invalid batch/course reference. 3. Validate that session date is not in the future unless user has setup permission for future pre-initialization. 4. Check if an active `AttendanceSession` already exists for `sessionId + batchId + attendanceDate`. 5. If existing active record exists, return it instead of creating duplicate. 6. Create `AttendanceSession` with status `Draft`, `markedByTrainerId` if current user is trainer, `createdBy`, `branchId`, `batchId`, `sessionId`, `attendanceDate`, `version = 1`, `isDeleted = false`. 7. Write audit log action `AttendanceSessionCreated`. |
| Outputs & Postconditions | A unique draft `AttendanceSession` exists for the training session. No attendance records are created until roster generation or first save. |
| Priority | Must |

---

### FR-M08-ATT-002 – Branch-Scoped Session Listing

| Field | Specification |
|---|---|
| Description | The system shall list sessions requiring attendance only within the logged-in user’s permitted branch context. |
| Actors | Trainer, Academic Coordinator, Branch Manager, Registrar, Auditor. |
| Preconditions | User is authenticated; user has `attendance.session.read`; active branch context is selected. |
| Inputs | Date range, branch filter, course filter, batch filter, trainer filter, session status filter, attendance status filter, pagination, sorting. |
| Processing Steps | 1. Resolve user branch access from IAM. 2. If requested branch is not assigned and consolidated permission is absent, reject with authorization error. 3. Build query using server-derived allowed branch IDs. 4. Join `Session`, `Batch`, `Course`, `Classroom`, `TrainerProfile`, and optional `AttendanceSession`. 5. Exclude soft-deleted sessions and batches. 6. For trainer users without elevated permission, restrict list to assigned session trainer or batch trainer. 7. Return paginated results with attendance state: `NotInitialized`, `Draft`, `Submitted`, `CorrectionPending`, `Corrected`, or `Cancelled`. |
| Outputs & Postconditions | User sees only accessible sessions. No attendance data is exposed across unauthorized branches. |
| Priority | Must |

---

### FR-M08-ATT-003 – Attendance Roster Generation

| Field | Specification |
|---|---|
| Description | The system shall generate attendance roster records from active enrollments in the target batch. |
| Actors | Trainer, Academic Coordinator, Registrar. |
| Preconditions | Attendance session exists or can be initialized; batch exists; user has `attendance.record.read`; branch scope is valid. |
| Inputs | `attendanceSessionId` or `sessionId`, optional `includeLateJoiners`, optional `includeTransferredOut = false`. |
| Processing Steps | 1. Load attendance session and linked batch. 2. Query `Enrollment` where `batchId` equals target batch, `branchId` equals session branch, `isDeleted = false`, and status is one of `Confirmed`, `Active`, `Completed` if session date falls before completion date. 3. Exclude statuses `Draft`, `Submitted` before confirmation, `Cancelled`, `Dropped`, and transferred-out enrollments effective before session date. 4. Include corporate enrollments through `corporateParticipantId` while still using linked `StudentProfile`. 5. Exclude enrollments confirmed after session end unless `includeLateJoiners` is true and business date rules allow inclusion. 6. For each roster row, check if an active `AttendanceRecord` already exists. 7. Return combined roster with existing status or blank status. 8. Do not create duplicate records for the same `attendanceSessionId + enrollmentId`. |
| Outputs & Postconditions | Roster displays student number, student name, enrollment number, course, batch, status, remarks, and eligibility indicators. |
| Priority | Must |

---

### FR-M08-ATT-004 – Manual Individual Attendance Marking

| Field | Specification |
|---|---|
| Description | Authorized users shall mark each roster learner as `Present`, `Absent`, `Late`, or `Excused`. |
| Actors | Trainer, Academic Coordinator. |
| Preconditions | Attendance session is in `Draft` or `ReturnedForCorrection`; user has `attendance.record.mark`; target enrollment is valid for the session date. |
| Inputs | `attendanceSessionId`, `enrollmentId`, `studentProfileId`, `status`, `lateMinutes`, `excuseReasonCode`, `remarks`, `version`. |
| Processing Steps | 1. Validate session status allows marking. 2. Validate status is one of configured active values: `Present`, `Absent`, `Late`, `Excused`. 3. Validate `studentProfileId` matches the enrollment’s student profile. 4. Reject if enrollment does not belong to session batch or branch. 5. If status is `Late`, require `lateMinutes` between 1 and configured maximum session duration minutes. 6. If status is `Excused`, require `excuseReasonCode` and optional evidence reference if configured. 7. If status is `Present` or `Absent`, clear incompatible late/excuse fields. 8. Upsert active `AttendanceRecord` by `attendanceSessionId + enrollmentId`. 9. Increment record `version`. 10. Save `markedAt`, `markedBy`, and user branch context. 11. Audit draft record change if previous status existed. |
| Outputs & Postconditions | Attendance record is saved in draft form. Completion calculations are not affected until session is submitted. |
| Priority | Must |

---

### FR-M08-ATT-005 – Bulk Attendance Marking

| Field | Specification |
|---|---|
| Description | The system shall allow bulk marking of roster rows to reduce trainer workload. |
| Actors | Trainer, Academic Coordinator. |
| Preconditions | User has `attendance.record.bulkMark`; attendance session is editable; roster is loaded. |
| Inputs | `attendanceSessionId`, selected enrollment IDs or all unmarked rows, target status `Present` or `Absent`, optional remarks. |
| Processing Steps | 1. Validate bulk status is allowed. 2. For `Late` and `Excused`, do not allow generic bulk action unless configured with required per-student values. 3. Resolve selected enrollments from server-side roster, not from client-provided names. 4. Skip records already locked or not eligible. 5. Upsert attendance records for selected enrollments. 6. Return summary count: updated, skipped, failed. 7. Maintain draft state until final submission. |
| Outputs & Postconditions | Selected valid rows are marked in draft. User receives clear summary of applied and skipped rows. |
| Priority | Should |

---

### FR-M08-ATT-006 – Save Draft Attendance

| Field | Specification |
|---|---|
| Description | The system shall save incomplete attendance as draft without exposing it as final attendance evidence. |
| Actors | Trainer, Academic Coordinator. |
| Preconditions | User has marking permission; attendance session status is `Draft`; branch scope is valid. |
| Inputs | Attendance records array, session-level remarks, client version. |
| Processing Steps | 1. Validate optimistic lock version for attendance session. 2. Validate each record against roster eligibility. 3. Upsert records in a transaction. 4. Set attendance session status to `Draft`. 5. Update `updatedAt`, `updatedBy`, and increment `version`. 6. Audit draft save action with changed count. |
| Outputs & Postconditions | Draft is saved. Pending attendance dashboard continues to show the session as not submitted. |
| Priority | Must |

---

### FR-M08-ATT-007 – Final Attendance Submission

| Field | Specification |
|---|---|
| Description | The system shall validate and submit final attendance for a session. |
| Actors | Trainer, Academic Coordinator. |
| Preconditions | User has `attendance.session.submit`; attendance session exists; session belongs to user’s branch; roster has at least one eligible enrollment unless approved no-roster reason is configured. |
| Inputs | `attendanceSessionId`, final record list, `submissionRemarks`, `version`. |
| Processing Steps | 1. Load attendance session with current version. 2. Reject if already `Submitted`, `CorrectionPending`, `Cancelled`, or soft-deleted. 3. Regenerate server-side roster for the session date. 4. Compare submitted records against active roster. 5. Require a status for every required roster enrollment. 6. Validate status-specific fields: late minutes for `Late`, reason for `Excused`. 7. Identify new roster members not present in client payload and return validation error. 8. Save records and set `AttendanceSession.status = Submitted`. 9. Set `submittedAt`, `submittedBy`, `markedAt` if missing, and increment versions. 10. Write audit log action `AttendanceSubmitted`. 11. Publish in-process domain event `AttendanceMarked` or `AttendanceSubmitted` for reporting/completion recalculation inside the modular monolith. |
| Outputs & Postconditions | Attendance is locked as submitted. Completion and reporting calculations can consume it. |
| Priority | Must |

---

### FR-M08-ATT-008 – Attendance Lock and Edit Restriction

| Field | Specification |
|---|---|
| Description | The system shall prevent direct edits to submitted attendance records. |
| Actors | Trainer, Academic Coordinator, Branch Manager. |
| Preconditions | Attendance session status is `Submitted` or later. |
| Inputs | Attempted edit request, user context. |
| Processing Steps | 1. Detect target session status. 2. If status is submitted or corrected, reject direct update with message requiring correction workflow. 3. Allow only users with correction permissions to create correction request. 4. Log denied sensitive edit attempt if authenticated user has read access but not edit access. |
| Outputs & Postconditions | Submitted attendance remains immutable except through approved correction workflow. |
| Priority | Must |

---

### FR-M08-ATT-009 – Attendance Correction Request

| Field | Specification |
|---|---|
| Description | The system shall allow authorized users to request correction to submitted attendance with a mandatory reason and old/new values. |
| Actors | Trainer, Academic Coordinator. |
| Preconditions | User has `attendance.correction.request`; attendance session is submitted; correction deadline has not expired unless override permission is present. |
| Inputs | `attendanceRecordId`, `oldStatus`, `newStatus`, `newLateMinutes`, `newExcuseReasonCode`, `reasonCode`, `reasonNotes`, optional evidence document reference. |
| Processing Steps | 1. Load attendance record, attendance session, enrollment, batch, and branch. 2. Validate branch access. 3. Validate attendance session is `Submitted` or `Corrected`. 4. Validate requested old value matches current persisted value. 5. Validate new status and status-specific fields. 6. Validate correction deadline, for example within configured 7 calendar days after submission unless `attendance.correction.overrideDeadline` is granted. 7. Create `AttendanceCorrection` with status `PendingReview`, old value snapshot, new value request, requestedBy, requestedAt, reason. 8. Set parent session status to `CorrectionPending` if at least one pending correction exists. 9. Write audit log action `AttendanceCorrectionRequested`. |
| Outputs & Postconditions | Correction request is pending review. Original attendance record remains unchanged until approval. |
| Priority | Must |

---

### FR-M08-ATT-010 – Attendance Correction Approval and Rejection

| Field | Specification |
|---|---|
| Description | Authorized reviewers shall approve or reject correction requests. Approved corrections update attendance records and preserve history. |
| Actors | Academic Coordinator, Branch Manager, Auditor read-only. |
| Preconditions | User has `attendance.correction.approve` or `attendance.correction.reject`; correction request is pending; reviewer is not prohibited by segregation-of-duty rule. |
| Inputs | `attendanceCorrectionId`, action `Approve` or `Reject`, reviewer remarks, current version. |
| Processing Steps | 1. Load correction with attendance record and session. 2. Validate branch access and permission. 3. If configured, reject approval by same user who requested correction unless user has explicit override. 4. For approval, validate the attendance record still matches correction old-value snapshot. 5. Apply new status and related fields to `AttendanceRecord`. 6. Set correction status to `Approved` or `Rejected`; store `approvedBy`, `approvedAt`, remarks. 7. If no pending corrections remain, set session status to `Corrected` if any correction approved, otherwise `Submitted`. 8. Recalculate attendance percentages for affected enrollment. 9. Write audit log action `AttendanceCorrectionApproved` or `AttendanceCorrectionRejected`. |
| Outputs & Postconditions | Approved correction updates attendance record; rejected correction leaves record unchanged; correction history remains immutable. |
| Priority | Must |

---

### FR-M08-ATT-011 – Attendance Percentage Calculation

| Field | Specification |
|---|---|
| Description | The system shall calculate attendance percentage for an enrollment using submitted attendance sessions only. |
| Actors | Completion Module, Trainer, Academic Coordinator, Branch Manager, Reporting Module. |
| Preconditions | Enrollment exists; user/system actor has read permission; attendance sessions exist for the batch. |
| Inputs | `enrollmentId`, optional date range, optional calculation mode, course completion rule. |
| Processing Steps | 1. Load enrollment and validate branch access. 2. Identify eligible sessions for the enrollment’s batch where session date is within enrollment active period and attendance session status is `Submitted` or `Corrected`. 3. Exclude cancelled sessions and soft-deleted attendance sessions. 4. Count denominator as eligible submitted attendance sessions. 5. Count numerator according to configured rules: `Present = 1`, `Late = 1` unless late policy marks severe late as partial or absent, `Excused = 0` by default unless configured to exclude from denominator, `Absent = 0`. 6. If denominator is zero, return `NotAvailable` rather than 0%. 7. Calculate percentage as `(attendanceCredit / denominator) * 100`, rounded to two decimal places. 8. Return detailed breakdown by status. |
| Outputs & Postconditions | Attendance summary is available for completion evaluation and reports. No attendance record is mutated by calculation. |
| Priority | Must |

---

### FR-M08-ATT-012 – Low Attendance Detection

| Field | Specification |
|---|---|
| Description | The system shall identify enrollments below course or batch attendance threshold. |
| Actors | Academic Coordinator, Trainer, Branch Manager, Reporting Module, Communication Module. |
| Preconditions | Submitted attendance exists; completion rule or attendance threshold is configured. |
| Inputs | Batch ID, course ID, branch ID, date range, threshold percentage. |
| Processing Steps | 1. Resolve threshold from CourseCompletionRule `minAttendancePercentage`; if batch-specific override exists, use override. 2. Calculate attendance percentage for each active enrollment. 3. Compare calculated percentage against threshold. 4. Flag enrollments where percentage is below threshold or projected risk is high based on remaining sessions. 5. Expose result in dashboard and optionally raise notification request. |
| Outputs & Postconditions | Low-attendance list is available by branch, batch, course, trainer, and student. |
| Priority | Should |

---

### FR-M08-ATT-013 – Pending Attendance Monitoring

| Field | Specification |
|---|---|
| Description | The system shall show sessions where attendance is not submitted by expected deadline. |
| Actors | Academic Coordinator, Branch Manager, Trainer. |
| Preconditions | Sessions exist in past or current operating day; user has read permission. |
| Inputs | Branch, date range, trainer, course, batch, pending threshold hours. |
| Processing Steps | 1. Find sessions whose scheduled end time is earlier than current Oman time minus configured grace period. 2. Exclude cancelled sessions. 3. Join attendance session. 4. Mark pending when no attendance session exists or status is `Draft`. 5. Group pending records by trainer, batch, course, and branch. 6. Return priority ordering by oldest pending session first. |
| Outputs & Postconditions | Pending attendance dashboard identifies operational follow-up items. |
| Priority | Must |

---

### FR-M08-ATT-014 – Attendance Reports and Exports

| Field | Specification |
|---|---|
| Description | The system shall provide branch-scoped attendance reports and exports. |
| Actors | Academic Coordinator, Branch Manager, Registrar, Auditor, Finance Officer read-only, Certificate Officer read-only. |
| Preconditions | User has `attendance.record.read`; export requires `attendance.record.export`; filters are within allowed branch scope. |
| Inputs | Report type, branch, date range, course, batch, trainer, student, enrollment, corporate account, status filter, output format. |
| Processing Steps | 1. Validate report access and branch scope. 2. Build query using allowed branch IDs only. 3. Apply filters. 4. Mask sensitive identifiers not required for the report. 5. Render report in UI or export file. 6. For export, write audit log with filters, output type, record count, and actor. |
| Outputs & Postconditions | Report is displayed or exported. Export action is audited. |
| Priority | Must |

---

### FR-M08-ATT-015 – Corporate Attendance Reporting

| Field | Specification |
|---|---|
| Description | The system shall generate attendance reports for corporate participants linked through corporate enrollment. |
| Actors | Academic Coordinator, Branch Manager, Corporate Coordinator future portal, Finance Officer read-only. |
| Preconditions | Corporate participant has enrollment; user has attendance report permission and corporate report permission if required. |
| Inputs | Corporate account ID, contract ID optional, course ID, batch ID, date range, participant status. |
| Processing Steps | 1. Validate branch and corporate data access. 2. Resolve corporate participants through `CorporateEnrollment` and `Enrollment`. 3. Fetch submitted/corrected attendance records only. 4. Calculate per-participant and aggregate attendance. 5. Include corporate employee code, department, designation only if available and permitted. 6. Export or display report. 7. Audit export and external sharing action. |
| Outputs & Postconditions | Corporate attendance evidence is available for account reporting and billing support. |
| Priority | Should |

---

### FR-M08-ATT-016 – Completion Evidence API

| Field | Specification |
|---|---|
| Description | The module shall expose attendance evidence to Exam, Result & Completion Management. |
| Actors | Completion Module, Academic Coordinator, Branch Manager. |
| Preconditions | Enrollment exists; completion module has internal access contract; attendance records are submitted or corrected. |
| Inputs | `enrollmentId`, optional `courseCompletionRuleId`, request context. |
| Processing Steps | 1. Validate internal module caller or user permission. 2. Resolve enrollment and branch. 3. Calculate attendance percentage using FR-M08-ATT-011. 4. Return status counts, denominator, percentage, threshold, pass/fail indicator, and latest calculation timestamp. 5. Do not approve completion from Attendance module. |
| Outputs & Postconditions | Completion module receives evidence required for completion rule evaluation. |
| Priority | Must |

---

### FR-M08-ATT-017 – Attendance Audit Logging

| Field | Specification |
|---|---|
| Description | The system shall audit sensitive attendance actions. |
| Actors | All authenticated attendance users, Audit & Compliance Module. |
| Preconditions | Auditable action occurs. |
| Inputs | Entity type, entity ID, action, old value, new value, performed by, branch ID, IP address, user agent, reason. |
| Processing Steps | 1. Identify if action is auditable. 2. Capture old/new value snapshots for changes. 3. Persist audit log transactionally for critical mutations. 4. Include reason for correction, deletion, restore, approval, rejection, and export. 5. Prevent application-layer modification of audit entries. |
| Outputs & Postconditions | Audit trail is available for compliance review. |
| Priority | Must |

---

### FR-M08-ATT-018 – Soft Delete and Restore Controls

| Field | Specification |
|---|---|
| Description | Authorized users shall soft-delete or restore attendance sessions/records only with reason and audit trail. |
| Actors | Branch Manager, System Administrator, Auditor read-only. |
| Preconditions | User has `attendance.admin.softDelete` or `attendance.admin.restore`; record exists; branch scope is valid. |
| Inputs | Entity ID, entity type, reason code, reason notes, version. |
| Processing Steps | 1. Validate permission and branch scope. 2. Reject deletion of submitted attendance if completion or certificate has already consumed it unless override workflow is approved. 3. Set `isDeleted = true`, `deletedAt`, `deletedBy`, `deleteReason`. 4. Restore only when related session, batch, and enrollment remain valid. 5. Audit delete or restore action. |
| Outputs & Postconditions | Record is excluded from operational calculations when deleted. Restore reactivates it if valid. |
| Priority | Should |

---

### FR-M08-ATT-019 – Bilingual Attendance Labels

| Field | Specification |
|---|---|
| Description | Attendance statuses, correction reasons, exception reasons, and report headings shall support English and Arabic labels. |
| Actors | System Administrator, Configuration Admin, All Users. |
| Preconditions | Lookup values exist in Configuration/Master Data. |
| Inputs | Lookup type, code, label English, label Arabic, active flag, sort order. |
| Processing Steps | 1. Load status/reason labels from configuration. 2. Use user preferred language for UI display. 3. Fall back to English if Arabic label is missing. 4. Store canonical status code in attendance tables, not translated text. 5. Apply same labels in exports where language is selected. |
| Outputs & Postconditions | UI and reports display localized labels while data remains canonical. |
| Priority | Should |

---

### FR-M08-ATT-020 – Attendance Exception Handling

| Field | Specification |
|---|---|
| Description | The system shall detect and display attendance exceptions that require operational resolution. |
| Actors | Academic Coordinator, Branch Manager, Registrar, Trainer. |
| Preconditions | Attendance session or roster operation is requested. |
| Inputs | Session ID, batch ID, enrollment list, attendance session status. |
| Processing Steps | 1. Detect missing active enrollment roster. 2. Detect duplicate active attendance session for same session/date. 3. Detect attendance for cancelled session. 4. Detect attendance record linked to enrollment no longer in batch for session date. 5. Detect trainer not assigned to session. 6. Classify exceptions as blocking or warning. 7. Display actionable resolution message and required permission. 8. Audit blocking exception override if override is permitted and used. |
| Outputs & Postconditions | Users receive clear operational error messages; invalid data is not silently accepted. |
| Priority | Should |

---

## 4. Comprehensive Business Rules

| Rule ID | Rule Category | Business Rule | Validation / Enforcement |
|---|---|---|---|
| BR-M08-ATT-001 | Enrollment Linkage | Attendance can be recorded only for a valid `Enrollment`. | Reject attendance records without `enrollmentId`. |
| BR-M08-ATT-002 | Student Linkage | Attendance record must reference the same `StudentProfile` linked to the enrollment. | Validate `AttendanceRecord.studentProfileId = Enrollment.studentProfileId`. |
| BR-M08-ATT-003 | Course and Batch | Attendance is valid only when enrollment has mandatory `courseId` and `batchId`. | Reject orphan attendance. |
| BR-M08-ATT-004 | Batch Match | Attendance record enrollment must belong to the attendance session’s batch. | Validate `Enrollment.batchId = AttendanceSession.batchId`. |
| BR-M08-ATT-005 | Branch Match | Attendance session branch must match enrollment branch and batch branch. | Validate server-side branch relationship. |
| BR-M08-ATT-006 | Branch Access | Users can access attendance only for assigned branches unless consolidated permission is granted. | IAM branch scope middleware and repository filters. |
| BR-M08-ATT-007 | Trainer Restriction | Trainer can mark only assigned session/batch attendance unless elevated permission exists. | Validate against `Session.trainerId` and `BatchTrainer`. |
| BR-M08-ATT-008 | Session Uniqueness | Only one active attendance session may exist for one session/date/batch. | Unique active constraint on `sessionId + attendanceDate + batchId` where `isDeleted = false`. |
| BR-M08-ATT-009 | Record Uniqueness | Only one active attendance record may exist for one attendance session and enrollment. | Unique active constraint on `attendanceSessionId + enrollmentId` where `isDeleted = false`. |
| BR-M08-ATT-010 | Allowed Statuses | Valid attendance statuses are `Present`, `Absent`, `Late`, `Excused`. | Configurable lookup, canonical codes enforced. |
| BR-M08-ATT-011 | Late Minutes Required | `Late` status requires `lateMinutes`. | Reject if null, zero, negative, or greater than session duration. |
| BR-M08-ATT-012 | Excuse Reason Required | `Excused` status requires `excuseReasonCode`. | Reject missing reason. |
| BR-M08-ATT-013 | Present Field Cleanup | `Present` status must not keep late minutes or excuse reason. | Clear incompatible fields during save. |
| BR-M08-ATT-014 | Absent Field Cleanup | `Absent` status must not keep late minutes or excuse reason unless absence reason feature is configured. | Clear incompatible fields. |
| BR-M08-ATT-015 | Draft Not Final | Draft attendance must not be consumed by completion or certificate eligibility. | Completion evidence API uses submitted/corrected only. |
| BR-M08-ATT-016 | Submission Completeness | Final submission requires every required roster student to have a valid attendance status. | Validate against regenerated roster. |
| BR-M08-ATT-017 | Submitted Lock | Submitted attendance cannot be directly edited. | Require correction workflow. |
| BR-M08-ATT-018 | Correction Reason | Every correction request must include reason code and notes. | Reject incomplete request. |
| BR-M08-ATT-019 | Correction Old Value Match | Correction old value must match current attendance record when requested and approved. | Prevent stale correction application. |
| BR-M08-ATT-020 | Correction Deadline | Corrections must be requested within configured deadline, default 7 calendar days after submission. | Reject unless override permission exists. |
| BR-M08-ATT-021 | Segregation of Duties | A correction requester should not approve the same correction unless explicit override permission exists. | Reviewer validation. |
| BR-M08-ATT-022 | Correction State Transition | Correction transitions allowed: `PendingReview → Approved`, `PendingReview → Rejected`, `PendingReview → Cancelled`. | Reject invalid state transition. |
| BR-M08-ATT-023 | Session State Transition | Attendance session transitions allowed: `Draft → Submitted`, `Submitted → CorrectionPending`, `CorrectionPending → Corrected`, `CorrectionPending → Submitted`, `Draft → Cancelled`. | State machine enforcement. |
| BR-M08-ATT-024 | Cancelled Session | Attendance cannot be submitted for cancelled training sessions. | Validate session status. |
| BR-M08-ATT-025 | Future Session | Attendance cannot be submitted before session end time unless override permission exists. | Compare with Oman current time. |
| BR-M08-ATT-026 | Holiday Session | If Scheduling marks a session invalid due to holiday conflict, attendance cannot be submitted until scheduling exception is resolved. | Validate schedule conflict status. |
| BR-M08-ATT-027 | Soft Delete Only | Attendance sessions, records, and corrections must not be hard-deleted. | Use `isDeleted`, `deletedAt`, `deletedBy`. |
| BR-M08-ATT-028 | Delete Impact | Submitted attendance consumed by completion/certificate cannot be soft-deleted without approved administrative reason. | Validate downstream consumption. |
| BR-M08-ATT-029 | Audit Mandatory | Submit, correction, approval, rejection, delete, restore, export, and config changes must be audited. | Transactional audit logging. |
| BR-M08-ATT-030 | Export Authorization | Export requires explicit export permission in addition to read permission. | Permission check. |
| BR-M08-ATT-031 | Privacy | Civil ID, passport, visa, and payment data must not appear in normal attendance reports. | Report field whitelist. |
| BR-M08-ATT-032 | Timezone | Operational attendance dates use Oman timezone UTC+4. | Convert timestamps consistently. |
| BR-M08-ATT-033 | Percentage Denominator | Attendance percentage denominator includes only submitted/corrected eligible sessions. | Calculation algorithm. |
| BR-M08-ATT-034 | No Submitted Sessions | If no submitted sessions exist, attendance percentage is `NotAvailable`, not 0%. | Calculation output. |
| BR-M08-ATT-035 | Late Credit | `Late` counts as attended by default unless policy changes. | Configurable calculation policy. |
| BR-M08-ATT-036 | Excused Default | `Excused` counts as non-attended by default unless policy excludes it from denominator. | Configurable calculation policy. |
| BR-M08-ATT-037 | Completion Boundary | Attendance module does not approve course completion. | Completion module owns approval. |
| BR-M08-ATT-038 | Certificate Boundary | Attendance module does not issue certificates. | Certificate module consumes completion result. |
| BR-M08-ATT-039 | Corporate Boundary | Corporate attendance report must derive participants through Enrollment and CorporateEnrollment. | No duplicate corporate attendance lifecycle. |
| BR-M08-ATT-040 | Optimistic Locking | Attendance session and record updates must validate `version`. | Reject stale updates with conflict response. |
| BR-M08-ATT-041 | Active Enrollment Window | Enrollment must be active for the session date. | Validate confirmed/completed dates and transfer/dropped/cancelled dates. |
| BR-M08-ATT-042 | Roster Regeneration | Final submit must regenerate roster server-side and not trust client-only roster. | Server validation. |
| BR-M08-ATT-043 | Consolidated Reporting | Consolidated attendance report requires both permission and branch access flag. | IAM validation. |
| BR-M08-ATT-044 | Immutable Notes | Correction review notes and audit entries cannot be modified after submission. | Append-only storage. |
| BR-M08-ATT-045 | Localized Display | Canonical codes are stored; localized labels are display-only. | Configuration lookup. |
| BR-M08-ATT-046 | Attendance Date Bounds | Attendance date must be within batch start and end dates unless authorized exception exists. | Validate against Batch dates. |
| BR-M08-ATT-047 | Class Duration Bounds | Late minutes cannot exceed session duration in minutes. | Calculate from start/end time. |
| BR-M08-ATT-048 | Deleted Records Exclusion | Soft-deleted attendance records are excluded from calculations and reports by default. | Repository filter. |
| BR-M08-ATT-049 | Audit Branch Context | Every audit entry for attendance must include branch context when available. | Audit payload validation. |
| BR-M08-ATT-050 | No Biometric Ownership | Future biometric logs cannot directly overwrite attendance records without controlled import/correction workflow. | Future integration boundary. |

---

## 5. Cross-Module Dependencies Mapping

| Source / Target Module | Dependency Type | Attendance Management Responsibility | Other Module Responsibility |
|---|---|---|---|
| Identity & Access Management | Upstream security dependency | Request permission and branch access validation for every action. | Own users, roles, permissions, and branch access. |
| Organization Management | Upstream structure dependency | Use branch, department, and classroom relationships for filtering/reporting. | Own institute, branch, department, classroom master data. |
| Configuration / Master Data | Upstream configuration dependency | Consume attendance statuses, reason codes, thresholds, localized labels, and correction deadline settings. | Own lookup values and numbering/configuration where applicable. |
| Admission & Enrollment Management | Upstream learner lifecycle dependency | Generate roster from valid enrollments and update no enrollment state directly. | Own admission, student profile, enrollment status, course and batch assignment. |
| Course Catalog Management | Upstream rule dependency | Consume `CourseCompletionRule.minAttendancePercentage` and attendance policy references. | Own course, pricing, discount, and completion rule definitions. |
| Training Delivery Management | Upstream delivery dependency | Consume batch, session, trainer assignment, and waiting list data for roster and session validation. | Own batch lifecycle, sessions, capacity, waiting list, and trainer assignment to batch. |
| Scheduling, Calendar & Holiday Management | Upstream schedule dependency | Validate scheduled sessions and avoid marking invalid/cancelled sessions. | Own timetable, venue block, holiday conflict, and schedule status. |
| Faculty / Trainer Management | Upstream actor dependency | Validate trainer profile and trainer eligibility to mark assigned session attendance. | Own trainer profile, qualification, availability, authorization, and status. |
| Corporate Training Management | Upstream/reporting dependency | Report corporate participant attendance through linked enrollments. | Own corporate account, participant, contract, and corporate enrollment linkage. |
| Finance & Receivables Management | Downstream consumer | Provide attendance reports as supporting evidence only. | Own invoice, payment, receipt, receivable, refund, and billing rules. |
| Exam, Result & Completion Management | Downstream consumer | Provide attendance percentage, status counts, and evidence. | Own completion evaluation, approval workflow, and completion status. |
| Certificate Management | Indirect downstream consumer | Provide attendance evidence only through completion context. | Own certificate generation, verification, reissue, and revocation. |
| Communication & Notification Management | Downstream notification dependency | Raise low-attendance, pending-attendance, or correction notification requests where configured. | Own templates, channels, delivery status, and notification logs. |
| Reporting & Executive Dashboards | Downstream analytics dependency | Provide attendance datasets, KPIs, and branch-scoped facts. | Own dashboards, widgets, metric snapshots, and report presentation. |
| Audit & Compliance | Cross-cutting dependency | Emit audit actions and correction history. | Own audit log persistence, approval history, and compliance review screens. |
| Document Management | Optional evidence dependency | Reference evidence documents for excused absence or correction if configured. | Own document upload, verification, and expiry. |
| Biometric Attendance Integration Future | Future upstream input dependency | Remain source of truth for final attendance records. | Provide raw biometric logs and mapping in future phase only. |
| HRMS / Payroll Future | Out of scope | Do not manage staff payroll attendance. | Future HRMS/Payroll owns employee attendance and payroll processing. |

---

## 6. State Models

### 6.1 Attendance Session Statuses

| Status | Meaning | Allowed Next Statuses |
|---|---|---|
| NotInitialized | No attendance session exists yet for scheduled training session. | Draft |
| Draft | Attendance session exists and records may be incomplete. | Submitted, Cancelled |
| Submitted | Final attendance has been submitted and locked. | CorrectionPending |
| CorrectionPending | One or more correction requests are pending review. | Corrected, Submitted |
| Corrected | At least one approved correction has been applied. | CorrectionPending |
| Cancelled | Attendance session was cancelled due to valid operational reason. | None, except restore to Draft by explicit admin restore if allowed |

### 6.2 Attendance Correction Statuses

| Status | Meaning | Allowed Next Statuses |
|---|---|---|
| PendingReview | Correction request is awaiting authorized review. | Approved, Rejected, Cancelled |
| Approved | Correction was approved and applied to attendance record. | None |
| Rejected | Correction was rejected and original attendance record remains unchanged. | None |
| Cancelled | Requester or authorized admin cancelled pending correction before review. | None |

---

## 7. Core Data Contracts for Part 1 Scope

### 7.1 AttendanceSession Required Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/CUID | Yes | Primary identifier. |
| sessionId | UUID/CUID | Yes | FK to Training Delivery Session. |
| batchId | UUID/CUID | Yes | FK to Batch. |
| branchId | UUID/CUID | Yes | Server-derived from batch/session. |
| attendanceDate | Date | Yes | Operational date in Oman timezone. |
| markedByTrainerId | UUID/CUID | Conditional | Required when trainer marks session. |
| status | Enum | Yes | Draft, Submitted, CorrectionPending, Corrected, Cancelled. |
| submittedAt | DateTime | Conditional | Required when submitted. |
| submittedBy | UUID/CUID | Conditional | Required when submitted. |
| remarks | Text | No | Session-level remarks. |
| isDeleted | Boolean | Yes | Default false. |
| deletedAt | DateTime | No | Soft delete timestamp. |
| deletedBy | UUID/CUID | No | Soft delete actor. |
| createdAt | DateTime | Yes | Audit base field. |
| createdBy | UUID/CUID | Yes | Audit base field. |
| updatedAt | DateTime | Yes | Audit base field. |
| updatedBy | UUID/CUID | Yes | Audit base field. |
| version | Integer | Yes | Optimistic locking. |

### 7.2 AttendanceRecord Required Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/CUID | Yes | Primary identifier. |
| attendanceSessionId | UUID/CUID | Yes | FK to AttendanceSession. |
| enrollmentId | UUID/CUID | Yes | FK to Enrollment. |
| studentProfileId | UUID/CUID | Yes | FK to StudentProfile. |
| status | Enum | Yes | Present, Absent, Late, Excused. |
| lateMinutes | Integer | Conditional | Required for Late. |
| excuseReasonCode | String | Conditional | Required for Excused. |
| remarks | Text | No | Record-level remarks. |
| markedAt | DateTime | Yes | Time of latest mark. |
| markedBy | UUID/CUID | Yes | User who marked. |
| isDeleted | Boolean | Yes | Default false. |
| deletedAt | DateTime | No | Soft delete timestamp. |
| deletedBy | UUID/CUID | No | Soft delete actor. |
| createdAt | DateTime | Yes | Audit base field. |
| createdBy | UUID/CUID | Yes | Audit base field. |
| updatedAt | DateTime | Yes | Audit base field. |
| updatedBy | UUID/CUID | Yes | Audit base field. |
| version | Integer | Yes | Optimistic locking. |

### 7.3 AttendanceCorrection Required Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/CUID | Yes | Primary identifier. |
| attendanceRecordId | UUID/CUID | Yes | FK to AttendanceRecord. |
| oldStatus | Enum | Yes | Current value at request time. |
| newStatus | Enum | Yes | Requested value. |
| oldLateMinutes | Integer | No | Old late value where applicable. |
| newLateMinutes | Integer | No | New late value where applicable. |
| oldExcuseReasonCode | String | No | Old excuse reason where applicable. |
| newExcuseReasonCode | String | No | New excuse reason where applicable. |
| reasonCode | String | Yes | Configured correction reason. |
| reasonNotes | Text | Yes | Human explanation. |
| requestedBy | UUID/CUID | Yes | Requester user. |
| requestedAt | DateTime | Yes | Request timestamp. |
| approvedBy | UUID/CUID | Conditional | Required if approved/rejected by reviewer. |
| approvedAt | DateTime | Conditional | Required if approved/rejected. |
| reviewerRemarks | Text | Conditional | Required for rejection; optional for approval. |
| status | Enum | Yes | PendingReview, Approved, Rejected, Cancelled. |
| isDeleted | Boolean | Yes | Default false. |
| createdAt | DateTime | Yes | Audit base field. |
| createdBy | UUID/CUID | Yes | Audit base field. |
| updatedAt | DateTime | Yes | Audit base field. |
| updatedBy | UUID/CUID | Yes | Audit base field. |
| version | Integer | Yes | Optimistic locking. |

---

## 8. API Boundary Summary for Part 1

| API Contract | Method | Purpose | Permission |
|---|---|---|---|
| `/attendance/sessions` | GET | List attendance sessions with filters. | attendance.session.read |
| `/attendance/sessions/init` | POST | Initialize attendance session. | attendance.session.create |
| `/attendance/sessions/{id}/roster` | GET | Load attendance roster. | attendance.record.read |
| `/attendance/sessions/{id}/draft` | PUT | Save draft attendance records. | attendance.record.mark |
| `/attendance/sessions/{id}/submit` | POST | Submit final attendance. | attendance.session.submit |
| `/attendance/records/{id}` | GET | View attendance record detail. | attendance.record.read |
| `/attendance/corrections` | POST | Request correction. | attendance.correction.request |
| `/attendance/corrections` | GET | List correction requests. | attendance.correction.review |
| `/attendance/corrections/{id}/approve` | POST | Approve correction. | attendance.correction.approve |
| `/attendance/corrections/{id}/reject` | POST | Reject correction. | attendance.correction.reject |
| `/attendance/enrollments/{enrollmentId}/summary` | GET | Get attendance summary for enrollment. | attendance.record.read or internal completion access |
| `/attendance/reports/batch-register` | GET | Batch attendance register. | attendance.record.read |
| `/attendance/reports/export` | POST | Export attendance report. | attendance.record.export |

---

## 9. Acceptance Boundary for This Part

This Part 1 FRD is accepted when the implementation and review teams can confirm the following:

1. All attendance requirements are tied to Enrollment, Batch, Session, Branch, and StudentProfile.
2. The module does not duplicate learner lifecycle logic.
3. Attendance is manually marked in Phase 1.
4. Submitted attendance is immutable except through correction workflow.
5. Attendance calculations use only submitted or corrected sessions.
6. Branch scoping is enforced server-side on every query and mutation.
7. Soft deletes and audit logs are mandatory for sensitive actions.
8. Completion and Certificate boundaries are respected.
9. Corporate participant attendance is reported through enrollment linkage.
10. Bilingual display labels are supported without storing translated status values as business codes.
