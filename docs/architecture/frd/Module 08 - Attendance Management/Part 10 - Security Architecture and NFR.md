# Part 10 - Security Architecture and NFR

## Module 08 – Attendance Management

| Attribute | Value |
|---|---|
| Product | ASTI Integrated Institute Management System (IMS) |
| Module | Module 08 – Attendance Management |
| Module Code | M08-ATT |
| Bounded Context | Attendance Management |
| Primary Package | `packages/attendance` |
| Application Scope | Admin Portal, Trainer Portal, Student Portal read-only attendance views |
| Architecture Style | TypeScript / Next.js modular monolith |
| Database | PostgreSQL via Prisma |
| Default Business Timezone | Oman GST, UTC+4 |
| Security Baseline | Server-side RBAC, branch isolation, soft deletes, audit logging, encrypted transport, controlled PII exposure |

---

## 1. Purpose

This document defines the module-specific security architecture and non-functional requirements for Module 08 – Attendance Management. Attendance data is operationally sensitive because it is used to determine learner participation, course completion eligibility, certificate eligibility, trainer performance, batch quality, student warnings, and institutional compliance reporting.

The Attendance module must protect against unauthorized marking, retroactive manipulation, cross-branch data leakage, forged correction approvals, hidden record deletion, and inconsistent attendance percentages. The module must be secure by default, branch-scoped at the server boundary, auditable for all sensitive actions, and performant for high-volume roster marking during class hours.

---

## 2. Security Scope

### 2.1 In Scope

The following security controls are mandatory for Attendance Management:

| Area | Scope |
|---|---|
| Authentication | Every Admin, Trainer, and Student attendance screen and API must require authenticated user context. |
| Authorization | Fine-grained permissions control menu access, view, mark, submit, reopen, correct, approve, reject, export, and report actions. |
| Branch Isolation | Every operational query must be server-side scoped by branch access. Client-side filters are never trusted. |
| Trainer Ownership | Trainers may mark only sessions assigned to them or delegated to them by an authorized academic administrator. |
| Student Privacy | Students may view only their own attendance records and summaries. |
| Audit Logging | Marking, submission, correction, approval, rejection, reopening, bulk import, export, and soft delete actions must be audited. |
| Data Integrity | Attendance records must not exist without valid session, batch, enrollment, student, course, and branch relationships. |
| Soft Delete | No attendance-owned record may be hard-deleted by application workflows. |
| Effective Dating | Rule and alert configurations must support effective date ranges and status. |
| Encryption | Transport encryption is mandatory. Sensitive free-text reasons and exported files must be protected by access control and retention rules. |
| Export Control | Attendance exports must require explicit report/export permission and must be branch-scoped. |
| Operational Security | Logs must not expose PII, civil ID, passport number, phone number, or raw authentication/session tokens. |

### 2.2 Out of Scope

The following capabilities are excluded from the current Attendance module security design:

| Excluded Capability | Reason |
|---|---|
| Biometric attendance device trust model | Biometric integration is a future context and must not be treated as Phase 1 attendance source of truth. |
| External message provider security | Email, SMS, and WhatsApp delivery belong to Communication & Notification Management. |
| Payroll authorization | Trainer compensation and payroll settlement belong to Trainer Management and future Payroll context. |
| Certificate signing security | Certificate signing belongs to Certificate Management. Attendance only contributes eligibility evidence. |
| Online payment security | Payment gateway is deferred and belongs to Finance / Payment Integration. |
| Microservice API gateway controls | The platform is a modular monolith first; module security is enforced inside the Next.js application and package boundaries. |

---

## 3. Security Architecture Principles

| Principle | Attendance-Specific Application |
|---|---|
| Deny by default | Users receive no attendance access unless explicitly granted permissions. |
| Server-side trust boundary | Branch, user, trainer, student, and role context must be resolved server-side from authenticated session. |
| Least privilege | Trainer, Counselor, Accountant, Student, Branch Admin, and Super Admin permissions must remain separate. |
| Separation of duties | The user who requests an attendance correction should not approve the same correction unless they have explicit override permission. |
| Immutable history | Attendance changes must preserve previous status through audit logs and correction records. |
| Soft delete only | Deleted records remain recoverable and auditable. |
| Idempotent operations | Bulk marking and roster generation APIs must tolerate safe retry without duplicate line creation. |
| Domain ownership | Attendance owns attendance sessions, records, corrections, alerts, and summaries. It references, but does not own, Enrollment, Batch, Session, Course, User, Trainer, and Student data. |
| Bilingual readiness | Security errors and validation errors must support English and Arabic display keys. |
| Oman-local business dates | Business dates must render in Oman GST UTC+4 while persistence timestamps remain UTC. |

---

## 4. Identity, Authentication, and Session Controls

