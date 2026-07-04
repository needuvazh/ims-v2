# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 08 – Attendance Management

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | `M08-ATT` |
| Validation Strategy | UI validation + Zod boundary validation + domain service validation + database constraints |
| Notification Strategy | Attendance creates notification requests; Communication context owns delivery |
| Timezone | Oman GST UTC+4 for business rendering; UTC for persisted timestamps |

---

## 1. Validation Architecture

| Layer | Responsibility |
|---|---|
| UI | Immediate required-field warnings, disabled actions, bilingual labels, RTL/LTR rendering, optimistic row validation. |
| Zod Boundary | Payload shape, enum values, UUID format, date/time regex, length, numeric ranges, cross-field checks. |
| Domain Service | Permission, branch scope, trainer/student scope, state transition, enrollment eligibility, summary calculation, alert rule resolution. |
| Database | Foreign keys, unique constraints, check constraints, soft-delete filters, optimistic locking version. |

All validation failures must produce stable `ERR_ATT_*` codes. Error copy must be translatable to English and Arabic.

---

## 2. Shared Field Validations

| Field | Type | Validation | Error Code |
|---|---|---|---|
| `id` | UUID | Required valid UUID. | `ERR_ATT_INVALID_UUID` |
| `attendanceSessionId` | UUID | Existing undeleted attendance session. | `ERR_ATT_SESSION_NOT_FOUND` |
| `attendanceRecordId` | UUID | Existing undeleted attendance record. | `ERR_ATT_RECORD_NOT_FOUND` |
| `correctionId` | UUID | Existing undeleted correction request. | `ERR_ATT_CORRECTION_NOT_FOUND` |
| `branchId` | UUID | Must be in authenticated user's branch scope. | `ERR_ATT_BRANCH_SCOPE_DENIED` |
| `batchId` | UUID | Existing batch in allowed branch. | `ERR_ATT_BATCH_NOT_FOUND` |
| `enrollmentId` | UUID | Existing enrollment in allowed branch or student self-scope. | `ERR_ATT_ENROLLMENT_NOT_FOUND` |
| `attendanceDate` | Date | `YYYY-MM-DD`; must match source session date unless override permission exists. | `ERR_ATT_INVALID_ATTENDANCE_DATE` |
| `arrivalTime` | Time | `HH:mm`; required for `LATE`; must be within valid session time window. | `ERR_ATT_INVALID_ARRIVAL_TIME` |
| `reason` | String | Trimmed, 10–1000 characters for sensitive actions. | `ERR_ATT_REASON_REQUIRED` |
| `remarks` | String | Trimmed, max 500 for records, max 1000 for session notes. | `ERR_ATT_REMARKS_TOO_LONG` |
| `thresholdPercentage` | Decimal | 1.00–100.00. | `ERR_ATT_INVALID_THRESHOLD` |
| `effectiveStartDate` | Date | Required for alert rules. | `ERR_ATT_INVALID_EFFECTIVE_DATE` |
| `effectiveEndDate` | Date | Optional; must be on/after start date. | `ERR_ATT_INVALID_EFFECTIVE_DATE_RANGE` |
| `expectedVersion` | Integer | Required for editable records and must match current version. | `ERR_ATT_CONCURRENT_MODIFICATION` |

```ts
export const M08UuidSchema = z.string().uuid({ message: 'ERR_ATT_INVALID_UUID' });
export const M08DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ERR_ATT_INVALID_DATE');
export const M08TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ERR_ATT_INVALID_TIME');
export const M08ReasonSchema = z.string().trim().min(10, 'ERR_ATT_REASON_REQUIRED').max(1000, 'ERR_ATT_REASON_TOO_LONG');
```

---

## 3. Business Validation Rules

### 3.1 Attendance Session Creation

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-001 | Source `Session` must exist and not be soft deleted. | `ERR_ATT_SOURCE_SESSION_NOT_FOUND` |
| VAL-M08-002 | Source `Session.status` must not be `CANCELLED`. | `ERR_ATT_SOURCE_SESSION_CANCELLED` |
| VAL-M08-003 | Source session must resolve to one valid `Batch`, `Course`, and `Branch`. | `ERR_ATT_SOURCE_SESSION_INCOMPLETE` |
| VAL-M08-004 | User must have branch access to source session branch. | `ERR_ATT_BRANCH_SCOPE_DENIED` |
| VAL-M08-005 | Only one undeleted attendance session may exist per source `sessionId`. | `ERR_ATT_SESSION_ALREADY_EXISTS` |
| VAL-M08-006 | Attendance date must equal source session date unless `attendance.session.overrideDate` is granted. | `ERR_ATT_INVALID_ATTENDANCE_DATE` |
| VAL-M08-007 | Roster initialization must include only active enrollments in the same batch. | `ERR_ATT_INVALID_ROSTER_ENROLLMENT` |
| VAL-M08-008 | Eligible enrollment statuses for roster are `CONFIRMED`, `ACTIVE`, and `COMPLETED`. | `ERR_ATT_INVALID_ROSTER_ENROLLMENT` |
| VAL-M08-009 | Cancelled, dropped, transferred-out, and soft-deleted enrollments are excluded. | `ERR_ATT_INVALID_ROSTER_ENROLLMENT` |
| VAL-M08-010 | Trainer-created attendance must be for assigned session or active assigned batch. | `ERR_ATT_TRAINER_NOT_ASSIGNED_TO_SESSION` |

