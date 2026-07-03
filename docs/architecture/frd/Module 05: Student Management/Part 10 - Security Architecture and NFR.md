# Part 10 - Security Architecture and NFR
## Module 5 – Student Management

## 1. Purpose

This document defines the **security architecture** and **non-functional requirements (NFRs)** for **Module 5 – Student Management**.

This module manages highly sensitive learner master data and therefore requires strong controls around:
- personally identifiable information (PII),
- identity deduplication,
- cross-branch isolation,
- auditability,
- secure exports,
- controlled merge and archive actions,
- portal-safe read-only data exposure.

This part is limited to the Student Management bounded context and its owned tables:
- `student_profiles`
- `student_status_history`
- `student_id_card_history`
- `student_duplicate_cases`
- `student_duplicate_case_items`
- `student_merge_logs`
- `student_export_logs`

It references but does not re-own shared identity, branch, admission, enrollment, document, or global audit tables.

---

## 2. Security Objectives

1. Prevent unauthorized disclosure of student PII.
2. Prevent cross-branch data leakage.
3. Ensure high-integrity duplicate detection and merge processing.
4. Ensure all sensitive actions are auditable and attributable.
5. Prevent unauthorized archival, restore, status change, ID card change, or export.
6. Ensure student and trainer portal views expose only the minimum necessary data.
7. Ensure data exports and sensitive report generation are governed and reviewable.
8. Ensure observability data does not leak raw sensitive values.
9. Maintain availability and acceptable latency for operational workflows.
10. Support recovery of owned records without violating soft-delete and audit rules.

---

## 3. Module-Specific Security Architecture

## 3.1 Data Classification

| Data Class | Examples in Module 5 | Protection Level |
|---|---|---|
| Restricted PII | Civil ID, passport number, visa number, full ID card number, date of birth | Highest |
| Confidential Personal Data | Student name, phone, email, nationality, joined date | High |
| Operational Sensitive Data | Duplicate cases, merge logs, export logs, archive reasons, audit summaries | High |
| Internal Business Metadata | Student number, branch assignment, creation source, lifecycle status | Medium |
| Non-sensitive Operational Metrics | Aggregate counts, widget totals, branch-level trends without raw PII | Medium / Low |

---

## 3.2 Identity and Access Controls

### Authentication
- All Admin Portal, Student Portal, and Trainer Portal access must be authenticated through the shared Identity & Access Management context.
- Trusted internal system actions must use service identity authentication.
- Session cookies or bearer tokens must be:
  - HttpOnly where cookie-based,
  - secure,
  - short-lived,
  - revocable.

### Authorization
Every request must pass all three checks:
1. **Authentication check**
2. **Permission check**
3. **Branch scope check**

Required examples:
- `student.read`
- `student.create`
- `student.update`
- `student.status.change`
- `student.archive`
- `student.restore`
- `student.idcard.manage`
- `student.duplicate.read`
- `student.duplicate.resolve`
- `student.merge`
- `student.export`
- `student.audit.read`
- `student.identity.unmasked.read`
- `student.portal.self.read`
- `student.trainer.roster.read`

### Branch Scope Enforcement
- Branch scope must be enforced **server-side only**, never delegated to the client.
- **Dynamic Scoping:** Student profile access is verified dynamically based on the student's active relationships. A user has visibility to a student profile if they have access to at least one branch containing a linked `Admission`, `Enrollment`, or `Lead` relationship for that student.
- Active branch context is not enough by itself; the branch must also be in the user’s assigned branch set.
- Consolidated reporting requires explicit consolidated permission.
- Out-of-scope record access should return:
  - concealed `404` for direct record fetches, or
  - `403` where explicit denial is preferred by policy.
- Cross-branch merges require special elevated permission and explicit validation.

---

## 3.3 PII Protection Strategy

### At-Rest Protection
The following fields must be protected as sensitive data:
- Civil ID
- Passport number
- Visa number
- Current ID card number
- Date of birth
- Email
- Phone

#### Recommended Protection Model
1. **Database encryption at rest** for the PostgreSQL volume.
2. **Application-layer field encryption** for the highest-risk identity fields:
   - `civil_id`
   - `passport_number`
   - `visa_number`
   - `id_card_number`
3. **Tokenization or deterministic hash columns** for duplicate detection and exact-match lookup where needed:
   - `civil_id_hash`
   - `passport_number_hash`
   - `visa_number_hash`
   - normalized `email_hash`
   - normalized `phone_hash`