### 4.1 Authentication Requirements

| Requirement ID | Requirement |
|---|---|
| SEC-M08-001 | All attendance APIs and Server Actions must reject unauthenticated requests with `401 Unauthorized` and application code `ERR_ATT_AUTH_REQUIRED`. |
| SEC-M08-002 | The authenticated principal must include `userId`, `personId`, `defaultBranchId`, assigned branch list, permission list, and preferred language. |
| SEC-M08-003 | Trainer portal attendance marking requires authenticated user linked to a valid active `TrainerProfile`. |
| SEC-M08-004 | Student portal attendance view requires authenticated user linked to the requested `StudentProfile` through shared `Person`. |
| SEC-M08-005 | Session expiry during attendance marking must not partially submit records. The server must reject the transaction before mutation begins. |

### 4.2 Session Context Required by Attendance APIs

```ts
interface AttendanceAuthContext {
  userId: string;
  personId: string;
  preferredLanguage: 'en' | 'ar';
  activeBranchId: string;
  assignedBranchIds: string[];
  canViewChildBranches: boolean;
  canViewConsolidated: boolean;
  permissionCodes: string[];
  trainerProfileId?: string;
  studentProfileId?: string;
  requestIp: string;
  userAgent: string;
}
```

### 4.3 Session Security Rules

| Rule ID | Rule |
|---|---|
| SEC-M08-R001 | `activeBranchId` must be selected from the authenticated user's assigned branches unless `attendance.report.consolidated` is granted. |
| SEC-M08-R002 | A trainer without `attendance.admin.mark` may mark only attendance sessions where `session.trainerId = auth.trainerProfileId` or where an active delegation exists. |
| SEC-M08-R003 | A student may never pass arbitrary `studentProfileId` to view another student’s attendance. The server must derive the student identity from the authenticated user. |
| SEC-M08-R004 | Admin users with consolidated reporting permission may read cross-branch aggregated reports but cannot mutate attendance outside an explicitly selected authorized branch. |
| SEC-M08-R005 | Session cookies, bearer tokens, CSRF tokens, or authentication secrets must never be written into structured logs, audit logs, exports, or error responses. |

---

## 5. Authorization and Permission Enforcement

### 5.1 Permission Categories

| Category | Examples |
|---|---|
| Menu-level permissions | `attendance.menu`, `attendance.dashboard.menu`, `attendance.reports.menu`, `attendance.corrections.menu` |
| Action-level permissions | `attendance.session.create`, `attendance.record.mark`, `attendance.record.submit`, `attendance.record.reopen`, `attendance.correction.request`, `attendance.correction.approve`, `attendance.correction.reject`, `attendance.export` |
| Report-level permissions | `attendance.report.branch`, `attendance.report.trainer`, `attendance.report.student`, `attendance.report.lowAttendance`, `attendance.report.consolidated` |
| Administrative permissions | `attendance.rule.manage`, `attendance.alert.manage`, `attendance.admin.override`, `attendance.audit.view` |

### 5.2 Authorization Guard Pattern

Every Attendance route or Server Action must follow this sequence:

```text
1. Authenticate request.
2. Resolve auth context from server session.
3. Resolve active branch context from server-side allowed branch list.
4. Check required permission code.
5. Load target entity using branch-scoped query.
6. Apply domain ownership check such as trainer/session or student/self-view.
7. Validate entity state transition.
8. Execute mutation inside database transaction.
9. Write audit log for sensitive operation.
10. Return sanitized DTO.
```

### 5.3 Required Guard Matrix

| Operation | Required Permission | Additional Ownership Guard |
|---|---|---|
| View attendance dashboard | `attendance.dashboard.view` | Branch-scoped metric query. |
| Generate attendance session | `attendance.session.create` | Session must belong to allowed branch. |
| View attendance session | `attendance.session.read` | Session branch must be accessible. |
| Mark own trainer session | `attendance.record.mark` | Trainer must be assigned to session. |
| Mark any branch session | `attendance.admin.mark` | Branch Admin or Academic Admin must have target branch access. |
| Submit attendance session | `attendance.record.submit` | Marker must be assigned trainer or authorized admin. |
| Reopen submitted session | `attendance.record.reopen` | Requires admin override; correction trail must be created. |
| Request correction | `attendance.correction.request` | Requester must be trainer/admin within branch. |
| Approve correction | `attendance.correction.approve` | Approver must not be requester unless `attendance.admin.override` is granted. |
| Reject correction | `attendance.correction.reject` | Approver must not be requester unless override is granted. |
| View student self attendance | `attendance.student.self.view` | Student profile must resolve from authenticated person. |
| Export report | `attendance.export` | Branch or consolidated report permission must match export scope. |
| View audit trail | `attendance.audit.view` | Branch-scoped audit records only unless consolidated audit permission exists. |