### 3.2 Attendance Marking

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-011 | Parent session must be `DRAFT` or `RETURNED_FOR_CORRECTION`. | `ERR_ATT_SESSION_NOT_EDITABLE` |
| VAL-M08-012 | Record must belong to the path attendance session. | `ERR_ATT_RECORD_SESSION_MISMATCH` |
| VAL-M08-013 | Payload cannot include duplicate record IDs. | `ERR_ATT_DUPLICATE_RECORD_IN_PAYLOAD` |
| VAL-M08-014 | `LATE` requires `arrivalTime`. | `ERR_ATT_LATE_TIME_REQUIRED` |
| VAL-M08-015 | `EXCUSED` requires an excuse reason code or configured reason. | `ERR_ATT_EXCUSE_REASON_REQUIRED` |
| VAL-M08-016 | Arrival time earlier than session start requires override permission. | `ERR_ATT_INVALID_ARRIVAL_TIME` |
| VAL-M08-017 | Arrival time after session end requires administrative override. | `ERR_ATT_INVALID_ARRIVAL_TIME` |
| VAL-M08-018 | Expected version must match current record version. | `ERR_ATT_CONCURRENT_MODIFICATION` |
| VAL-M08-019 | Trainer can mark only assigned sessions. | `ERR_ATT_TRAINER_NOT_ASSIGNED_TO_SESSION` |
| VAL-M08-020 | Student and corporate users cannot mark attendance. | `ERR_ATT_PERMISSION_DENIED` |

### 3.3 Submission, Approval, Locking

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-021 | Submission allowed only from `DRAFT` or `RETURNED_FOR_CORRECTION`. | `ERR_ATT_SESSION_NOT_SUBMITTABLE` |
| VAL-M08-022 | Submission requires at least one roster record. | `ERR_ATT_SESSION_EMPTY_ROSTER` |
| VAL-M08-023 | `NOT_MARKED` rows block submission unless override permission and reason exist. | `ERR_ATT_UNMARKED_RECORDS_EXIST` |
| VAL-M08-024 | Approval allowed only from `SUBMITTED`. | `ERR_ATT_SESSION_NOT_APPROVABLE` |
| VAL-M08-025 | Return allowed only from `SUBMITTED`. | `ERR_ATT_SESSION_NOT_RETURNABLE` |
| VAL-M08-026 | Cancelled sessions are excluded from summary denominator. | `ERR_ATT_SESSION_NOT_CANCELLABLE` |
| VAL-M08-027 | Locking requires official status and no pending corrections. | `ERR_ATT_SESSION_NOT_LOCKABLE` |
| VAL-M08-028 | Unlocking requires `LOCKED` status, high privilege, and reason. | `ERR_ATT_SESSION_NOT_LOCKED` |

### 3.4 Correction Workflow

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-029 | Corrections can be created only for `SUBMITTED`, `APPROVED`, `CORRECTION_PENDING`, or `CORRECTED` sessions. | `ERR_ATT_CORRECTION_NOT_ALLOWED_FOR_STATUS` |
| VAL-M08-030 | Corrections are blocked for `DRAFT`, `RETURNED_FOR_CORRECTION`, `CANCELLED`, and `LOCKED` sessions. | `ERR_ATT_CORRECTION_NOT_ALLOWED_FOR_STATUS` |
| VAL-M08-031 | New status must differ from current official status. | `ERR_ATT_CORRECTION_NO_STATUS_CHANGE` |
| VAL-M08-032 | Only one unresolved correction may exist for a record. | `ERR_ATT_CORRECTION_PENDING_EXISTS` |
| VAL-M08-033 | Correction reason must be 10–1000 characters. | `ERR_ATT_REASON_REQUIRED` |
| VAL-M08-034 | Correction to `LATE` requires arrival time. | `ERR_ATT_LATE_TIME_REQUIRED` |
| VAL-M08-035 | Correction to `EXCUSED` requires reason and supporting document when branch policy requires it. | `ERR_ATT_EXCUSE_REASON_REQUIRED` |
| VAL-M08-036 | Requester cannot approve own correction unless `attendance.correction.selfApprove` exists. | `ERR_ATT_SELF_APPROVAL_BLOCKED` |
| VAL-M08-037 | Approval must update official record, recalculate summary, evaluate alerts, and audit in one transaction. | `ERR_ATT_CORRECTION_APPLY_FAILED` |

