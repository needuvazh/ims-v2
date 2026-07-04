# Part 10 - Security Architecture and NFR

## Module 12 – Fee, Billing & Receivables Management

## 1. Purpose

This document defines security architecture and non-functional requirements for Module 12 – Fee, Billing & Receivables Management. The module is financially sensitive and therefore requires defense in depth across authentication, authorization, branch isolation, transaction integrity, auditability, data protection, secure document delivery, availability, performance, scalability, accessibility, localization, and recovery.

The module is implemented inside the ASTI IMS modular monolith. Security controls are enforced at application-service and persistence boundaries; they are not delegated to UI visibility alone. Finance transactional decisions must use authoritative transactional data and must not depend on stale reporting projections.

## 2. Security Objectives

| ID | Objective | Requirement |
|---|---|---|
| SEC-FBR-001 | Confidentiality | Prevent unauthorized disclosure of student financial data, corporate billing data, payment references, refund information, credit exposure, exports, and audit history. |
| SEC-FBR-002 | Integrity | Prevent unauthorized modification, duplicate posting, partial posting, silent deletion, and arithmetic corruption of financial records. |
| SEC-FBR-003 | Availability | Keep invoice, collection, payment-validation, receivable, and credit-validation functions available within defined service targets. |
| SEC-FBR-004 | Accountability | Every sensitive financial action must be attributable to an authenticated human actor or approved internal service identity. |
| SEC-FBR-005 | Non-repudiation | Posted payments, issued receipts, refund decisions, refund execution, invoice issue/cancel actions, and credit-rule changes must leave immutable audit evidence. |
| SEC-FBR-006 | Least privilege | Users and internal callers receive only the minimum action, menu, report, export, and branch scope needed for assigned duties. |
| SEC-FBR-007 | Separation of duties | Refund request, approval, and execution must enforce maker-checker-executor controls where roles are separated. |
| SEC-FBR-008 | Data minimization | Store only payment metadata required for reconciliation and audit; never store raw card PAN, CVV/CVC, PIN, track data, or authentication secrets. |
| SEC-FBR-009 | Branch isolation | Prevent cross-branch data access through entity reads, mutations, search filters, aggregate counts, dashboards, reports, exports, and error-message leakage. |
| SEC-FBR-010 | Recoverability | Support tested backup, point-in-time recovery, reconciliation, and controlled repair without deleting source financial history. |

## 3. Security Trust Boundaries

```text
Browser / Portal Client
        |
        | TLS 1.2+
        v
Next.js Application Boundary
  - Session validation
  - CSRF protection for cookie-authenticated mutations
  - Request validation
  - Permission evaluation
  - Branch-scope resolution
        |
        v
Finance Application Services
  - Aggregate command authorization
  - Domain invariants
  - Idempotency
  - Optimistic concurrency
  - Audit context
        |
        v
Finance Domain + Prisma Repository Layer
  - Scoped query predicates
  - Transaction boundaries
  - Row constraints / unique keys
        |
        v
PostgreSQL
  - Encryption at rest
  - Least-privilege DB role
  - Backups / PITR

Internal bounded contexts
  Enrollment / Completion / Certificate / Corporate Training
        |
        | typed in-process application ports
        v
Finance Application Services

Reporting read models
        |
        | read-only, branch-filtered
        v
Dashboards / Reports / Exports
```

### 3.1 Trust Rules

1. Browser input is untrusted regardless of client-side validation.
2. Branch IDs supplied by clients are filters only; they never grant access.
3. Internal module calls are authenticated through trusted application interfaces and still receive explicit caller identity, purpose, and correlation context.
4. Reporting projections are not authoritative sources for payment-validation, corporate credit blocking, invoice outstanding balance, or refund eligibility.
5. Database access is restricted to application identities; direct production table access by ordinary staff is prohibited.
6. Operational repair tools require elevated break-glass access and mandatory incident/change references.

## 4. Authentication Architecture

### 4.1 Human Authentication