---

## 6. Branch Isolation Security

### 6.1 Server-Side Scoping Rule

Every Attendance-owned query must enforce one of the following server-side predicates:

```sql
-- Single branch operational access
attendance_sessions.branch_id = :activeBranchId

-- Multi-branch assigned access
attendance_sessions.branch_id = ANY(:assignedBranchIds)

-- Consolidated report access only
attendance_sessions.branch_id = ANY(:reportableBranchIds)
```

Client-provided `branchId` is treated as a filter request only. The server must intersect it with the authenticated user’s allowed branch set.

### 6.2 Branch Scope Resolution Algorithm

```text
Input:
- auth.assignedBranchIds
- auth.activeBranchId
- auth.canViewChildBranches
- auth.canViewConsolidated
- requestedBranchId
- requestedScope = SINGLE_BRANCH | ASSIGNED_BRANCHES | CHILD_BRANCHES | CONSOLIDATED

Algorithm:
1. Load assigned branches from UserBranchAccess where userId = auth.userId and access is active.
2. If requestedScope = SINGLE_BRANCH:
   a. Require requestedBranchId or activeBranchId.
   b. Verify branch is in assignedBranchIds or allowed child branch set.
   c. Return exactly one branch id.
3. If requestedScope = ASSIGNED_BRANCHES:
   a. Return assignedBranchIds.
4. If requestedScope = CHILD_BRANCHES:
   a. Require canViewChildBranches = true.
   b. Load child branch tree for assigned parent branches.
   c. Return assigned + child branch ids.
5. If requestedScope = CONSOLIDATED:
   a. Require canViewConsolidated = true and report-level permission.
   b. Return assigned + child branch ids if allowed by policy.
6. Reject with ERR_ATT_BRANCH_ACCESS_DENIED when requested branch is outside resolved scope.
```

### 6.3 Branch Isolation Test Targets

| Target | Expected Protection |
|---|---|
| Attendance session lookup by ID | Must include branch predicate. |
| Record update by `attendanceRecordId` | Must join to `attendance_sessions` and validate branch. |
| Correction approval by ID | Must validate correction branch through linked attendance session. |
| Dashboard counts | Must aggregate only allowed branch ids. |
| Export jobs | Must persist export request branch scope and verify it again at execution. |
| Student portal view | Must ignore requested branch if it exposes non-owned student records. |

---

## 7. Data Classification and Protection

### 7.1 Data Classification

| Data Element | Classification | Protection Requirement |
|---|---|---|
| Student name | PII | Display only to authorized users; avoid logs. |
| Student number | Internal identifier | Allowed in UI and reports when permission granted. |
| Enrollment number | Internal business identifier | Allowed in branch-scoped reports. |
| Attendance status | Sensitive educational record | Restrict by branch, trainer assignment, or student self-view. |
| Attendance remarks | Sensitive free text | Restrict by permission; sanitize input; exclude from public exports unless requested. |
| Correction reason | Sensitive operational audit data | Audit and restrict to authorized approvers/admin users. |
| Trainer name | Internal staff data | Branch/report scoped. |
| Batch/session schedule | Operational data | Branch/report scoped. |
| Low attendance alerts | Sensitive student risk data | Restrict to Trainer, Branch Admin, Academic Admin, and authorized Student self-view. |
| Civil ID/passport/phone/email | High-risk PII | Attendance module must not expose unless required by another authorized context. |

### 7.2 Encryption Requirements

| Requirement ID | Requirement |
|---|---|
| SEC-M08-ENC-001 | All browser-to-server traffic must use HTTPS/TLS in deployed environments. |
| SEC-M08-ENC-002 | Database backups containing attendance data must be encrypted at rest using platform-approved storage encryption. |
| SEC-M08-ENC-003 | Exported attendance files must be generated into access-controlled temporary storage and expire automatically. |
| SEC-M08-ENC-004 | Free-text remarks and correction reasons must not contain Civil ID, passport number, bank reference, or card details; validation should warn and block obvious sensitive patterns. |
| SEC-M08-ENC-005 | If field-level encryption is enabled globally for sensitive notes, `AttendanceRecord.remarks`, `AttendanceCorrection.reason`, and `AttendanceCorrection.approverRemarks` must participate. |

### 7.3 PII Redaction Rules

| Surface | Redaction Requirement |
|---|---|
| Structured logs | Replace names, phone numbers, emails, Civil IDs, and passport numbers with stable internal IDs only. |
| API errors | Return entity type and application error code, not full student details. |
| Audit logs | Store old/new status, IDs, reason, actor, time, IP; do not store full student PII snapshots. |
| CSV/XLSX/PDF export | Include student name and number only when export permission allows student-identifiable reporting. |
| Student portal | Show only authenticated student’s own data. |