### 3.5 Summary Calculation

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-038 | Include only sessions with status `SUBMITTED`, `APPROVED`, `CORRECTED`, or `LOCKED`. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-039 | Exclude `CANCELLED`, `DRAFT`, and `RETURNED_FOR_CORRECTION` sessions. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-040 | `PRESENT` and `LATE` count as attended by default. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-041 | `ABSENT` does not count as attended. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-042 | `EXCUSED` does not count as attended for certificate eligibility by default. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-043 | Percentage is rounded to two decimals. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-044 | If denominator is zero, percentage is `0.00` and status is `NO_ATTENDANCE`. | `ERR_ATT_SUMMARY_CALCULATION_FAILED` |
| VAL-M08-045 | Attendance must not directly update Enrollment completion or certificate status. | `ERR_ATT_CONTEXT_OWNERSHIP_VIOLATION` |

### 3.6 Alert Rules and Detection

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-046 | Threshold must be between 1 and 100. | `ERR_ATT_INVALID_THRESHOLD` |
| VAL-M08-047 | Effective end date must be null or on/after start date. | `ERR_ATT_INVALID_EFFECTIVE_DATE_RANGE` |
| VAL-M08-048 | Active rules cannot overlap at same specificity and date range. | `ERR_ATT_ALERT_RULE_OVERLAP` |
| VAL-M08-049 | Rule priority is batch > course > branch > global. | `ERR_ATT_ALERT_RULE_PRIORITY_INVALID` |
| VAL-M08-050 | Global rule management requires `attendance.config.global.manage`. | `ERR_ATT_GLOBAL_RULE_SCOPE_DENIED` |
| VAL-M08-051 | Alert detection requires branch, course, batch, or enrollment scope. | `ERR_ATT_ALERT_SCOPE_REQUIRED` |
| VAL-M08-052 | Detection scope must be within user branch access. | `ERR_ATT_BRANCH_SCOPE_DENIED` |
| VAL-M08-053 | Duplicate open alert for the same rule and enrollment is blocked. | `ERR_ATT_ALERT_DUPLICATE_OPEN` |
| VAL-M08-054 | Acknowledgement requires action taken text. | `ERR_ATT_ALERT_ACTION_REQUIRED` |

### 3.7 Audit and Soft Delete

| Rule ID | Rule | Failure Code |
|---|---|---|
| VAL-M08-055 | Application services must not hard delete attendance data. | `ERR_ATT_HARD_DELETE_NOT_ALLOWED` |
| VAL-M08-056 | Soft delete requires permission, reason, `deletedAt`, `deletedBy`, and audit. | `ERR_ATT_REASON_REQUIRED` |
| VAL-M08-057 | Official submitted attendance records cannot be soft deleted; use cancellation/correction. | `ERR_ATT_OFFICIAL_RECORD_DELETE_BLOCKED` |
| VAL-M08-058 | Sensitive actions must write audit records with old and new values. | `ERR_ATT_AUDIT_WRITE_FAILED` |
| VAL-M08-059 | Audit failure must fail the sensitive mutation transaction. | `ERR_ATT_AUDIT_WRITE_FAILED` |

---

## 4. Calculation Rules

### 4.1 Attendance Percentage

```text
eligibleRecords =
  record.enrollmentId = target enrollment
  AND record.isDeleted = false
  AND attendanceSession.isDeleted = false
  AND attendanceSession.status IN (SUBMITTED, APPROVED, CORRECTED, LOCKED)
  AND attendanceSession.status != CANCELLED

totalCountedSessions = count(eligibleRecords)
presentCount = count(status = PRESENT)
lateCount = count(status = LATE)
absentCount = count(status = ABSENT)
excusedCount = count(status = EXCUSED)
attendedSessions = presentCount + lateCount
attendancePercentage = 0.00 when totalCountedSessions = 0
attendancePercentage = round((attendedSessions / totalCountedSessions) * 100, 2) otherwise
```

### 4.2 Eligibility Output to Completion Context