1. Every private Finance route requires an authenticated ASTI IMS session.
2. Session validation must execute server-side before Finance application-service invocation.
3. Sensitive actions require a currently active user account and active branch assignment.
4. Account suspension or branch-access revocation must take effect on the next authorization evaluation; cached authorization decisions must not survive longer than 5 minutes.
5. For high-risk actions such as refund approval, refund execution, credit-rule supersession, and high-value manual payment posting, the platform should support step-up authentication when the IAM context provides it.
6. Session cookies must be `HttpOnly`, `Secure`, and use an appropriate `SameSite` policy.
7. Cookie-authenticated mutation routes must implement CSRF protection through framework-supported origin verification and anti-CSRF controls.

### 4.2 Internal Caller Authentication

Trusted internal calls from Completion, Certificate, Corporate Training, and Reporting must use typed in-process application ports. Each call context must include:

```ts
type InternalCallContext = {
  callerModule: "completion" | "certificate" | "corporate-training" | "reporting";
  operation: string;
  correlationId: string;
  causationId?: string;
  requestedAt: string;
  branchContext?: string[];
};
```

Internal modules must not access Finance-owned Prisma models directly.

## 5. Authorization and Branch Isolation

### 5.1 Authorization Decision Model

An operation is allowed only when all applicable conditions are true:

```text
Authenticated user
AND active user status
AND required action/report/export permission
AND requested entity belongs to effective branch set
AND entity-specific ownership restriction passes
AND workflow separation-of-duty rule passes
AND state transition is valid
```

### 5.2 Effective Branch Set

The server calculates the authorized set from IAM-owned branch assignments:

```text
effectiveBranchSet = directlyAssignedBranches

if canViewChildBranches = true:
    effectiveBranchSet += authorized descendants of assigned parent branches

if consolidated report requested:
    require finance.report.consolidated
    AND require IAM canViewConsolidated = true
    use only branches in effectiveBranchSet
```

A client-provided `branchId` or `branchIds` parameter is intersected with the effective set. An empty intersection returns a non-disclosing authorization response.

### 5.3 Scope Rules by Finance Entity

| Entity / Data Set | Scope Predicate |
|---|---|
| Invoice | `invoice.branchId IN effectiveBranchSet` |
| InvoiceLineItem | parent invoice branch in scope; consolidated corporate invoice line drill-down also requires line source branch in authorized scope where detail is branch-sensitive |
| InstallmentPlan | parent invoice branch in scope |
| Installment | parent plan → invoice branch in scope |
| Payment | `payment.branchId IN effectiveBranchSet` and parent invoice in scope |
| PaymentAllocation | payment and target invoice/plan branch checks must pass |
| Receipt | parent payment branch in scope |
| Refund | refund branch and referenced invoice/payment branch in scope |
| Receivable | receivable branch and parent invoice branch in scope |
| CorporateCreditRule | visibility limited to branches/accounts covered by actor permission and account-management scope |
| Dashboard aggregates | source rows filtered before aggregation |
| Exports | identical scope predicate to on-screen report plus explicit `finance.export` |
| Audit | event target branch in scope plus `finance.audit.read` |

### 5.4 Anti-Leakage Requirements

1. Unauthorized entity IDs must not reveal whether a record exists in another branch.
2. Counts, totals, percentages, rankings, aging buckets, and report denominators must be calculated only after branch filtering.
3. Autocomplete, selectors, and search suggestions must use scope-filtered endpoints.
4. Export jobs must serialize only the authorization snapshot resolved at request time; scope must be revalidated before download.
5. Pagination metadata must not include totals from unauthorized branches.
6. Error text must not expose foreign-branch customer names, invoice numbers, payment numbers, or amounts.

## 6. Fine-Grained Permission Enforcement

Permissions defined in Part 6 are enforced at three layers:

1. **Route / Server Action adapter:** reject missing permission before application command execution.
2. **Application service:** re-check required capability and branch context to prevent adapter bypass.
3. **Query repository:** always include branch predicates and ownership predicates.

Sensitive permission examples:

| Operation | Required Permission | Additional Rule |
|---|---|---|
| Issue invoice | `finance.invoice.issue` | Invoice must be in authorized branch and Draft state. |
| Record payment | `finance.payment.record` | Invoice in scope; method-specific validation; idempotency required. |
| Request refund | `finance.refund.request` | Actor may not approve own request. |
| Approve refund | `finance.refund.approve` | Maker-checker rule and approval state enforced. |
| Execute refund | `finance.refund.execute` | Approved state and executor authorization required. |
| Manage credit rule | `finance.credit.manage` | Effective-date overlap and account scope checks. |
| Consolidated reporting | `finance.report.consolidated` | IAM `canViewConsolidated=true` also mandatory. |
| Export | `finance.export` | Underlying report/read permission also required. |
| Audit search | `finance.audit.read` | Scope-limited audit results only. |