---

## 8. Input Security and Validation

### 8.1 General Input Controls

| Control | Requirement |
|---|---|
| UUID validation | All IDs must match canonical UUID/CUID format used by the platform before database access. |
| Enum validation | Attendance status must be one of `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `NOT_MARKED`. |
| Date validation | Attendance business date must align with the session date unless admin override is granted. |
| Timezone validation | Client dates must be interpreted using Oman GST for business rules and persisted as UTC timestamps. |
| Text length | Remarks and reasons must have strict minimum and maximum lengths. |
| HTML sanitization | Remarks and correction notes must reject or sanitize HTML/script content. |
| File export filters | Export filter values must be whitelisted; raw SQL fragments are never accepted. |
| Pagination bounds | Page size must be bounded to prevent unbounded report queries. |

### 8.2 Text Field Security Rules

| Field | Validation |
|---|---|
| `AttendanceRecord.remarks` | Optional; trim whitespace; 1–500 characters when provided; reject `<script`, `javascript:`, HTML tags, raw card numbers, and obvious Civil ID patterns. |
| `AttendanceCorrection.reason` | Mandatory; 10–1000 characters; must include a business reason; reject unsafe HTML and high-risk PII patterns. |
| `AttendanceCorrection.approverRemarks` | Optional for approval; mandatory for rejection; 5–1000 characters when provided. |
| `AttendanceAlertRule.description` | Optional; 1–500 characters; bilingual localized value allowed. |
| `ExportRequest.fileName` | System-generated only; users may not supply arbitrary path or extension. |

### 8.3 Bulk Attendance Idempotency

Bulk attendance submission must support a deterministic idempotency key:

```text
idempotencyKey = sha256(branchId + sessionId + attendanceSessionId + actorUserId + clientSubmissionUuid)
```

Rules:

| Rule ID | Rule |
|---|---|
| SEC-M08-IDEMP-001 | Duplicate retry with same idempotency key and identical payload returns original success response. |
| SEC-M08-IDEMP-002 | Duplicate retry with same idempotency key and different payload returns `409 Conflict` and `ERR_ATT_IDEMPOTENCY_PAYLOAD_MISMATCH`. |
| SEC-M08-IDEMP-003 | Idempotency records must expire after 24 hours for normal marking operations. |
| SEC-M08-IDEMP-004 | Correction approval idempotency must expire after 7 days because approval workflows may be retried by background notifications. |

---

## 9. Audit Architecture

### 9.1 Audited Actions

The following Attendance actions must write an audit record:

| Action | Audit Action Code | Audit Severity |
|---|---|---|
| Attendance session generated | `ATTENDANCE_SESSION_CREATED` | INFO |
| Attendance draft saved | `ATTENDANCE_DRAFT_SAVED` | INFO |
| Attendance record status changed | `ATTENDANCE_RECORD_UPDATED` | MEDIUM |
| Attendance session submitted | `ATTENDANCE_SESSION_SUBMITTED` | HIGH |
| Attendance session reopened | `ATTENDANCE_SESSION_REOPENED` | HIGH |
| Attendance correction requested | `ATTENDANCE_CORRECTION_REQUESTED` | HIGH |
| Attendance correction approved | `ATTENDANCE_CORRECTION_APPROVED` | HIGH |
| Attendance correction rejected | `ATTENDANCE_CORRECTION_REJECTED` | HIGH |
| Attendance record soft deleted | `ATTENDANCE_RECORD_SOFT_DELETED` | CRITICAL |
| Attendance alert generated | `ATTENDANCE_ALERT_GENERATED` | INFO |
| Attendance report exported | `ATTENDANCE_REPORT_EXPORTED` | HIGH |
| Attendance rule changed | `ATTENDANCE_RULE_CHANGED` | HIGH |

### 9.2 Audit Log Minimum Payload

```json
{
  "entityType": "AttendanceRecord",
  "entityId": "attrec_01HZXAMPLE000000000000000",
  "moduleCode": "M08-ATT",
  "action": "ATTENDANCE_RECORD_UPDATED",
  "oldValue": {
    "status": "ABSENT",
    "remarksHash": "sha256:..."
  },
  "newValue": {
    "status": "EXCUSED",
    "remarksHash": "sha256:..."
  },
  "performedBy": "usr_01HZXAMPLE000000000000000",
  "performedAt": "2026-07-04T08:30:00.000Z",
  "branchId": "br_01HZXAMPLE000000000000000",
  "ipAddress": "203.0.113.10",
  "userAgentHash": "sha256:...",
  "reason": "Correction approved by Academic Coordinator",
  "correlationId": "req_01HZXAMPLE000000000000000"
}
```

### 9.3 Audit Integrity Rules

| Rule ID | Rule |
|---|---|
| AUD-M08-001 | Audit log write must occur in the same transaction as the attendance mutation when the mutation is synchronous. |
| AUD-M08-002 | If audit log persistence fails, sensitive attendance mutation must fail and roll back. |
| AUD-M08-003 | Audit entries must include `branchId` for all branch-owned attendance actions. |
| AUD-M08-004 | Audit entries must include previous and new attendance status for status changes. |
| AUD-M08-005 | Audit entries for exports must include filter criteria, branch scope, row count, file type, actor, and timestamp. |
| AUD-M08-006 | Audit records must not be editable by Attendance module workflows. |

---

## 10. Data Integrity and Transaction Security

### 10.1 Transaction Boundaries

| Transaction | Required Atomic Operations |
|---|---|
| Generate attendance session | Create `AttendanceSession`, create one `AttendanceRecord` per active enrollment, write audit log. |
| Save draft attendance | Upsert record statuses, update session progress fields, write audit log summary. |
| Submit attendance | Validate all records, lock session row, update statuses, calculate summary, update session state, write audit log. |
| Request correction | Create correction request, preserve old/new requested status, write audit log, optionally create notification request. |
| Approve correction | Lock correction and record rows, validate state, update attendance record, update summaries, update correction status, write audit log. |
| Reopen session | Lock submitted session, update status to reopened/draft, write correction trail, write audit log. |
| Soft delete | Set `isDeleted`, `deletedAt`, `updatedBy`, write audit log; do not physically remove. |

### 10.2 Concurrency Controls

| Risk | Control |
|---|---|
| Two trainers submit same session simultaneously | Optimistic locking using `version`; reject stale submission with `ERR_ATT_CONCURRENT_MODIFICATION`. |
| Admin reopens while trainer submits | Row-level transaction lock on `AttendanceSession` during state transition. |
| Correction approved twice | Unique active correction state guard and transaction lock on correction row. |
| Roster changes during marking | Roster snapshot at `AttendanceSession` creation; newly enrolled students require refresh action by authorized user. |
| Summary mismatch | Summary recomputation must happen in same transaction after final record update. |

### 10.3 Database Constraints

| Entity | Constraint |
|---|---|
| `AttendanceSession` | Unique active session per `sessionId` where `isDeleted = false`. |
| `AttendanceRecord` | Unique active record per `attendanceSessionId + enrollmentId` where `isDeleted = false`. |
| `AttendanceCorrection` | Only one pending correction per `attendanceRecordId` where status = `PENDING`. |
| `AttendanceAlertRule` | Effective dates must not overlap for same branch/course/severity/threshold combination. |
| `EnrollmentAttendanceSummary` | Unique active summary per `enrollmentId`. |

---

## 11. Secure Export Architecture

### 11.1 Export Types

| Export Type | Permission | PII Level | Retention |
|---|---|---|---|
| Session attendance CSV | `attendance.export.session` | Student names and statuses | 24 hours |
| Low attendance XLSX | `attendance.export.lowAttendance` | Student names, enrollment numbers, percentages | 24 hours |
| Branch attendance PDF | `attendance.export.branchReport` | Aggregated and identifiable rows depending on filter | 24 hours |
| Trainer attendance report | `attendance.export.trainerReport` | Trainer performance + session counts | 24 hours |
| Consolidated attendance export | `attendance.export.consolidated` + `attendance.report.consolidated` | Multi-branch data | 12 hours |

### 11.2 Export Security Rules

| Rule ID | Rule |
|---|---|
| EXP-M08-001 | Exports must be generated server-side from branch-scoped queries only. |
| EXP-M08-002 | Export URLs must be signed, time-limited, and scoped to the requesting user. |
| EXP-M08-003 | Exported files must not be publicly accessible. |
| EXP-M08-004 | Export requests must be audited before file delivery. |
| EXP-M08-005 | Export filters must be stored with export audit metadata. |
| EXP-M08-006 | Exports must show report generation timestamp in Oman GST and UTC. |
| EXP-M08-007 | Consolidated export must visually include branch column and scope statement. |
| EXP-M08-008 | Student self-service export may include only the authenticated student’s attendance. |

---

## 12. Non-Functional Requirements Summary

### 12.1 Performance Targets

| NFR ID | Capability | Target |
|---|---|---|
| NFR-M08-PERF-001 | Attendance session list load | p95 <= 800 ms for branch-scoped query returning first 50 rows. |
| NFR-M08-PERF-002 | Session roster load | p95 <= 1200 ms for up to 100 enrolled students. |
| NFR-M08-PERF-003 | Save draft attendance | p95 <= 1500 ms for 100 attendance records. |
| NFR-M08-PERF-004 | Submit attendance | p95 <= 2500 ms for 100 records including validation, summary update, and audit log. |
| NFR-M08-PERF-005 | Correction request creation | p95 <= 1000 ms. |
| NFR-M08-PERF-006 | Correction approval | p95 <= 1500 ms including record update and summary recomputation. |
| NFR-M08-PERF-007 | Dashboard metrics | p95 <= 1500 ms for single-branch dashboard and <= 3000 ms for consolidated dashboard. |
| NFR-M08-PERF-008 | Report preview | p95 <= 2500 ms for 10,000-row source dataset with paginated result of 100 rows. |
| NFR-M08-PERF-009 | CSV export generation | <= 30 seconds for 50,000 rows as asynchronous export job. |
| NFR-M08-PERF-010 | Student attendance self-view | p95 <= 700 ms for current active enrollments. |

### 12.2 Capacity and Scalability Targets

| NFR ID | Dimension | Target |
|---|---|---|
| NFR-M08-CAP-001 | Concurrent attendance markers | Support at least 100 concurrent trainers/admin users marking attendance. |
| NFR-M08-CAP-002 | Branch count | Support at least 25 branches in branch-scoped queries without code changes. |
| NFR-M08-CAP-003 | Session roster size | Support 150 students per session with clear UI performance degradation messaging above 100 records. |
| NFR-M08-CAP-004 | Daily attendance records | Support 50,000 attendance record writes per business day. |
| NFR-M08-CAP-005 | Historical records | Support 5 years of attendance records with indexed reporting views. |
| NFR-M08-CAP-006 | Correction workload | Support 2,000 correction requests per month. |
| NFR-M08-CAP-007 | Export workload | Support 100 export jobs per business day with queued execution. |
| NFR-M08-CAP-008 | Dashboard refreshes | Support 500 dashboard reads per hour using indexed read models. |

### 12.3 Availability and Resilience Targets

| NFR ID | Capability | Target |
|---|---|---|
| NFR-M08-AVL-001 | Attendance marking availability | 99.5% monthly availability during business operating hours. |
| NFR-M08-AVL-002 | Read-only attendance view availability | 99.7% monthly availability. |
| NFR-M08-AVL-003 | Recovery Time Objective | RTO <= 4 hours for Attendance-owned tables. |
| NFR-M08-AVL-004 | Recovery Point Objective | RPO <= 15 minutes where database PITR is enabled; otherwise latest verified backup window. |
| NFR-M08-AVL-005 | Graceful degradation | If notifications fail, attendance marking must still complete and notification failure must be logged. |
| NFR-M08-AVL-006 | Export failure isolation | Export job failure must not affect marking or correction workflows. |
| NFR-M08-AVL-007 | Audit failure behavior | Sensitive mutation must roll back if audit persistence fails. |

### 12.4 Usability Targets

| NFR ID | Requirement | Target |
|---|---|---|
| NFR-M08-UX-001 | Bulk marking speed | Trainer can mark a 30-student roster in <= 2 minutes using keyboard and bulk actions. |
| NFR-M08-UX-002 | Mobile responsiveness | Trainer marking screen must be usable on tablet widths >= 768 px. |
| NFR-M08-UX-003 | Form feedback | Validation errors must appear inline and in a top summary after submit. |
| NFR-M08-UX-004 | Unsaved changes | Navigation away from dirty attendance form must trigger confirmation. |
| NFR-M08-UX-005 | Bilingual display | English LTR and Arabic RTL layouts must be supported without truncating key attendance fields. |
| NFR-M08-UX-006 | Accessibility | Interactive controls must be keyboard accessible and screen-reader labelled. |
| NFR-M08-UX-007 | Empty states | Empty roster, no sessions, no corrections, and no reports must have clear guidance. |
| NFR-M08-UX-008 | Loading states | Roster and dashboards must show skeleton loaders during fetches above 300 ms. |

### 12.5 Compliance and Audit Targets

| NFR ID | Requirement | Target |
|---|---|---|
| NFR-M08-COMP-001 | Audit completeness | 100% of sensitive state changes must have corresponding audit log entries. |
| NFR-M08-COMP-002 | Soft delete compliance | 0 hard deletes through application services. |
| NFR-M08-COMP-003 | Data retention | Attendance operational records retained for minimum 5 years unless ASTI retention policy states longer. |
| NFR-M08-COMP-004 | Export traceability | 100% of exports must include actor, branch scope, filter criteria, row count, and timestamp audit. |
| NFR-M08-COMP-005 | Correction traceability | Every corrected attendance status must link to correction request or admin override reason. |
| NFR-M08-COMP-006 | Branch isolation | Automated authorization tests must cover cross-branch read and mutation denial. |
| NFR-M08-COMP-007 | Oman business time | Attendance business date must render in Oman GST UTC+4 on UI, reports, and PDF exports. |

### 12.6 Maintainability Targets

| NFR ID | Requirement | Target |
|---|---|---|
| NFR-M08-MNT-001 | Package boundary | Attendance domain logic must live in `packages/attendance`; UI shell may call application services only. |
| NFR-M08-MNT-002 | Type safety | All API payloads must use Zod schemas and inferred TypeScript DTOs. |
| NFR-M08-MNT-003 | Test coverage | Domain rule unit tests >= 85%; critical state transition tests = 100%. |
| NFR-M08-MNT-004 | Migration safety | New non-null columns must be introduced with backfill-safe migrations. |
| NFR-M08-MNT-005 | Configuration-driven thresholds | Low-attendance thresholds must be configurable through rules, not hardcoded in UI. |
| NFR-M08-MNT-006 | Observability | Every mutation route must emit structured logs, metrics, and trace spans. |

---

## 13. API Security Requirements

### 13.1 API Request Protections

| Protection | Requirement |
|---|---|
| CSRF protection | Required for cookie-authenticated Server Actions and POST/PUT/PATCH/DELETE requests. |
| Rate limiting | Mutating attendance endpoints must be rate-limited by user and branch. |
| Payload limit | Bulk marking payload must be capped by roster size and absolute request body size. |
| Schema validation | Zod validation must run before application service execution. |
| Error normalization | All thrown domain errors must map to structured application error responses. |
| Trace correlation | Every request must include or receive a correlation ID. |
| Replay guard | Bulk submit and correction approval must support idempotency keys. |

### 13.2 Rate Limit Targets

| Endpoint Type | Limit |
|---|---|
| Attendance roster read | 120 requests per user per 5 minutes. |
| Draft save | 60 requests per user per 5 minutes. |
| Submit attendance | 20 requests per user per 5 minutes. |
| Correction request | 30 requests per user per hour. |
| Correction approval/rejection | 60 requests per approver per hour. |
| Report preview | 30 requests per user per 5 minutes. |
| Export generation | 10 export jobs per user per hour. |
| Student self-view | 120 requests per student per 5 minutes. |

### 13.3 Error Response Security

Error responses must use this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERR_ATT_BRANCH_ACCESS_DENIED",
    "messageKey": "attendance.errors.branchAccessDenied",
    "message": "You do not have access to the selected branch attendance data.",
    "fieldErrors": [],
    "correlationId": "req_01HZXAMPLE000000000000000"
  }
}
```