#### Rationale
- Exact duplicate detection should not require exposing raw values in logs or broad query surfaces.
- Deterministic hashes allow equality checks while preserving field secrecy.
- Raw encrypted values should only be decrypted in tightly controlled application paths.

### In-Transit Protection
- TLS 1.2+ minimum for all user-facing and service-to-service traffic.
- HSTS enabled for web surfaces.
- Internal admin APIs must not allow plaintext transport.

### In-Use Protection
- Sensitive values must be masked by default in APIs, UI, logs, and exports unless the caller has explicit sensitive-data permission.
- Example masking:
  - Civil ID: partial masked
  - Passport number: partial masked
  - Visa number: partial masked
  - ID card number: masked except last 3–4 characters
  - Email: masked for most roles
  - Phone: partially masked in broad listings when not operationally required

---

## 3.4 Secure Duplicate Detection Architecture

Duplicate detection is a security-relevant function because false positives and false negatives can both create operational and privacy problems.

### Controls
1. Duplicate checks run **server-side** on create and identity-affecting update.
2. Duplicate scoring inputs should use normalized/hardened identity values.
3. Blocking duplicate cases must prevent student creation/update until resolution.
4. Duplicate case detail access requires dedicated permissions.
5. Duplicate workbench must not expose full raw identity values unless the caller has elevated sensitive-data permission.
6. Duplicate-case notifications must not include full raw identity numbers.

### Duplicate Risk Controls
- **False negative risk:** mitigated through multi-key matching and review-required thresholds.
- **False positive risk:** mitigated through human review workflow and case resolution logging.
- **Abuse risk:** duplicate-check endpoint should be rate-limited and heavily logged.

---

## 3.5 Secure Merge Architecture

Merge is one of the highest-risk actions in this module because it changes identity lineage and downstream references.

### Controls
1. Merge requires:
   - `student.merge`
   - `student.duplicate.resolve`
   - branch-scope validation for both source and survivor
2. Merge must be executed in a single transaction.
3. Merge must:
   - archive source student,
   - preserve merge log,
   - preserve audit trail,
   - reassign allowed downstream references,
   - never hard-delete records.
4. Merge confirmation must require:
   - explicit reason,
   - explicit source and survivor IDs,
   - optional typed confirmation in UI.
5. Merge logs must store:
   - who performed merge,
   - when,
   - survivor/source mapping,
   - reassigned counts,
   - field-level resolution snapshot.

### Failure Handling
- If any reassignment step fails, merge must roll back fully.
- Partial merge states are forbidden.
- Observability must emit merge failure counters and high-severity logs.

---

## 3.6 Soft Delete and Archival Security

### Controls
- No hard delete endpoint or batch hard delete job is permitted.
- Archive action must set:
  - `is_deleted = true`
  - `deleted_at`
  - `student_status = Archived`
- Restore must clear delete markers and add status history.
- Archived records remain:
  - auditable,
  - reportable where appropriate,
  - discoverable only by authorized users.
- Archived records cannot be edited directly until restored.

---

## 3.7 Audit and Non-Repudiation Controls

The following actions must always create audit events:
- student create
- student update
- status change
- archive
- restore
- ID card issue/reissue/revoke
- duplicate case create/resolve
- merge
- export request / completion / failure
- audit-view access where policy requires access logging

### Audit Content
Every critical audit event must capture:
- actor user ID
- actor display name snapshot if required
- branch context
- entity type
- entity ID
- action code
- timestamp
- old values (where applicable)
- new values (where applicable)
- reason
- request ID / correlation ID
- source IP where available
- user agent or service identity where appropriate

### Integrity
- Audit records must be append-only in the central Audit & Compliance context.
- Audit viewers should not be able to mutate audit data.
- Time synchronization is mandatory across services and nodes.

---

## 3.8 Secure Export Controls

Exports are a major data exfiltration risk.

### Controls
1. Export requires explicit `student.export`.
2. Sensitive identity inclusion requires `student.identity.unmasked.read`.
3. Sensitive export requires reason text.
4. Every export request must create an export log.
5. Large exports may be asynchronous.
6. Export download URLs must be:
   - signed,
   - short-lived,
   - single-user scoped if possible,
   - revoked on expiry.
7. Files stored in object storage must use private buckets/containers.
8. Export files must not remain indefinitely available; retention must be controlled.

### Recommended Retention
- generated export files: 7 days
- export logs: permanent or compliance-defined retention minimum 2 years

---