| Output | Rule |
|---|---|
| `attendancePercentage` | Derived from official attendance records only. |
| `totalCountedSessions` | Count of non-cancelled official attendance records. |
| `attendanceEligibilityStatus` | `NO_ATTENDANCE`, `BELOW_REQUIREMENT`, or `MEETS_REQUIREMENT`. |
| `minimumRequiredPercentage` | Read from Course Completion Rule; not owned by Attendance. |
| `lastCalculatedAt` | UTC timestamp of calculation. |

### 4.3 Low Attendance Detection

```text
resolveThresholdRule:
  1. active batch-level rule
  2. active course-level rule
  3. active branch-level rule
  4. active global rule

for each enrollment summary:
  if totalCountedSessions = 0:
      do not create low-attendance alert unless no-attendance detection is enabled
  if attendancePercentage < thresholdPercentage:
      create or update one OPEN alert for enrollment + rule
  if existing OPEN alert exists and attendancePercentage >= thresholdPercentage:
      mark alert RESOLVED
```

---

## 5. Structured Error Catalog

| HTTP | Error Code | Default English Message | Arabic Message Intent |
|---:|---|---|---|
| 401 | `ERR_AUTH_REQUIRED` | Authentication is required. | تسجيل الدخول مطلوب. |
| 403 | `ERR_ATT_PERMISSION_DENIED` | You do not have permission to perform this attendance action. | ليس لديك صلاحية لتنفيذ هذا الإجراء. |
| 400 | `ERR_ATT_BRANCH_CONTEXT_REQUIRED` | Active branch context is required. | يجب تحديد الفرع النشط. |
| 403 | `ERR_ATT_BRANCH_SCOPE_DENIED` | You cannot access attendance data for this branch. | لا يمكنك الوصول إلى بيانات الحضور لهذا الفرع. |
| 403 | `ERR_ATT_CONSOLIDATED_PERMISSION_REQUIRED` | Consolidated attendance access requires additional permission. | عرض الحضور الموحد يتطلب صلاحية إضافية. |
| 403 | `ERR_ATT_TRAINER_NOT_ASSIGNED_TO_SESSION` | Trainer is not assigned to this session. | المدرب غير مخصص لهذه الجلسة. |
| 403 | `ERR_ATT_TRAINER_BATCH_SCOPE_DENIED` | Trainer cannot access this batch. | لا يمكن للمدرب الوصول إلى هذه الدفعة. |
| 403 | `ERR_ATT_STUDENT_RECORD_SCOPE_DENIED` | Student cannot access another student's attendance record. | لا يمكن للطالب الوصول إلى سجل حضور طالب آخر. |
| 422 | `ERR_ATT_INVALID_UUID` | Identifier must be a valid UUID. | يجب أن يكون المعرف بصيغة UUID صحيحة. |
| 422 | `ERR_ATT_INVALID_DATE` | Date must be in YYYY-MM-DD format. | يجب أن يكون التاريخ بصيغة سنة-شهر-يوم. |
| 422 | `ERR_ATT_INVALID_TIME` | Time must be in HH:mm 24-hour format. | يجب أن يكون الوقت بصيغة 24 ساعة. |
| 422 | `ERR_ATT_INVALID_DATE_RANGE` | End date must be on or after start date. | يجب أن يكون تاريخ النهاية بعد أو يساوي تاريخ البداية. |
| 422 | `ERR_ATT_INVALID_ATTENDANCE_DATE` | Attendance date is not valid for the source session. | تاريخ الحضور غير صالح لهذه الجلسة. |
| 422 | `ERR_ATT_INVALID_ARRIVAL_TIME` | Arrival time is not valid for the session. | وقت الوصول غير صالح لهذه الجلسة. |
| 422 | `ERR_ATT_REASON_REQUIRED` | A reason with at least 10 characters is required. | يجب إدخال سبب لا يقل عن 10 أحرف. |
| 404 | `ERR_ATT_SOURCE_SESSION_NOT_FOUND` | Source training session was not found. | لم يتم العثور على جلسة التدريب الأصلية. |
| 400 | `ERR_ATT_SOURCE_SESSION_CANCELLED` | Source training session is cancelled. | جلسة التدريب الأصلية ملغاة. |
| 400 | `ERR_ATT_SESSION_ALREADY_EXISTS` | Attendance session already exists for this training session. | توجد جلسة حضور مسبقًا لهذه الجلسة. |
| 404 | `ERR_ATT_SESSION_NOT_FOUND` | Attendance session was not found. | لم يتم العثور على جلسة الحضور. |
| 400 | `ERR_ATT_SESSION_EMPTY_ROSTER` | Attendance session has no eligible students. | لا توجد قائمة طلاب مؤهلة لهذه الجلسة. |
| 400 | `ERR_ATT_SESSION_NOT_EDITABLE` | Attendance session cannot be edited in its current status. | لا يمكن تعديل جلسة الحضور في حالتها الحالية. |
| 400 | `ERR_ATT_SESSION_NOT_SUBMITTABLE` | Attendance session cannot be submitted in its current status. | لا يمكن إرسال جلسة الحضور في حالتها الحالية. |
| 400 | `ERR_ATT_SESSION_NOT_APPROVABLE` | Attendance session cannot be approved in its current status. | لا يمكن اعتماد جلسة الحضور في حالتها الحالية. |
| 400 | `ERR_ATT_SESSION_LOCKED` | Attendance session is locked. | جلسة الحضور مقفلة. |
| 404 | `ERR_ATT_RECORD_NOT_FOUND` | Attendance record was not found. | لم يتم العثور على سجل الحضور. |
| 400 | `ERR_ATT_RECORD_LOCKED` | Attendance record cannot be edited directly. | لا يمكن تعديل سجل الحضور مباشرة. |
| 422 | `ERR_ATT_RECORD_SESSION_MISMATCH` | Attendance record does not belong to the selected session. | سجل الحضور لا ينتمي إلى الجلسة المحددة. |
| 400 | `ERR_ATT_DUPLICATE_RECORD_IN_PAYLOAD` | The same attendance record was submitted more than once. | تم إرسال نفس سجل الحضور أكثر من مرة. |
| 400 | `ERR_ATT_LATE_TIME_REQUIRED` | Arrival time is required for Late status. | وقت الوصول مطلوب عند اختيار حالة متأخر. |
| 400 | `ERR_ATT_EXCUSE_REASON_REQUIRED` | Excuse reason is required for Excused status. | سبب العذر مطلوب عند اختيار حالة معذور. |
| 400 | `ERR_ATT_UNMARKED_RECORDS_EXIST` | Attendance cannot be submitted while records are not marked. | لا يمكن إرسال الحضور مع وجود سجلات غير محددة. |
| 404 | `ERR_ATT_CORRECTION_NOT_FOUND` | Attendance correction was not found. | لم يتم العثور على طلب تصحيح الحضور. |
| 400 | `ERR_ATT_CORRECTION_NOT_ALLOWED_FOR_STATUS` | Correction is not allowed for the current session status. | لا يسمح بالتصحيح في حالة جلسة الحضور الحالية. |
| 400 | `ERR_ATT_CORRECTION_NO_STATUS_CHANGE` | Correction must change the attendance status. | يجب أن يغير التصحيح حالة الحضور. |
| 409 | `ERR_ATT_CORRECTION_PENDING_EXISTS` | A pending correction already exists for this record. | يوجد طلب تصحيح معلق لهذا السجل. |
| 403 | `ERR_ATT_SELF_APPROVAL_BLOCKED` | You cannot approve a correction you submitted. | لا يمكنك اعتماد طلب تصحيح قمت بإرساله. |
| 404 | `ERR_ATT_SUMMARY_NOT_FOUND` | Attendance summary was not found. | لم يتم العثور على ملخص الحضور. |
| 500 | `ERR_ATT_SUMMARY_CALCULATION_FAILED` | Attendance summary calculation failed. | فشل حساب ملخص الحضور. |
| 400 | `ERR_ATT_ALERT_SCOPE_REQUIRED` | At least one alert detection scope is required. | يجب تحديد نطاق واحد على الأقل لاكتشاف التنبيه. |
| 409 | `ERR_ATT_ALERT_DUPLICATE_OPEN` | An open alert already exists for this rule and enrollment. | يوجد تنبيه مفتوح مسبقًا لهذه القاعدة وهذا التسجيل. |
| 422 | `ERR_ATT_ALERT_ACTION_REQUIRED` | Action taken is required to acknowledge the alert. | يجب إدخال الإجراء المتخذ لتأكيد التنبيه. |
| 400 | `ERR_ATT_ALERT_RULE_OVERLAP` | Alert rule overlaps an existing active rule. | تتداخل قاعدة التنبيه مع قاعدة نشطة أخرى. |
| 409 | `ERR_ATT_CONCURRENT_MODIFICATION` | This record was changed by another user. Refresh and try again. | تم تعديل هذا السجل بواسطة مستخدم آخر. يرجى التحديث والمحاولة مرة أخرى. |
| 500 | `ERR_ATT_AUDIT_WRITE_FAILED` | Audit log could not be written. | تعذر تسجيل سجل التدقيق. |
| 500 | `ERR_ATT_NOTIFICATION_REQUEST_FAILED` | Notification request could not be created. | تعذر إنشاء طلب الإشعار. |
| 400 | `ERR_ATT_HARD_DELETE_NOT_ALLOWED` | Hard delete is not allowed for attendance data. | الحذف النهائي غير مسموح لبيانات الحضور. |