Rules:

| Rule ID | Rule |
|---|---|
| ERRSEC-M08-001 | Do not include stack traces in API responses. |
| ERRSEC-M08-002 | Do not include SQL, Prisma query text, or raw database constraint names in API responses. |
| ERRSEC-M08-003 | Do not include student PII in error messages. |
| ERRSEC-M08-004 | Include `correlationId` in every error response. |
| ERRSEC-M08-005 | Field validation errors may include field names and localized message keys only. |

---

## 14. Secure UI Requirements

### 14.1 Permission-Based Rendering

| UI Element | Hide/Disable Rule |
|---|---|
| Attendance menu | Hide unless `attendance.menu` is granted. |
| Mark attendance button | Hide unless `attendance.record.mark` or `attendance.admin.mark` is granted. |
| Submit button | Disable if session is not in editable state or user lacks submit permission. |
| Reopen button | Hide unless `attendance.record.reopen` is granted. |
| Correction approval buttons | Hide unless `attendance.correction.approve` or `attendance.correction.reject` is granted. |
| Export button | Hide unless required export permission is granted. |
| Consolidated branch filter | Hide unless `attendance.report.consolidated` is granted. |
| Audit tab | Hide unless `attendance.audit.view` is granted. |
| Student remarks | Hide from student portal if marked internal-only by admin policy. |

