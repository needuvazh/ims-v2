# ASTI IMS Module 12 FRD Validation Against DDD, ER Model, and Implementation Architecture

You are acting as a Principal Solutions Architect, Domain-Driven Design reviewer, Senior Staff Engineer, Database Architect, API Architect, and QA Architect.

Your task is to perform an exhaustive validation of:

`Module 12 – Fee, Billing & Receivables Management`

against the authoritative ASTI IMS architecture and domain documents.

## Authoritative Inputs

Treat the following documents as the source of truth, in this order:

1. `docs/architecture/ddd/ddd-context-map.md`
2. `docs/architecture/ddd/ER Model.md`
3. `packages/database/prisma/schema.prisma`
4. All Module 12 FRD documents, including:

```text
Module 12: Fee, Billing & Receivables Management.md

Part 1 – Business Overview, Functional Requirements, Business Rules.md

Part 2 – User Stories, Use Cases, Workflows, State Machines.md

Part 3 – Screen Specifications and UI Components.md

Part 4 – Database Entities and CRUD Matrix.md

Part 5 – API Contracts.md

Part 6 – Permission Matrix.md

Part 7 – Validation Rules, Error Catalog, Notifications.md

Part 8 - Reports, Dashboards, KPIs, Analytics.md

Part 9 – BDD Acceptance Criteria and Test Scenarios.md

Part 10 - Security Architecture and NFR.md

Part 11 - Deployment, Operations, Observability, Runbooks.md
```

Do not review the documents independently.

Review the entire module as one cohesive specification.

---

# 1. Review Objective

Determine whether Module 12 is:

* aligned with the ASTI DDD Context Map;
* aligned with the ER Model;
* compatible with the Prisma schema;
* consistent across all FRD parts;
* suitable for implementation in the existing Next.js TypeScript modular monolith;
* free from aggregate ownership violations;
* free from duplicate business logic;
* branch-safe;
* audit-safe;
* financially consistent;
* testable;
* implementable without hidden requirements.

Do not perform a superficial wording review.

Perform a domain architecture, data architecture, workflow, API, security, and consistency review.

---

# 2. Mandatory Architecture Principles

Validate the module against all of the following principles.

## 2.1 Modular Monolith

The system is a modular monolith.

Do not recommend:

* microservices;
* RabbitMQ;
* Kafka;
* external message brokers;
* distributed transactions;
* CQRS;
* Event Sourcing;

unless one of the authoritative documents explicitly requires them.

Internal domain events may be used for in-process module integration where already consistent with the architecture.

---

## 2.2 Enrollment-Centric Model

All learner journeys must converge into the central `Enrollment` aggregate.

Validate that Finance:

* does not create alternative learner lifecycle models;
* does not duplicate Enrollment;
* references Enrollment using supported context boundaries;
* does not own course assignment;
* does not own batch assignment;
* does not own student lifecycle state;
* does not directly mutate Enrollment-owned tables.

Expected high-level flow:

```text
Person
  ↓
StudentProfile
  ↓
Enrollment
  ↓
Course + Batch
  ↓
Finance Invoice / Payment / Receivable
```

---

## 2.3 Finance Bounded Context Ownership

Validate that the Finance context owns only Finance responsibilities.

Expected Finance-owned capabilities include:

```text
Invoice
InvoiceLineItem
InstallmentPlan
Installment
Payment
PaymentAllocation
Receipt
Refund
Receivable
CorporateCreditRule
```

Validate whether every owned entity in Part 4 is justified by:

* DDD;
* ER Model;
* existing Module 12 business requirements.

Flag any invented aggregate or unnecessary duplication.

---

# 3. Validate Context Ownership Boundaries

Create an explicit ownership review.

For every feature in Module 12, determine:

```text
Feature
Current FRD Owner
Expected DDD Owner
Status
Reason
Recommended Fix
```

At minimum validate the following boundaries.

---

## 3.1 Course Catalog vs Finance

Course Catalog owns:

* Course;
* CoursePricing;
* CourseDiscount;
* CourseCompletionRule;
* pricing hierarchy;
* discount hierarchy.

Finance may consume resolved commercial values for invoice creation.

Validate that Module 12 does not:

* own CoursePricing;
* own CourseDiscount;
* define conflicting pricing hierarchy;
* change Course completion rules;
* duplicate Course Catalog tables;
* directly mutate pricing configuration.

Expected pricing precedence:

```text
Batch
↓ if not available
Branch
↓ if not available
Global Course
```

Validate whether Finance records a pricing snapshot at invoice creation so historical invoices remain stable after future Course Catalog pricing changes.

---

## 3.2 Enrollment vs Finance

Enrollment owns:

* Enrollment creation;
* course assignment;
* batch assignment;
* enrollment lifecycle.

Finance owns:

* invoice generation;
* payment;
* receipt;
* refund;
* receivables;
* payment validation.

Validate:

```text
Enrollment Confirmed
        ↓
Resolved Commercial Values
        ↓
Invoice Created
        ↓
Payment / Receivable Tracking
```

Identify any place where Finance incorrectly changes Enrollment state directly.

---

## 3.3 Corporate Training vs Finance

Corporate Training owns:

* CorporateAccount;
* CorporateContract;
* CorporateParticipant;
* CorporateEnrollment.

Finance owns:

* corporate invoice;
* corporate receivable;
* credit exposure;
* credit validation.

Validate that Module 12 does not duplicate corporate master data.

Validate corporate credit logic:

```text
currentOutstanding
+
committedAmount
+
newExposure
=
projectedExposure
```

Verify the exact formula used by the FRD and identify inconsistencies across:

* Part 1;
* Part 2;
* Part 5;
* Part 7;
* Part 8;
* Part 9.

Validate blocking behavior:

```text
IF projected exposure exceeds credit limit
AND blockOnCreditLimit = true
THEN enrollment must be blocked.
```

Validate warning behavior when blocking is disabled.

---

## 3.4 Completion and Certificate Boundaries

Completion context owns:

* completion rule evaluation;
* attendance evaluation;
* exam/result evaluation;
* completion approval.

Certificate context owns:

* certificate generation;
* verification;
* reissue;
* revocation.

Finance should only provide authoritative payment validation.

Validate that Module 12 exposes an appropriate application contract such as:

```text
validateEnrollmentPaymentStatus(enrollmentId)
```

or an equivalent internal application service.

Flag any Finance logic that:

* computes completion eligibility;
* issues certificates;
* changes certificate status;
* changes completion status directly.

---

## 3.5 Reporting Context Boundary

Reporting and Dashboards consume data from Finance.

Validate that:

* reporting views do not become transactional sources of truth;
* corporate credit validation does not use stale reporting projections;
* payment validation does not use materialized views;
* refund execution does not depend on reporting read models;
* dashboards may use views/materialized views;
* transactional commands use authoritative Finance tables.

Explicitly verify this rule:

```text
Transactional decision
    → authoritative Finance tables

Dashboard/report query
    → reporting projection/read model allowed
```

---

## 3.6 IAM and Branch Access Boundary

IAM owns:

```text
User
Role
Permission
UserRole
RolePermission
UserBranchAccess
```

Finance consumes authorization context but must not own IAM entities.

Validate that:

* roles are not hardcoded in authorization logic;
* permissions are fine-grained;
* UI visibility does not replace server authorization;
* repository queries enforce branch scope;
* consolidated reporting requires explicit permission;
* branch filters cannot be manipulated to access unauthorized data.

---

# 4. Validate Finance Aggregate Design

Review the aggregate structure.

Determine whether the following aggregate boundaries are consistent and transactionally safe:

## Invoice Aggregate

Expected related entities:

```text
Invoice
 ├── InvoiceLineItem
 ├── InstallmentPlan
 │    └── Installment
 ├── Payment
 │    └── PaymentAllocation
 ├── Receipt
 ├── Refund
 └── Receivable
```

Do not assume all listed entities must be one database transaction boundary.

Evaluate the actual FRD rules and identify:

* aggregate root;
* transaction boundaries;
* consistency boundaries;
* concurrency risks;
* cross-aggregate references.

Check the following invariants:

* invoice totals are internally consistent;
* paid amount never exceeds allowed financial bounds;
* outstanding amount cannot be negative;
* payment allocations equal the allocated payment amount;
* receipt generation does not create duplicate receipts;
* refunds never exceed refundable amount;
* executed refunds affect balances exactly once;
* invoice lifecycle transitions are valid;
* financial documents are immutable after posting/issuance except through controlled corrective workflows.

---

# 5. Validate Financial Calculation Rules

Review all calculations across the FRD.

Check consistency of formulas for:

## Invoice Line

Expected logical form:

```text
grossLineAmount =
quantity × unitPrice
```

```text
taxableAmount =
grossLineAmount - discountAmount
```

```text
taxAmount =
taxableAmount × taxRate
```

```text
lineTotal =
taxableAmount + taxAmount
```

Verify the exact FRD formula and rounding sequence.

---

## Invoice Totals

Validate:

```text
subtotal
discountAmount
taxAmount
totalAmount
paidAmount
outstandingAmount
```

Ensure:

```text
totalAmount =
subtotal - discountAmount + taxAmount
```

and:

```text
outstandingAmount =
totalAmount
- successful payment allocations
+ executed refund financial effect
```

Check whether the FRD uses a different valid model.

Flag inconsistencies.

---

## Currency Precision

For Oman localization, verify:

* OMR handling;
* decimal precision;
* database numeric precision;
* API numeric format;
* UI format;
* rounding mode;
* aggregation behavior.

Check for conflicts between:

* PostgreSQL numeric fields;
* Prisma Decimal;
* Zod schemas;
* JSON DTOs;
* UI inputs;
* KPI formulas.

Flag unsafe use of JavaScript floating-point arithmetic for financial calculation.

---

# 6. Validate Invoice Lifecycle

Extract every Invoice status defined anywhere in the module.

Compare statuses from:

* Part 1 business rules;
* Part 2 state machines;
* Part 3 UI;
* Part 5 API contracts;
* Part 7 validations;
* Part 9 tests.

Create:

```text
Status
Defined In
Meaning
Entry Conditions
Allowed Next States
Permission
Side Effects
Consistency Result
```

Identify:

* missing statuses;
* conflicting names;
* unreachable statuses;
* states without exit transitions;
* API actions without state-machine transitions;
* UI actions that violate transition rules;
* BDD tests that contradict the lifecycle.

---

# 7. Validate Installment Lifecycle

Review:

* installment plan creation;
* sequence numbering;
* total plan amount;
* due dates;
* paid amounts;
* overdue calculation;
* partial payment;
* allocation behavior;
* installment status transitions.

Check boundary cases:

* installment amount totals differ from invoice total;
* duplicate sequence numbers;
* payment allocated beyond installment outstanding;
* payment larger than current installment;
* payment across multiple installments;
* payment transaction rollback;
* overdue installment later paid;
* refund after installment payment;
* deleted or cancelled invoice with installments.

---

# 8. Validate Payment Model

Review the Payment lifecycle and immutability model.

Validate:

* idempotency;
* duplicate submission handling;
* payment number uniqueness;
* reference validation;
* branch context;
* payer context;
* amount validation;
* payment method validation;
* successful transaction atomicity;
* receipt generation behavior;
* payment allocation.

Check whether:

```text
Payment
PaymentAllocation
Receipt
Receivable update
Invoice balance update
```

are coordinated consistently.

Flag any scenario that can create:

* recorded payment without allocation;
* allocation without payment;
* duplicate receipt;
* paid amount mismatch;
* stale receivable;
* inconsistent invoice outstanding.

---

# 9. Validate Refund Workflow

Review the complete refund lifecycle.

Expected logical stages may include:

```text
Requested
Approved
Rejected
Executed
Cancelled
```

Use the FRD's actual states as the authoritative Module 12 design and compare them across parts.

Validate:

* requester permission;
* approver permission;
* executor permission;
* maker-checker separation;
* requester cannot self-approve;
* amount does not exceed refundable balance;
* Full vs Partial refund validation;
* reason requirement;
* rejection reason;
* execution idempotency;
* financial balance adjustment;
* audit logging;
* notifications.

Create a state consistency report.

---

# 10. Validate Receivables and Aging

Validate:

* source of receivable;
* due date;
* outstanding amount;
* reconciliation behavior;
* aging calculation;
* timezone behavior.