---

## 6. Notification Events

| Event | Trigger | Channels | Recipients | Priority |
|---|---|---|---|---|
| `AttendanceSessionCreated` | Attendance session initialized. | SystemNotification, Email optional | Assigned trainer, training coordinator | Normal |
| `AttendanceMarked` | Draft records marked or updated. | SystemNotification | Training coordinator, assigned trainer | Low |
| `AttendanceSessionSubmitted` | Attendance submitted officially. | SystemNotification, Email optional | Academic coordinator, branch admin | Normal |
| `AttendanceSessionReturned` | Submitted attendance returned. | SystemNotification, Email optional | Assigned trainer, training coordinator | High |
| `AttendanceSessionApproved` | Attendance session approved. | SystemNotification | Trainer, training coordinator | Normal |
| `AttendanceCorrectionRequested` | Correction submitted. | SystemNotification, Email optional | Academic coordinator, branch admin | High |
| `AttendanceCorrectionApproved` | Correction approved and official record updated. | SystemNotification, Email optional | Requester, trainer, student optional | High |
| `AttendanceCorrectionRejected` | Correction rejected. | SystemNotification, Email optional | Requester | High |
| `LowAttendanceDetected` | Percentage below threshold. | Email, SMS, WhatsApp, SystemNotification | Student, counselor, trainer, branch admin | High |
| `LowAttendanceResolved` | Percentage back above threshold. | SystemNotification, Email optional | Student, counselor, trainer | Normal |
| `AttendanceAlertAcknowledged` | Staff acknowledges alert. | SystemNotification | Branch admin, academic coordinator | Normal |
| `AttendanceSessionLocked` | Session locked after closure. | SystemNotification | Branch admin, audit officer | Normal |
| `AttendanceSessionUnlocked` | Session unlocked by high-privilege user. | SystemNotification, Email | Branch admin, audit officer | High |