### 14.2 Secure Client Behavior

| Requirement | Description |
|---|---|
| No hidden-trust | Hidden UI controls do not replace server authorization. |
| Dirty form protection | Warn before leaving unsaved attendance draft. |
| Stale data warning | If `version` mismatch occurs, show conflict message and reload option. |
| Sensitive copy protection | Do not provide bulk copy of PII fields outside authorized exports. |
| Local storage | Attendance roster data must not be persisted in browser local storage. |
| Autocomplete | Disable autocomplete on correction reason fields if they may contain sensitive operational text. |

---

## 15. Privacy and Data Retention

### 15.1 Retention Policy

| Data | Minimum Retention | Deletion Mode |
|---|---|---|
| Attendance sessions | 5 years | Soft delete only by authorized admin. |
| Attendance records | 5 years | Soft delete only; preserve audit. |
| Attendance corrections | 5 years | Soft delete only if created in error; approved/rejected corrections remain auditable. |
| Attendance alerts | 3 years | Soft delete after policy retention period. |
| Enrollment attendance summaries | Match enrollment retention | Recomputed if required; no hard delete. |
| Export files | 12–24 hours depending on export type | Secure object deletion from temporary storage. |
| Audit logs | According to Audit & Compliance policy; minimum 5 years recommended | Not deleted by Attendance module. |