## 3.9 Portal Data Minimization

### Student Portal
- Self-only access
- No browsing or searching across students
- No duplicate, merge, archive, export, or audit access
- No institute-wide metrics

### Trainer Portal
- Roster-context only
- No branch-wide list access
- No duplicate, merge, archive, export, or audit access
- No full identity disclosure unless required by policy

---

## 3.10 Secure Logging Rules

Application logs must never contain raw:
- Civil ID
- passport number
- visa number
- current full ID card number
- full date of birth unless truly required in secured internal logs
- unmasked email/phone unless debug-level secure environment exception is explicitly approved

Logging should use:
- masked values,
- hashed values,
- or internal record IDs.

---

## 3.11 Secrets and Key Management

- Encryption keys must be stored in managed secrets infrastructure.
- Keys must never be stored in code or static config files.
- Key rotation must be supported.
- Distinct keys recommended for:
  - application secrets,
  - field encryption,
  - signed URL generation,
  - JWT/session signing.

---

## 3.12 Rate Limiting and Abuse Controls

Recommended rate limits:
- student lookup: 60 requests/minute per user
- duplicate check: 30 requests/minute per user
- export request: 10 requests/hour per user
- merge attempts: 10 requests/hour per user
- audit log access pages: 120 requests/minute per user

Triggered abuse responses:
- throttle response
- security warning logs
- optional user/session lock escalation by IAM policy

---

## 3.13 OWASP-Aligned Controls

1. Input validation on all API boundaries using Zod/domain validation.
2. Output encoding in UI.
3. CSRF protection for cookie-authenticated admin flows.
4. Strict server authorization for every endpoint.
5. Secure headers:
   - Content-Security-Policy
   - X-Content-Type-Options
   - Referrer-Policy
   - X-Frame-Options / frame-ancestors
6. Dependency scanning and vulnerability patching.
7. SQL injection prevention through ORM/query parameterization.
8. Protection against IDOR through combined permission + branch + contextual ownership checks.

---

## 4. Non-Functional Requirements

## 4.1 Performance Targets

### API Response Targets
Under normal operating load and indexed branch filters:

| Operation | Target | Max Acceptable |
|---|---:|---:|
| Student lookup | <= 500 ms | 1.5 s |
| Student detail read | <= 800 ms | 2.0 s |
| Student create direct | <= 1.5 s | 3.0 s |
| Student create from admission | <= 1.5 s | 3.0 s |
| Student update | <= 1.2 s | 2.5 s |
| Status change | <= 1.2 s | 2.5 s |
| Archive / restore | <= 1.2 s | 2.5 s |
| ID card issue / reissue | <= 1.2 s | 2.5 s |
| Duplicate-case detail | <= 1.0 s | 2.5 s |
| Merge request acceptance | <= 3.0 s | 8.0 s |
| Student list first page | <= 1.5 s | 3.0 s |
| Dashboard widget summary load | <= 2.0 s | 4.0 s |
| Report execution (standard filtered) | <= 3.0 s | 8.0 s |
| Export request acceptance | <= 2.0 s | 4.0 s |

### Batch/Heavy Operation Targets
| Operation | Target |
|---|---:|
| Large export generation up to 10k rows | <= 2 minutes |
| Duplicate backlog report across multiple branches | <= 5 seconds |
| Materialized-view refresh | <= 5 minutes from source commit for analytical freshness |

---

## 4.2 Capacity and Concurrent Usage Targets

| Metric | Target |
|---|---:|
| Concurrent admin users on Student Management module | 150 |
| Concurrent student portal self-views | 500 |
| Concurrent trainer quick-view requests | 200 |
| Sustained read requests per second | 80 RPS |
| Sustained write requests per second | 20 RPS |
| Peak export requests per hour | 200 |
| Peak duplicate checks per minute | 120 |

These are module-specific planning targets for a modular monolith deployment and should be revisited at scale testing time.

---

## 4.3 Availability Targets

| Service Surface | Target Availability |
|---|---:|
| Admin student read APIs | 99.9% monthly |
| Admin student write APIs | 99.9% monthly |
| Student portal self-view APIs | 99.9% monthly |
| Trainer roster quick view | 99.9% monthly |
| Reporting read models | 99.5% monthly |
| Export generation pipeline | 99.5% monthly |

### Degraded Mode Expectations
If analytics/read models are stale:
- transactional reads and writes must remain operational,
- dashboards may show “data delayed” banner,
- exports may fall back to slower transactional query paths only if safe and bounded.