Pay special attention to the existing source-model bucket definitions:

```text
Current
30 Days
60 Days
90 Days
120+ Days
```

The ER model appears not to define a separate 91–119-day bucket.

Review the Module 12 workaround.

Determine whether it:

1. preserves compatibility;
2. creates misleading reporting;
3. requires a DDD/ER correction;
4. should be documented as technical debt.

Do not silently invent a new enum.

Provide a recommendation.

---

# 11. Validate Corporate Credit Effective Dating

Validate `CorporateCreditRule` for:

* creditLimit;
* currentOutstanding;
* committedAmount;
* availableCredit;
* blockOnCreditLimit;
* effectiveStartDate;
* effectiveEndDate;
* status;
* branch scope if applicable.

Check:

* overlapping active rules;
* date boundaries;
* no active rule;
* expired rule;
* future rule;
* race conditions during concurrent enrollment creation;
* consistency between enrollment check and final exposure reservation.

Identify TOCTOU risks:

```text
Credit Check
      ↓
Concurrent Enrollment
      ↓
Original Enrollment Confirmation
```

Recommend a modular-monolith-compatible transaction or locking approach if required.

Do not recommend distributed infrastructure.

---

# 12. Validate Database Model Against ER Model and Prisma

For every Module 12 database entity, create:

```text
FRD Entity
ER Model Entity
Prisma Model
Status
Field Gaps
Relationship Gaps
Constraint Gaps
Recommended Action
```

Validate:

```text
Invoice
InvoiceLineItem
InstallmentPlan
Installment
Payment
PaymentAllocation
Receipt
Refund
Receivable
CorporateCreditRule
```

For every field validate:

* PostgreSQL type;
* Prisma type;
* nullability;
* PK;
* FK;
* unique constraints;
* composite unique constraints;
* indexes;
* enum mappings;
* decimals;
* dates;
* soft delete fields;
* audit fields;
* version field;
* effective dating.

Do not assume the FRD is correct.

Do not assume Prisma is correct.

The DDD and ER Model are architectural baselines, but report implementation gaps accurately.

---

# 13. Validate Soft Delete and Immutability Rules

The architecture requires no hard deletion for business data.

Validate every Module 12 entity for:

```text
isDeleted
deletedAt
createdAt
createdBy
updatedAt
updatedBy
```

Review whether financial entities should be logically deleted at all after posting.

Distinguish:

```text
Draft record soft delete
```

from:

```text
Posted financial record cancellation/reversal
```

Flag any FRD behavior that allows an issued invoice, posted payment, generated receipt, or executed refund to disappear through ordinary soft deletion.

Recommend controlled state transition or correction workflow where appropriate.

---

# 14. Validate Audit Requirements

Sensitive Finance actions must be auditable.

Validate audit coverage for:

* invoice creation;
* invoice modification;
* invoice issue;
* invoice cancellation;
* payment posting;
* payment allocation;
* receipt generation;
* refund request;
* refund approval;
* refund rejection;
* refund execution;
* corporate credit-rule changes;
* manual aging corrections if supported;
* export actions;
* consolidated report access.

For each action verify that the FRD can capture:

```text
actor
timestamp
branch
entity type
entity id
action
old value
new value
reason
request/correlation id
```

Flag gaps.

---

# 15. Validate Permission Model

Extract all Finance permission codes from:

* Part 3;
* Part 5;
* Part 6;
* Part 8;
* Part 9.

Create one canonical table:

```text
Permission Code
Purpose
API Usage
UI Usage
Report Usage
Test Coverage
Status
```

Identify:

* permission referenced but never defined;
* permission defined but never used;
* inconsistent permission names;
* UI-only authorization;
* API missing authorization;
* reports missing report permission;
* exports using ordinary read permission;
* excessive access granted to roles.

Specifically review:

```text
Super Admin
Branch Admin
Accountant
Finance Manager
Counselor
Academic Coordinator
Trainer
Student
Auditor
Corporate Account Manager
```

Validate least privilege.

---

# 16. Validate Branch Isolation

This is a critical security review.

For every read and mutation endpoint validate:

```text
Authenticated User
      ↓
Resolve UserBranchAccess
      ↓
Resolve active branch context
      ↓
Validate requested branch
      ↓
Apply branch predicate in server query
      ↓
Execute operation
```

Check:

* list APIs;
* detail APIs;
* create APIs;
* update APIs;
* payment posting;
* refunds;
* receivable aging;
* corporate credit validation;
* dashboards;
* reports;
* exports;
* audit queries.

Test mentally for:

```text
Branch A user requests Branch B invoice by ID
Branch A user changes URL query to Branch B
Branch A user posts payment against Branch B invoice
Branch A accountant exports Branch B records
Parent branch user reads child branch
Child branch user reads parent branch
User with Finance permission but no consolidated entitlement
User with consolidated entitlement but no Finance reporting permission
```

Identify any aggregation leakage.

Counts, totals, charts, percentages, ranking tables, and denominators must also obey branch scope.

---

# 17. Validate API Contracts

Review every API endpoint and Server Action.

For each endpoint verify:

```text
Route
Method
Purpose
Authentication
Permission
Branch Scope
Request Zod Schema
Response DTO
Error Codes
Idempotency
Transaction Boundary
Audit Requirement
```

Flag:

* missing permission;
* missing branch scope;
* missing Zod schema;
* inconsistent error code;
* incorrect HTTP status;
* missing optimistic locking;
* unsafe financial mutation;
* business logic placed in route handler instead of application service;
* direct cross-context database write.

Validate that REST routes and Server Actions call the same application services rather than implementing duplicate business logic.

---

# 18. Validate Error Catalog

Create a cross-reference:

```text
Error Code
Defined In Part 7
Used by API
Used by UI
Covered by BDD
Status
```

Check for:

* duplicate error codes;
* inconsistent meanings;
* API errors not cataloged;
* cataloged errors never used;
* wrong HTTP mapping;
* sensitive internal details exposed to clients.

Error responses should be structured consistently.

Review examples such as:

```text
ERR_FIN_*
```

and verify naming consistency.

---

# 19. Validate Notifications

Review every Module 12 domain event that triggers notification.

At minimum inspect events related to:

* invoice issued;
* payment recorded;
* receipt generated;
* installment due;
* invoice overdue;
* refund requested;
* refund approved;
* refund rejected;
* refund executed;
* credit limit warning;
* credit validation blocked;
* aging threshold crossing.

For each validate:

```text
Domain Event
Trigger
Recipient
Channel
Template Code
Language
Template Variables
Deduplication Key
Retry Behavior
PII Safety
```

Validate exact variable consistency.

For example, ensure a template does not request:

```text
{{studentName}}
```

when the event contract only provides:

```text
customerDisplayName
```

Identify variable-name mismatches.

---

# 20. Validate UI Against Business Rules

For each Module 12 screen verify:

```text
Screen
Requirement
API
Permission
Branch Scope
State Rules
Validation
BDD Coverage
```

Check:

* buttons shown only for valid states;
* forbidden actions not merely disabled but server-blocked;
* form validation matches Part 7;
* UI regex matches API Zod regex;
* Arabic RTL behavior;
* OMR precision;
* GST timezone;
* pagination;
* filters;
* sorting;
* error states;
* concurrency conflict handling;
* loading states;
* empty states;
* access denied states.

---

# 21. Validate BDD Coverage

Map every:

```text
FR-FBR-001
through
FR-FBR-030
```

to one or more BDD scenarios.

Create:

```text
Requirement
Positive Test
Negative Test
Boundary Test
Authorization Test
Branch Isolation Test
Status
```

Identify requirements lacking:

* positive coverage;
* negative coverage;
* boundary coverage;
* authorization coverage;
* branch isolation coverage.

Also verify that BDD tests do not encode behavior that contradicts the business rules or APIs.

---

# 22. Validate Reporting and KPI Formulas

For every KPI, verify:

```text
KPI Name
Formula
Data Source
Time Basis
Branch Scope
Currency Handling
Zero-Denominator Rule
Permission
Read Model
```

Check for errors in:

* collection efficiency;
* outstanding receivables;
* overdue amount;
* refund rate;
* installment delinquency rate;
* credit utilization;
* aging distribution;
* average collection period;
* payment method mix;
* branch comparison.