### 15.2 Data Minimization

| Surface | Minimization Rule |
|---|---|
| Attendance marking roster | Display student name, student number, enrollment number, and status only; do not display Civil ID/passport by default. |
| Trainer dashboard | Display assigned session metrics and low attendance counts only for assigned branch/sessions. |
| Student portal | Display status, date, course, batch, session, and percentage only for self. |
| Reports | Include PII columns only when operationally necessary and permission-authorized. |
| Audit | Store IDs and status deltas; avoid full PII snapshots. |

---

## 16. Threat Model

### 16.1 Key Threats and Controls

| Threat | Impact | Control |
|---|---|---|
| Trainer marks attendance for another trainer’s session | False participation record | Trainer ownership guard and admin override audit. |
| Branch user reads another branch’s attendance | Data leakage | Server-side branch predicate on every query. |
| Student accesses another student’s attendance | Privacy breach | Student identity resolved from auth context only. |
| Attendance changed after submission without approval | Completion/certificate fraud | Reopen and correction workflow with audit. |
| Bulk submit duplicates records | Incorrect percentages | Unique constraints and idempotency key. |
| Hidden hard delete removes evidence | Compliance failure | Soft delete enforcement and audit logging. |
| Remarks contain sensitive PII | Privacy risk | Validation warnings/blocking and redaction from logs. |
| Export leaked through public URL | PII breach | Signed URL, short expiry, actor-bound access, audit. |
| Race condition during correction approval | Inconsistent summary | Transaction locks and version checks. |
| Report query overloads database | Availability degradation | Pagination, read views, indexes, export jobs for large datasets. |
| Unauthorized consolidated report | Cross-branch leakage | Separate consolidated report permission and scope resolver. |