## 7. Financial Transaction Integrity Controls

### 7.1 Atomicity

The following operations must use a single PostgreSQL transaction:

- invoice issue and receivable creation;
- installment plan and installment schedule creation;
- payment posting, allocations, invoice balance update, installment balance update, receivable reconciliation, receipt creation, audit write, and domain-event registration;
- refund decision plus approval-history entry;
- refund execution plus financial balance reconciliation and audit write;
- corporate credit-rule supersession: end-date current rule and create successor.

Partial success is forbidden.

### 7.2 Idempotency

Payment posting and other externally retryable commands must use an idempotency record or equivalent durable unique operation key.

Required behavior:

1. Key scope includes operation type and authenticated principal/caller identity.
2. First request stores request hash, status, result reference, and timestamps.
3. Retry with identical request hash returns the original result.
4. Retry with same key but different payload returns `ERR_FIN_IDEMPOTENCY_CONFLICT`.
5. In-progress duplicate requests must not execute a second transaction.
6. Retention target for payment idempotency records: minimum 90 days, subject to final organizational retention policy.

### 7.3 Optimistic Concurrency

Mutable aggregate commands must include `expectedVersion`.

```text
UPDATE finance_invoice
SET version = version + 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = :actorId
WHERE id = :invoiceId
  AND version = :expectedVersion
  AND is_deleted = false
```

Zero affected rows return `409 ERR_FIN_CONCURRENT_MODIFICATION`.

### 7.4 Arithmetic Integrity

1. Monetary values use PostgreSQL `numeric(18,3)` and Prisma `Decimal` for OMR-compatible precision.
2. JavaScript floating-point arithmetic must not be used for persisted financial calculations.
3. Line formulas and invoice totals must be recomputed server-side from validated source values.
4. Rounding must use the Finance domain rounding policy consistently at line and total boundaries.
5. Payments cannot make ordinary invoice outstanding balances negative.
6. Refund cumulative amount cannot exceed eligible settled amount after prior executed refunds.
7. Installment allocations cannot exceed installment outstanding amount.
8. Corporate credit decisions use authoritative outstanding plus committed amount and proposed enrollment value.

## 8. Payment Data Security

### 8.1 Prohibited Data

The module must never persist or log:

- full primary account number (PAN);
- CVV/CVC/CID;
- PIN or encrypted PIN block;
- magnetic-stripe track data;
- online banking credentials;
- OTP values;
- payment-gateway secret keys.

### 8.2 Allowed Payment Metadata

The module may store:

- payment method;
- payment number;
- amount and currency;
- payment date;
- bank-transfer reference;
- cheque number and bank name where operationally required;
- masked card reference such as last four digits only when supplied by an approved processor;
- gateway/provider transaction reference in future integrations;
- receiving user;
- reconciliation status;
- branch context.

### 8.3 Encryption

1. TLS 1.2 or higher is mandatory for all network access.
2. Production database volumes, backups, snapshots, and object-storage documents must be encrypted at rest using platform-managed keys.
3. Highly sensitive identifiers inherited from Person/Party, such as Civil ID or passport data, must not be copied into Finance tables or exports unless a separately approved report requires them.
4. Payment reference numbers that are considered sensitive by policy should use application-level envelope encryption or platform KMS-backed encryption where searchability is not required.
5. Encryption keys must be rotated according to infrastructure policy without requiring application data rewrites where envelope encryption is used.

## 9. Receipt, Invoice, and Export Document Security