Verify that multi-currency values are not incorrectly aggregated without conversion logic.

If Module 12 supports only OMR operationally, confirm this is explicit and consistent.

---

# 23. Validate Read Models

Review the proposed reporting objects such as:

```text
vw_fin_invoice_register
vw_fin_payment_register
vw_fin_refund_register
vw_fin_receivable_aging
mv_fin_daily_branch_kpi
mv_fin_monthly_collection_efficiency
fin_receivable_snapshot_daily
vw_fin_installment_delinquency
vw_fin_corporate_credit_exposure
vw_fin_reconciliation_exceptions
```

For each determine:

* source tables;
* refresh mechanism;
* transactional vs analytical use;
* branch-scoping mechanism;
* stale-data behavior;
* rebuild procedure;
* indexes;
* ownership.

Flag any view used incorrectly for transactional decisions.

---

# 24. Validate Security and NFR Alignment

Compare Part 10 against Parts 5, 8, 9, and 11.

Validate:

* API p95 targets;
* dashboard targets;
* report targets;
* concurrent user targets;
* concurrent payment transaction targets;
* availability;
* RPO;
* RTO;
* reporting rebuild target;
* encryption;
* log redaction;
* PII handling;
* document access;
* export controls.

Identify contradictions such as:

```text
Part 5 timeout = 2 seconds
Part 10 p95 target = 3 seconds
```

or similar inconsistencies.

---

# 25. Validate Operations and Runbooks

Review Part 11 against the actual failure modes implied by the FRD.

Confirm runbook coverage for:

* unknown payment outcome;
* transaction rollback;
* duplicate payment;
* duplicate receipt;
* idempotency conflict;
* allocation mismatch;
* invoice balance mismatch;
* receivable mismatch;
* refund execution failure;
* numbering-series failure;
* corporate credit timeout;
* stale reporting projection;
* database deadlock;
* pool exhaustion;
* backup failure;
* PITR recovery;
* branch authorization anomaly;
* document rendering failure;
* notification failure;
* bulk Finance import failure.

For each runbook verify:

```text
Detection
Containment
Diagnosis
Safe Recovery
Reconciliation
Audit
Escalation
Prevention
```

Flag any runbook that recommends:

* direct destructive SQL;
* deleting financial records;
* changing posted financial data without audit;
* marking a transaction successful without reconciliation.

---

# 26. Check Cross-Part Consistency

Perform explicit comparisons across all parts.

Check for inconsistencies in:

```text
Requirement IDs
Business Rule IDs
Permission codes
Entity names
Field names
Enum names
Status names
API routes
Error codes
Domain event names
Notification template codes
KPI names
Report names
State transitions
Validation limits
Date rules
Currency precision
Branch rules
```

Create a contradiction table:

```text
ID
Topic
Document A
Document B
Conflict
Severity
Recommended Resolution
```

---

# 27. Severity Classification

Classify every finding.

## CRITICAL

Examples:

* financial data corruption risk;
* branch data leakage;
* duplicate payment risk;
* refund overpayment;
* cross-context ownership violation causing conflicting source of truth;
* missing server-side authorization;
* certificate/completion using stale reporting data.

## HIGH

Examples:

* contradictory state transitions;
* missing audit trail;
* inconsistent API validation;
* credit check race condition;
* missing idempotency.

## MEDIUM

Examples:

* missing indexes;
* incomplete negative test;
* unclear error mapping;
* report formula ambiguity.

## LOW

Examples:

* naming inconsistency;
* documentation clarity;
* minor traceability issue.

---

# 28. Required Output Format

Produce the review in the following structure.

## A. Executive Summary

Include:

```text
Overall Alignment Score: X/100

DDD Alignment: X/100
ER Model Alignment: X/100
Database Alignment: X/100
Cross-Part Consistency: X/100
Security & Branch Isolation: X/100
API Contract Quality: X/100
Test Coverage: X/100
Operational Readiness: X/100
```

Explain whether the module is:

```text
APPROVED
APPROVED WITH MINOR CHANGES
REQUIRES REMEDIATION
NOT READY FOR IMPLEMENTATION
```

---

## B. Critical Findings