---

## 17. NFR Validation Checklist

| Area | Validation Method | Acceptance Criteria |
|---|---|---|
| Branch isolation | Automated integration tests | Cross-branch reads and writes return `403 ERR_ATT_BRANCH_ACCESS_DENIED`. |
| Permission guards | API and UI tests | Each protected action requires documented permission. |
| Audit completeness | Transaction tests | Sensitive mutation creates audit log in same transaction. |
| Performance | Load tests | p95 targets met for roster load, save, submit, and dashboard views. |
| Concurrency | Parallel submission tests | One successful transition; stale request rejected with conflict error. |
| Export security | Security tests | Export URL expires and cannot be opened by another user. |
| Bilingual UX | Visual tests | English LTR and Arabic RTL render correctly. |
| Soft delete | Repository tests | Delete operations set flags and do not remove rows physically. |
| Data retention | Operational policy review | Temporary exports expire; operational rows retained. |
| Observability | Log/trace verification | Each request has correlation ID, structured logs, metrics, and traces. |

---

## 18. Implementation Guardrails

| Guardrail | Requirement |
|---|---|
| No direct Prisma access from UI components | UI must call Attendance application services or Server Actions only. |
| No business rule in React only | Domain validation must run on server. |
| No role-name checks | Check permission codes, not role labels. |
| No microservice assumptions | Keep Attendance inside modular monolith package boundary. |
| No hardcoded branch scope | Always resolve branch scope from auth context. |
| No duplicated learner lifecycle | Attendance records must attach to Enrollment through `enrollmentId`. |
| No completion computation inside Certificate | Attendance updates summary; Completion context evaluates eligibility. |
| No payment checks inside Attendance | Attendance may expose participation evidence only; payment validation belongs to Finance/Completion/Certificate flow. |

---

## 19. Production Readiness Criteria

The Attendance module is production-ready only when all of the following are true:

1. All Attendance APIs require authentication and permission guards.
2. All Attendance queries enforce server-side branch scoping.
3. Trainer marking is restricted to assigned or delegated sessions.
4. Student portal attendance view is self-only.
5. Attendance marking, submission, correction, approval, rejection, reopening, export, and rule changes are audited.
6. Soft delete is implemented for all Attendance-owned tables.
7. Attendance summary recomputation is transactional and deterministic.
8. Concurrent submission and correction race conditions are handled with locking or optimistic versioning.
9. Export links are signed, temporary, actor-bound, branch-scoped, and audited.
10. Logs redact PII and include correlation IDs.
11. Performance targets are validated with test data volumes matching expected ASTI production usage.
12. Bilingual LTR/RTL screens are validated for Admin, Trainer, and Student portal flows.
13. Runbooks in Part 11 are reviewed by engineering and operations teams.
14. Database backup and recovery procedures include Attendance-owned tables and audit dependencies.