1. Generated PDF documents must be served through authenticated, short-lived access URLs or authenticated streaming endpoints.
2. Object-storage buckets must not allow anonymous public listing or public read access.
3. Signed URLs, when used, should expire within 5 minutes for interactive download unless operational requirements define a shorter value.
4. Download authorization must be checked before generating the signed URL.
5. Export files must include generated-by, generated-at, branch scope, filter summary, and report title metadata.
6. Temporary export objects must expire automatically within 24 hours unless an approved retention policy specifies a shorter period.
7. Export filenames must not include Civil ID, passport number, full card data, or other sensitive identifiers.
8. PDF generation must escape user-controlled text and disallow active scripts or embedded external content.
9. Receipt numbers and invoice numbers are business identifiers, not authentication secrets; possession of a number alone must never grant access.
10. Certificate digital signing is owned by the Certificate context and is not a Finance responsibility. Finance only provides authoritative payment-validation results to Certificate and Completion callers.

## 10. PII and Privacy Controls

### 10.1 Data Minimization

Finance stores references to Party-owned or Enrollment-owned entities rather than duplicating personal identity attributes.

### 10.2 Display Masking

| Data | Default UI / Report Behavior |
|---|---|
| Student name | Visible where business operation requires it. |
| Student number | Visible to authorized operational users. |
| Email | Mask in list views unless contact action requires full value. |
| Phone | Mask in list views unless contact action requires full value. |
| Civil ID / Passport | Not included in Finance screens or exports by default. |
| Bank reference | Show full only to authorized Finance users; mask in broadly visible summaries. |
| Cheque number | Restricted to Finance operational detail. |
| Corporate credit exposure | Restricted to credit/report permissions and account scope. |

### 10.3 Logging Redaction

Structured logs must redact:

- `authorization` headers;
- session cookies;
- CSRF tokens;
- payment references where full value is not required;
- phone/email values except approved masked form;
- document URLs containing signatures or temporary tokens;
- request/response payload fields classified as sensitive.

## 11. Audit Architecture

### 11.1 Mandatory Audited Actions

| Action | Audit Requirement |
|---|---|
| Invoice created/updated/issued/cancelled | Actor, branch, invoice ID, prior/new state, reason where applicable. |
| Installment plan created | Plan ID, invoice ID, schedule summary, actor. |
| Payment recorded | Payment ID, invoice ID, amount, method, actor, branch; no prohibited card data. |
| Payment allocation changed by controlled repair | Before/after allocation values, incident/change reference, privileged actor. |
| Receipt generated/re-rendered | Receipt ID, payment ID, locale, actor/caller. |
| Refund requested | Refund ID, amount, reason, requester. |
| Refund approved/rejected | Decision, approver, remarks, timestamp. |
| Refund executed | Executor, execution reference, amount, resulting reconciliation status. |
| Credit rule created/superseded | Before/after rule, effective period, actor. |
| Corporate credit validation | Account, proposed value, exposure summary, decision, caller module. |
| Finance export requested/downloaded | Report code, filters hash, branch scope, row count, actor. |
| Permission/branch denial | Principal, attempted capability, target type, correlation ID; avoid disclosing foreign entity facts. |

### 11.2 Audit Record Requirements

Each audit record must include:

```text
id
entityType
entityId
action
oldValue
newValue
performedBy
performedAt
ipAddress
reason
correlationId
branchId
sourceModule
```

Audit data is owned by Audit & Compliance; Finance emits or invokes the required audit recording boundary synchronously for critical mutations so a mutation cannot commit without required audit evidence.

### 11.3 Audit Immutability

1. Application roles must not update or delete committed audit entries.
2. Audit corrections are appended as new corrective audit entries.
3. Audit export requires dedicated permission.
4. Clock source must be synchronized across application and database hosts.

## 12. Secure Error Handling

1. Validation errors return field-specific safe messages without stack traces.
2. Authentication failure returns 401.
3. Authorization and foreign-branch access return a non-disclosing 403 response.
4. Missing in-scope records return 404.
5. Concurrency conflicts return 409 with `ERR_FIN_CONCURRENT_MODIFICATION`.
6. Idempotency conflicts return 409 with `ERR_FIN_IDEMPOTENCY_CONFLICT`.
7. Database/internal failures return a generic 500 error with correlation ID.
8. Logs contain exception details only in secure server logging systems.
9. Error response bodies must never contain SQL, Prisma query internals, file-system paths, secrets, or stack traces.

## 13. Abuse Prevention and Rate Controls