---

## 7. Notification Templates and Variables

### 7.1 `ATT_SESSION_CREATED`

| Field | Value |
|---|---|
| Event | `AttendanceSessionCreated` |
| Channels | SystemNotification, Email |
| Recipients | Assigned trainer, training coordinator |
| Subject EN | `Attendance session created for {{batchCode}} - Session {{sessionNumber}}` |
| Subject AR | `تم إنشاء جلسة حضور للدفعة {{batchCode}} - الجلسة {{sessionNumber}}` |

Variables: `branchNameEn`, `branchNameAr`, `courseNameEn`, `courseNameAr`, `batchCode`, `sessionNumber`, `attendanceDate`, `startTime`, `endTime`, `trainerName`, `attendanceSessionUrl`.

English body:

```text
An attendance session has been created for {{courseNameEn}}, batch {{batchCode}}, session {{sessionNumber}} on {{attendanceDate}} from {{startTime}} to {{endTime}}.
Please mark attendance from the attendance workspace: {{attendanceSessionUrl}}.
```

Arabic body intent:

```text
تم إنشاء جلسة حضور لدورة {{courseNameAr}}، الدفعة {{batchCode}}، الجلسة {{sessionNumber}} بتاريخ {{attendanceDate}} من {{startTime}} إلى {{endTime}}.
يرجى تسجيل الحضور من شاشة الحضور: {{attendanceSessionUrl}}.
```

### 7.2 `ATT_SESSION_SUBMITTED`

| Field | Value |
|---|---|
| Event | `AttendanceSessionSubmitted` |
| Channels | SystemNotification, Email |
| Recipients | Academic coordinator, branch admin |
| Subject EN | `Attendance submitted: {{batchCode}} - {{attendanceDate}}` |
| Subject AR | `تم إرسال الحضور: {{batchCode}} - {{attendanceDate}}` |

Variables: `courseNameEn`, `courseNameAr`, `batchCode`, `sessionNumber`, `attendanceDate`, `submittedByName`, `submittedAtOman`, `totalCount`, `presentCount`, `lateCount`, `absentCount`, `excusedCount`, `reviewUrl`.

English body:

```text
Attendance has been submitted by {{submittedByName}} for {{courseNameEn}}, batch {{batchCode}}, session {{sessionNumber}}.
Summary: Total {{totalCount}}, Present {{presentCount}}, Late {{lateCount}}, Absent {{absentCount}}, Excused {{excusedCount}}.
Review the attendance here: {{reviewUrl}}.
```

### 7.3 `ATT_SESSION_RETURNED`