Table:

| ID | Severity | Area | Finding | Evidence | Risk | Required Fix |
| -- | -------- | ---- | ------- | -------- | ---- | ------------ |

---

## C. DDD Context Alignment Matrix

| Capability | FRD Owner | DDD Owner | Status | Gap | Recommendation |
| ---------- | --------- | --------- | ------ | --- | -------------- |

---

## D. Entity Alignment Matrix

| FRD Entity | ER Entity | Prisma Model | Owner | Status | Gap | Recommendation |
| ---------- | --------- | ------------ | ----- | ------ | --- | -------------- |

---

## E. Functional Requirement Traceability

| FR ID | Business Rule | User Story | Use Case | Screen | API | Permission | Validation | BDD | Status |
| ----- | ------------- | ---------- | -------- | ------ | --- | ---------- | ---------- | --- | ------ |

Review all `FR-FBR-001` through `FR-FBR-030`.

Do not sample.

---

## F. State Machine Review

Review:

```text
Invoice
Installment
Refund
Receivable
```

Provide corrected Mermaid diagrams where inconsistencies exist.

---

## G. Permission and Branch Isolation Review

Include:

* missing permission enforcement;
* role over-permission;
* branch leakage risks;
* consolidated access issues;
* report/export leakage;
* Student isolation;
* Corporate Account Manager isolation.

---

## H. Financial Integrity Review

Review:

* calculations;
* Decimal usage;
* invoice balance consistency;
* payment allocation;
* refunds;
* receivables;
* credit exposure;
* concurrency;
* idempotency.

---

## I. API and Validation Review

List:

* missing endpoints;
* duplicated endpoints;
* missing Zod checks;
* invalid HTTP mapping;
* uncataloged errors;
* missing branch scope;
* missing idempotency.

---

## J. Reporting Review

Review:

* KPI formulas;
* dashboard widgets;
* report columns;
* filters;
* sorting;
* exports;
* read views;
* materialized views;
* refresh strategy;
* stale data handling.

---

## K. BDD Coverage Gaps

List exact missing scenarios.

Provide new Gherkin scenarios for every critical or high-risk uncovered path.

---

## L. Operations and Security Review

Review:

* logging;
* tracing;
* metrics;
* alerts;
* health checks;
* backups;
* PITR;
* reconciliation;
* runbooks;
* NFR consistency.

---

## M. Recommended Changes

Divide into:

### Must Fix Before Development

### Must Fix Before Production

### Recommended Improvements

### Technical Debt / DDD Clarifications

---

## N. Exact Patch Plan

For every required correction provide:

```text
File:
Section:
Current Problem:
Required Change:
Affected IDs:
Dependency Impact:
Regression Tests Required:
```

Make the patch plan concrete enough that another AI coding/documentation agent can implement it without rediscovering the issue.

---

# 29. Review Behaviour Rules

1. Do not praise the documents without evidence.
2. Do not assume the FRD is correct.
3. Do not assume Prisma is correct.
4. Do not invent business requirements that do not exist in the DDD or ER model.
5. Distinguish between:

   * confirmed mismatch;
   * probable issue;
   * open architecture decision;
   * implementation recommendation.
6. Quote exact file names and requirement IDs.
7. Give exact entity, field, endpoint, permission, and state names.
8. Do not write generic findings such as:

   * “Improve security”
   * “Add validation”
   * “Optimize database”
9. Every finding must include:

   * evidence;
   * impact;
   * concrete fix.
10. Review all Module 12 parts before concluding.
11. Do not recommend microservices.
12. Do not recommend an external broker.
13. Do not recommend CQRS or Event Sourcing.
14. Preserve the Enrollment-centric architecture.
15. Preserve Party/Person identity reuse.
16. Preserve server-side branch isolation.
17. Preserve Finance as invoice-centric.
18. Preserve Course Catalog ownership of pricing and discounts.
19. Preserve Completion ownership of completion eligibility evaluation.
20. Preserve Certificate ownership of certificate issuance.
21. Treat financial accuracy and branch isolation as release-blocking concerns.

Begin by reading the DDD Context Map, ER Model, Prisma schema, and every Module 12 FRD file before producing any conclusions.