| Endpoint Category | Control Target |
|---|---|
| Read/search APIs | 120 requests/minute/user as an initial platform limit, with pagination caps. |
| Payment posting | 30 requests/minute/user plus idempotency; alert on abnormal duplicate/conflict rates. |
| Refund mutations | 20 requests/minute/user; all attempts audited. |
| Credit validation internal call | 300 requests/minute/module instance with circuit protection against pathological loops. |
| Export creation | Maximum 5 concurrent export jobs/user and 20/hour/user. |
| Document downloads | 120 requests/minute/user; signed URL expiry enforced. |

Limits are initial production guardrails and may be tuned from observed load. A rate limit must not bypass domain idempotency or transaction controls.

## 14. Dependency Security and Supply Chain

1. Dependency lockfiles must be committed and immutable in CI builds.
2. CI must run dependency vulnerability scanning and secret scanning.
3. Critical vulnerabilities in internet-facing or financial transaction paths block production release until mitigated or formally risk-accepted.
4. Production images/build artifacts must be reproducible from reviewed source commits.
5. CI/CD identities must use least privilege and short-lived credentials where supported.
6. Prisma migrations require code review and deployment approval.
7. Production secrets must be supplied through the approved secrets manager and never committed to source control.

## 15. Non-Functional Requirements Overview

### 15.1 Performance Targets

Measurements exclude client network latency and are measured server-side at the application boundary under normal production load.

| NFR ID | Capability | Target |
|---|---|---|
| NFR-FBR-PERF-001 | Invoice detail read | p95 ≤ 2.0 s; p99 ≤ 4.0 s. |
| NFR-FBR-PERF-002 | Payment detail read | p95 ≤ 2.0 s; p99 ≤ 4.0 s. |
| NFR-FBR-PERF-003 | Standard paginated list/search | p95 ≤ 3.0 s for indexed supported filters, page size ≤100. |
| NFR-FBR-PERF-004 | Payment posting transaction | p95 ≤ 3.0 s; p99 ≤ 6.0 s, excluding third-party gateway processing which is out of current scope. |
| NFR-FBR-PERF-005 | Invoice issue transaction | p95 ≤ 3.0 s for ≤100 line items; hard line-count limit governed by validation rules. |
| NFR-FBR-PERF-006 | Corporate credit validation | p95 ≤ 750 ms; p99 ≤ 1.5 s against authoritative indexed transactional data. |
| NFR-FBR-PERF-007 | Enrollment payment validation | p95 ≤ 500 ms; p99 ≤ 1.0 s. |
| NFR-FBR-PERF-008 | Dashboard initial data | p95 ≤ 3.0 s from current read models. |
| NFR-FBR-PERF-009 | Standard branch report query | p95 ≤ 5.0 s for up to 12 months and supported indexed filters. |
| NFR-FBR-PERF-010 | PDF invoice/receipt rendering | p95 ≤ 8.0 s for interactive documents. |
| NFR-FBR-PERF-011 | CSV/XLSX export request acceptance | ≤ 2.0 s to validate and register export; generation may run as an internal background job owned by the modular monolith jobs infrastructure. |

### 15.2 Capacity and Concurrency Targets

Initial production sizing targets:

| NFR ID | Target |
|---|---|
| NFR-FBR-CAP-001 | Support 300 concurrent authenticated Admin Portal users across the IMS with at least 100 concurrent Finance-active users. |
| NFR-FBR-CAP-002 | Support 50 concurrent payment-posting requests without duplicate postings or lost updates. |
| NFR-FBR-CAP-003 | Support 20 concurrent invoice-issue transactions for distinct invoices. |
| NFR-FBR-CAP-004 | Support 10 concurrent report/export generation jobs without degrading payment p95 above 4 seconds. |
| NFR-FBR-CAP-005 | Support at least 10 million invoice-line records and 10 million payment-allocation records with index-backed operational queries and archival/partition review before exceeding tested capacity. |
| NFR-FBR-CAP-006 | All list endpoints cap interactive page size at 100 rows. |

These are acceptance targets, not a mandate for microservices. Scaling remains within the modular-monolith deployment model through stateless application replicas, connection-pool tuning, database indexing, and reporting projections.

### 15.3 Availability Targets