| Field | Value |
|---|---|
| Event | `AttendanceSessionReturned` |
| Channels | SystemNotification, Email |
| Recipients | Assigned trainer, training coordinator |
| Subject EN | `Attendance returned for correction: {{batchCode}} - Session {{sessionNumber}}` |
| Subject AR | `تم إرجاع الحضور للتصحيح: {{batchCode}} - الجلسة {{sessionNumber}}` |

Variables: `batchCode`, `sessionNumber`, `attendanceDate`, `returnedByName`, `returnReason`, `correctionUrl`.

### 7.4 `ATT_CORRECTION_REQUESTED`

| Field | Value |
|---|---|
| Event | `AttendanceCorrectionRequested` |
| Channels | SystemNotification, Email |
| Recipients | Academic coordinator, branch admin |
| Subject EN | `Attendance correction requested for {{studentNumber}}` |
| Subject AR | `تم طلب تصحيح حضور للطالب {{studentNumber}}` |

Variables: `studentNumber`, `studentNameEn`, `studentNameAr`, `courseNameEn`, `courseNameAr`, `batchCode`, `attendanceDate`, `oldStatus`, `newStatus`, `reason`, `requestedByName`, `approvalUrl`.

### 7.5 `ATT_CORRECTION_APPROVED`

| Field | Value |
|---|---|
| Event | `AttendanceCorrectionApproved` |
| Channels | SystemNotification, Email |
| Recipients | Requester, trainer, student optional |
| Subject EN | `Attendance correction approved for {{studentNumber}}` |
| Subject AR | `تم اعتماد تصحيح الحضور للطالب {{studentNumber}}` |

Variables: `studentNumber`, `studentNameEn`, `studentNameAr`, `attendanceDate`, `oldStatus`, `newStatus`, `approvedByName`, `approvedAtOman`, `attendancePercentage`, `summaryUrl`.

### 7.6 `ATT_CORRECTION_REJECTED`

| Field | Value |
|---|---|
| Event | `AttendanceCorrectionRejected` |
| Channels | SystemNotification, Email |
| Recipients | Requester |
| Subject EN | `Attendance correction rejected for {{studentNumber}}` |
| Subject AR | `تم رفض تصحيح الحضور للطالب {{studentNumber}}` |

Variables: `studentNumber`, `studentNameEn`, `attendanceDate`, `oldStatus`, `requestedStatus`, `rejectedByName`, `rejectionReason`, `correctionUrl`.

### 7.7 `ATT_LOW_ATTENDANCE_DETECTED`

| Field | Value |
|---|---|
| Event | `LowAttendanceDetected` |
| Channels | Email, SMS, WhatsApp, SystemNotification |
| Recipients | Student, counselor, trainer, branch admin |
| Subject EN | `Low attendance alert: {{courseNameEn}} - {{attendancePercentage}}%` |
| Subject AR | `تنبيه انخفاض الحضور: {{courseNameAr}} - {{attendancePercentage}}%` |

Variables: `studentNumber`, `studentNameEn`, `studentNameAr`, `courseNameEn`, `courseNameAr`, `batchCode`, `attendancePercentage`, `thresholdPercentage`, `totalCountedSessions`, `absentCount`, `lateCount`, `lastAttendanceDate`, `studentPortalUrl`, `adminAlertUrl`.

English Email:

```text
Dear {{studentNameEn}},

Your attendance for {{courseNameEn}} in batch {{batchCode}} is currently {{attendancePercentage}}%, which is below the required {{thresholdPercentage}}% threshold.
Total counted sessions: {{totalCountedSessions}}. Absences: {{absentCount}}. Late arrivals: {{lateCount}}.
Please contact your trainer or branch coordinator if you need support.

View your attendance: {{studentPortalUrl}}
```

SMS:

```text
ASTI: Your attendance for {{courseNameEn}} is {{attendancePercentage}}%, below the required {{thresholdPercentage}}%. Please contact your branch coordinator.
```

WhatsApp:

```text
Dear {{studentNameEn}}, your attendance for {{courseNameEn}} batch {{batchCode}} is {{attendancePercentage}}%, below the required {{thresholdPercentage}}%. Please review your attendance: {{studentPortalUrl}}
```

### 7.8 `ATT_LOW_ATTENDANCE_RESOLVED`

Variables: `studentNameEn`, `courseNameEn`, `courseNameAr`, `batchCode`, `attendancePercentage`, `thresholdPercentage`, `resolvedAtOman`.

Subject EN: `Attendance is now within requirement: {{courseNameEn}}`

Subject AR: `أصبح الحضور ضمن المتطلبات: {{courseNameAr}}`

### 7.9 `ATT_SESSION_LOCKED`