---

## 4.4 Scalability Targets

1. The module must scale vertically within the modular monolith first.
2. Reporting read models/materialized views should offload heavy aggregate reads from primary transactional queries.
3. Pagination and server-side filtering are mandatory for large result sets.
4. Exports larger than configured thresholds must run asynchronously.
5. Duplicate scoring must remain performant via indexed normalized/hash columns.

Target data volume planning:
- `student_profiles`: up to 2 million records over lifecycle
- `student_status_history`: up to 10 million rows
- `student_id_card_history`: up to 5 million rows
- `student_duplicate_cases`: up to 1 million rows
- `student_duplicate_case_items`: up to 5 million rows
- `student_merge_logs`: up to 500,000 rows
- `student_export_logs`: up to 2 million rows

---

## 4.5 Usability Targets

1. Dense admin list pages must remain usable at 1366px width.
2. First meaningful UI paint for module pages should occur within 2 seconds on corporate broadband under normal conditions.
3. Form validation errors must appear inline and in summary form.
4. Keyboard navigation must be supported.
5. RTL/LTR switching must preserve layout integrity.
6. User must not need more than:
   - 3 clicks to open student detail from list,
   - 5 clicks to resolve a duplicate case after opening the workbench,
   - 4 clicks to issue or reissue an ID card from detail page.

---

## 4.6 Reliability Targets

1. All write operations must be transactionally safe.
2. Merge operations must be all-or-nothing.
3. Numbering generation must avoid duplicate student numbers under concurrent load.
4. Duplicate-case creation must be idempotent per request where request replay protections apply.
5. Export log creation must not be skipped even if export generation later fails.
6. Audit generation must be highly reliable and retriable if asynchronous propagation is used.

---

## 4.7 Backup and Recovery Targets

For owned tables:
- RPO target: **<= 15 minutes**
- RTO target: **<= 2 hours** for module-specific table recovery
- Soft-deleted data recovery should be possible without relying on point-in-time restore whenever record-level recovery can be achieved safely.

---

## 4.8 Compliance Targets

1. PII handling must meet ASTI internal policy and applicable Oman data-protection obligations.
2. Audit retention for security-sensitive student actions should be no less than 2 years unless policy mandates longer.
3. Export logs and merge logs should be retained for compliance review.
4. Access to sensitive identity values must be role- and permission-restricted.
5. Notification payloads must avoid unnecessary raw PII disclosure.

---

## 4.9 Monitoring and Alerting NFRs

1. API error rate alert when 5xx > 2% over 5 minutes.
2. Duplicate-check blocking-case spike alert when count exceeds branch baseline threshold.
3. Merge failure alert on any failed merge transaction.
4. Export failure alert when failed exports exceed 5 in 15 minutes.
5. Slow query alert for student list or detail queries above target thresholds.
6. Audit write failure alert on any persistent audit propagation failure.

---

## 4.10 Data Retention and Purging Targets

| Data Set | Retention Guidance |
|---|---|
| Student master records | Retain indefinitely unless legal policy changes |
| Status history | Retain indefinitely or compliance minimum |
| ID card history | Retain indefinitely or compliance minimum |
| Duplicate cases | Retain indefinitely for data lineage and compliance |
| Merge logs | Retain indefinitely |
| Export logs | Minimum 2 years |
| Generated export files | 7 days unless policy changes |

No retention rule may violate soft-delete, audit, or legal retention obligations.

---

## 5. Security Test Requirements

The following must be verified before release:
1. Unauthorized user cannot access any admin endpoint.
2. In-scope user cannot access out-of-scope branch records.
3. Sensitive fields are masked by default.
4. Sensitive export without elevated permission fails.
5. Merge cannot proceed with stale version or out-of-scope records.
6. Duplicate check does not leak raw identity values in logs.
7. Archived records cannot be edited directly.
8. Audit entries are created for all critical operations.
9. Signed export URLs expire correctly.
10. Student portal cannot enumerate other students.

---

## 6. Final Module-Specific Notes

1. Payment auditing and certificate signing are not owned by this module and therefore are out of scope except where student records are referenced in downstream flows.
2. The dominant security risks in Module 5 are:
   - PII disclosure,
   - duplicate-merge corruption,
   - cross-branch leakage,
   - unauthorized exports,
   - insufficient auditability.
3. All NFR targets should be validated during:
   - performance testing,
   - security testing,
   - branch-scope authorization testing,
   - failover and recovery testing.