| NFR ID | Target |
|---|---|
| NFR-FBR-AVL-001 | Monthly availability target: ≥99.9%, excluding approved maintenance windows. |
| NFR-FBR-AVL-002 | Payment posting, refund execution, and credit validation fail closed if authoritative transactional storage is unavailable. |
| NFR-FBR-AVL-003 | Read-only reports may serve the last successfully refreshed projection when marked with `dataAsOf` and when transactional actions do not depend on it. |
| NFR-FBR-AVL-004 | A single report/export failure must not prevent payment or invoice operations. |
| NFR-FBR-AVL-005 | Application health endpoints must distinguish liveness from readiness. |

### 15.4 Reliability and Consistency Targets

| NFR ID | Target |
|---|---|
| NFR-FBR-REL-001 | No duplicate payment from identical idempotency key and payload. |
| NFR-FBR-REL-002 | Financial command transactions are atomic; no partial payment/allocation/receipt state is permitted. |
| NFR-FBR-REL-003 | Invoice, payment, refund, receivable, and credit calculations must be deterministic and decimal-safe. |
| NFR-FBR-REL-004 | Reconciliation exceptions must be detectable by scheduled controls within 15 minutes for operational data and by daily full reconciliation. |
| NFR-FBR-REL-005 | Read-model refresh failures must not alter transactional source data. |
| NFR-FBR-REL-006 | Domain event handlers executed in-process must be idempotent where retryable. |

### 15.5 Backup and Recovery Targets

| NFR ID | Target |
|---|---|
| NFR-FBR-DR-001 | Transactional database Recovery Point Objective (RPO): ≤15 minutes. |
| NFR-FBR-DR-002 | Transactional database Recovery Time Objective (RTO): ≤4 hours for a regional/database restoration scenario. |
| NFR-FBR-DR-003 | Reporting read models may be rebuilt from transactional data; RTO ≤8 hours for full read-model rebuild unless a tested production benchmark sets a lower target. |
| NFR-FBR-DR-004 | Backup restoration test at least quarterly. |
| NFR-FBR-DR-005 | No recovery process may resolve inconsistency by deleting posted financial transactions. |

### 15.6 Scalability Targets

1. Application nodes must be stateless with respect to user sessions or use the shared platform session mechanism.
2. Finance services must support horizontal application scaling without duplicate number issuance or payment posting.
3. Numbering-series allocation must use transactional locking or another database-safe atomic allocation strategy.
4. Database indexes defined in Part 4 must be monitored for bloat and query effectiveness.
5. Reporting workloads must use views/materialized views/snapshots defined in Part 8 where appropriate.
6. Long-running exports must run outside interactive request processing after request validation and authorization snapshot capture.
7. No external broker or microservice is required for scaling this module.

### 15.7 Usability Targets

| NFR ID | Target |
|---|---|
| NFR-FBR-USA-001 | Common payment recording workflow completable by trained Accountant in ≤90 seconds excluding cash counting or external banking steps. |
| NFR-FBR-USA-002 | Invoice search returns actionable first results within the search performance target and preserves filters in URL state. |
| NFR-FBR-USA-003 | Validation errors identify exact field and correction guidance without losing valid form input. |
| NFR-FBR-USA-004 | Destructive or irreversible actions require explicit confirmation and show business identifier, amount, and state. |
| NFR-FBR-USA-005 | English and Arabic labels must not be mixed within the same selected locale except immutable business identifiers and accepted finance abbreviations. |

### 15.8 Accessibility Targets

1. Target WCAG 2.2 AA for Finance screens.
2. All interactive controls must be keyboard accessible.
3. Focus order must follow visual reading order in both LTR and RTL layouts.
4. Validation errors must be announced to assistive technologies and associated with fields.
5. Charts must provide accessible text/table equivalents for core values.
6. Color must not be the only signal for invoice, overdue, refund, or credit status.
7. Minimum target size and contrast requirements must follow WCAG 2.2 AA expectations.

### 15.9 Localization and Timezone Targets

1. Default business timezone: `Asia/Muscat` (GST, UTC+4).
2. Store timestamps as timezone-aware UTC-compatible values; convert business dates using `Asia/Muscat`.
3. Date-only invoice, due, and payment-date rules are evaluated in GST.
4. UI and documents support English LTR and Arabic RTL.
5. Currency values remain left-to-right numeric tokens inside RTL layouts.
6. Invoice/payment/receipt identifiers remain LTR and must not be digit-reordered by bidi rendering.
7. Arabic PDF font embedding must be tested in deployment artifacts; font files are deployment dependencies and not user-facing exports.