Variables: `batchCode`, `attendanceDate`, `lockedByName`, `lockReason`, `lockedAtOman`.

Subject EN: `Attendance session locked: {{batchCode}} - {{attendanceDate}}`

Subject AR: `تم قفل جلسة الحضور: {{batchCode}} - {{attendanceDate}}`

### 7.10 `ATT_SESSION_UNLOCKED`

Variables: `batchCode`, `attendanceDate`, `unlockedByName`, `unlockReason`, `unlockedAtOman`, `sessionUrl`.

Subject EN: `Attendance session unlocked: {{batchCode}} - {{attendanceDate}}`

Subject AR: `تم فتح قفل جلسة الحضور: {{batchCode}} - {{attendanceDate}}`

---

## 8. Notification Recipient Resolution

| Recipient Type | Rule |
|---|---|
| Assigned trainer | Resolve from `Session.trainerId` or active `BatchTrainer` for batch/session date. |
| Training coordinator | Users in branch with `attendance.session.read` and coordinator assignment. |
| Academic coordinator | Users in branch with `attendance.session.approve` or `attendance.correction.approve`. |
| Branch admin | Users in branch with `attendance.alert.read` or `attendance.session.approve`. |
| Student | `Enrollment -> StudentProfile -> Person` contact details. |
| Counselor | Linked lead/admission counselor where available, otherwise branch counselor group. |
| Certificate officer | Users with certificate processing and attendance summary read permissions. |
| Audit officer | Users with `attendance.audit.read` in branch. |
| Corporate coordinator | Phase 2: corporate contacts with portal access and participant scope. |

---

## 9. Notification Suppression and Idempotency

| Rule ID | Rule |
|---|---|
| NOTIF-M08-001 | Low attendance notification must not be sent more than once per enrollment, rule, and percentage band within 24 hours. |
| NOTIF-M08-002 | Correction request notification is sent once per correction submission. |
| NOTIF-M08-003 | Returned and resubmitted attendance may send a new submission notification. |
| NOTIF-M08-004 | Non-critical notification creation failure must not rollback attendance marking. |
| NOTIF-M08-005 | Unlock notification failure is compliance-critical and must be visible to audit users. |
| NOTIF-M08-006 | Invalid student phone produces `SKIPPED_INVALID_CONTACT`; it must not block attendance transaction. |
| NOTIF-M08-007 | Invalid email produces `SKIPPED_INVALID_CONTACT`; it must not block attendance transaction. |
| NOTIF-M08-008 | Arabic templates are used when recipient preferred language is `ar`; otherwise English templates are used. |
| NOTIF-M08-009 | Portal links must enforce recipient scope and never expose unauthorized branch or student data. |
| NOTIF-M08-010 | Corporate low-attendance notifications are Phase 2 only. |

---

## 10. Cross-Module Validation Dependencies

| Dependency | Owning Module | Attendance Use |
|---|---|---|
| User, Role, Permission, UserBranchAccess | Module 01 – IAM | Authentication, authorization, branch scope. |
| Branch | Module 02 – Organization | Branch isolation and branch status validation. |
| Course, CourseCompletionRule | Course Catalog | Minimum attendance percentage and completion rule metadata. |
| Batch, Session, BatchTrainer | Training Delivery | Source sessions, trainer assignment, roster source. |
| Enrollment | Admission & Enrollment | Central learner lifecycle and roster eligibility. |
| StudentProfile, Person | Student Management / Party | Display identity, self-scope, contact resolution. |
| TrainerProfile | Faculty / Trainer | Trainer portal scope and assignment. |
| CourseCompletion | Exam & Completion | Consumes attendance summary; Attendance does not approve completion. |
| Certificate | Certificate Management | Indirect dependency through completion eligibility. |
| NotificationRequest | Communication | Notification request creation only. |
| AuditLog | Audit & Compliance | Sensitive action audit trail. |
| Document | Document Management | Optional supporting document for excused correction. |

---

## 11. Acceptance Criteria

1. Every mutation validates authentication, permission, branch scope, soft-delete state, and optimistic version.
2. Attendance can be marked only for active enrollments connected to the target batch through `Enrollment`.
3. Official attendance cannot be edited directly after submission.
4. Corrections must be approved before official records change.
5. Summary calculation must be deterministic for the same set of official records.
6. Alerts must be idempotent and must not create duplicate open alerts for the same enrollment and rule.
7. Sensitive actions requiring a reason reject blank, whitespace-only, or fewer-than-10-character reasons.
8. All error responses use the structured error envelope and defined error codes.
9. Notification requests must include all required template variables.
10. Arabic and English notifications must use the recipient's preferred language.