## 16. Compliance and Financial Governance

### 16.1 Oman Localization

The module must support:

- OMR monetary precision to three decimal places;
- bilingual English/Arabic invoice and receipt rendering where configured;
- GST business timezone;
- tax registration data and tax amount presentation supplied from Organization and Configuration contexts;
- immutable invoice and receipt numbering after issue;
- auditable correction/refund flows rather than silent deletion.

Exact legal invoice fields and statutory retention periods must be configured only after validation with ASTI finance/legal advisors and the applicable Oman regulatory requirements. This FRD does not invent a legal retention period where the source documents have not established one.

### 16.2 Retention Classes

Until a formally approved retention policy exists:

1. Posted finance transactions must not be automatically purged.
2. Audit records for sensitive finance actions must not be automatically purged.
3. Temporary exports follow the 24-hour technical expiry rule.
4. Operational logs follow centralized logging retention policy and must not be treated as authoritative financial records.
5. Backups follow infrastructure retention policy while preserving the module RPO/RTO targets.

## 17. Database Security Requirements

1. Application runtime uses a dedicated least-privilege database role.
2. Migration role is separate from runtime role.
3. Runtime role must not own database schema objects.
4. Direct `DELETE` on posted finance tables is prohibited by application policy; database permissions/triggers may add defense in depth after migration compatibility review.
5. Database connections require encrypted transport where infrastructure supports network separation.
6. Query timeouts must be set so reporting queries cannot exhaust transaction capacity.
7. Interactive transaction statements should target ≤10 seconds and be cancelled before they become unbounded blockers.
8. Report/export sessions use separate workload controls where supported.
9. Production query access for operators requires audited break-glass procedures.

## 18. Secure Development Requirements

1. Zod validation is mandatory at every external API and Server Action boundary.
2. Domain services revalidate business invariants independently of UI validation.
3. Prisma queries must use parameterized APIs; raw SQL requires review and parameter binding.
4. Dynamic sort columns must be allowlisted.
5. Dynamic export fields must be allowlisted.
6. PDF/HTML templates must escape untrusted values.
7. Authorization tests and branch-isolation tests from Part 9 are release-blocking.
8. Financial arithmetic tests must cover boundary precision and rounding.
9. Migration tests must validate new constraints against representative production-sized datasets before rollout.
10. Security-sensitive code paths require peer review by an engineer other than the author.

## 19. Security Verification Checklist

A production release is not approved until all applicable controls pass:

1. Authentication required for every Finance route.
2. Permission checks match Part 6 codes.
3. Branch-scope tests pass for direct reads, mutations, reports, counts, and exports.
4. Student self-service ownership tests pass.
5. Corporate account manager scope tests pass.
6. Refund self-approval is blocked.
7. Payment idempotency tests pass under concurrent retry.
8. Optimistic-lock conflict tests pass.
9. Logs contain no prohibited card or secret data.
10. PDF/download authorization is verified.
11. Database backup and restore procedure is current.
12. High-cardinality labels are absent from metrics.
13. Critical alerts route to the operational on-call channel.
14. Vulnerability and secret scans pass release gates.
15. Bilingual document rendering and bidi identifier safety are verified.

## 20. NFR Acceptance Criteria

1. Performance load tests meet all p95 targets at defined initial capacity.
2. Payment concurrency test with 50 parallel valid/duplicate requests produces no duplicate payment.
3. Cross-branch aggregate leakage test proves unauthorized values do not affect totals or denominators.
4. Database outage test confirms payment posting fails without partial writes.
5. Read-model outage test confirms transactional operations remain available while dashboards show controlled degradation.
6. Backup restore exercise demonstrates RPO ≤15 minutes and RTO ≤4 hours for the tested scenario.
7. Report workload test shows ten concurrent export jobs do not push payment p95 above 4 seconds.
8. Accessibility audit finds no unresolved critical WCAG 2.2 AA blockers on core Finance workflows.
9. English and Arabic document tests preserve amount, identifier, and date readability.
10. Audit reconstruction test can reconstruct invoice issue → payment → receipt → refund lifecycle from immutable records and audit history.
