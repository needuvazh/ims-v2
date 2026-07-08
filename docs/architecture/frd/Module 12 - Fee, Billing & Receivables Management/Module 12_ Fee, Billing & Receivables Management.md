# Module 12: Fee, Billing & Receivables Management

## 1. Purpose and Objective

Module 12 provides the financial transaction and receivables-control capability for the ASTI Integrated Institute Management System (IMS). It is the authoritative bounded context for invoices, invoice line items, installment plans, installments, payments, receipts, refunds, receivables, aging classification, and corporate credit validation.

The module follows an invoice-centric model. Enrollment confirmation supplies the learner, course, batch, branch, enrollment type, and resolved commercial values. Course Catalog remains the owner of course pricing, pricing hierarchy, course discounts, and completion-rule configuration. This module validates the received pricing snapshot, creates the invoice obligation, records settlement activity, calculates outstanding balances, tracks overdue exposure, and exposes payment-validation status to downstream completion and certificate workflows.

The module must support Regular, Corporate, Walk-In, and Online enrollment journeys without creating parallel learner-finance lifecycles. Every student-facing course charge must remain traceable to the central Enrollment aggregate and its course and batch. Corporate billing may consolidate multiple participant enrollments into one corporate invoice while preserving enrollment-level traceability through invoice line items.

All timestamps use Oman GST (UTC+4) as the business default. Financial documents and user interfaces must support English and Arabic presentation where required. No financial transaction is hard-deleted. Sensitive finance actions are audited with actor, timestamp, branch context, before value, after value, and business reason.

## 2. Business Goals

| ID         | Business Goal                                                                               | Success Intent                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BO-FBR-001 | Establish one authoritative financial ledger of operational billing obligations inside IMS. | Every billable enrollment or approved corporate billing instruction creates a traceable invoice or invoice line item without duplicate financial ownership.  |
| BO-FBR-002 | Ensure accurate application of resolved pricing and discount values.                        | Invoice creation uses the immutable commercial snapshot resolved through batch, branch, then global course hierarchy and rejects inconsistent totals.        |
| BO-FBR-003 | Improve collection visibility.                                                              | Finance users can see paid, partially paid, unpaid, overdue, and refunded positions by invoice, student, corporate account, branch, and aging bucket.        |
| BO-FBR-004 | Support controlled payment collection.                                                      | Every manual payment has a unique payment number, authorized collector, method, amount, reference data where required, and receipt.                          |
| BO-FBR-005 | Support flexible learner payment arrangements.                                              | Authorized users can create installment plans whose scheduled amount exactly equals the invoice obligation assigned to the plan.                             |
| BO-FBR-006 | Protect ASTI from unmanaged corporate credit exposure.                                      | Corporate enrollment checks current outstanding plus committed exposure against configured credit limit and honors the blocking flag.                        |
| BO-FBR-007 | Provide controlled refund processing.                                                       | Refunds are requested, reviewed, approved or rejected, executed, and audited without mutating the original payment record.                                   |
| BO-FBR-008 | Maintain reliable receivables aging.                                                        | Open balances are classified from invoice due date into Current, 30 Days, 60 Days, 90 Days, and 120+ Days buckets.                                           |
| BO-FBR-009 | Enable downstream completion and certificate controls.                                      | The module exposes authoritative payment-validation results for enrollments where payment completion is required.                                            |
| BO-FBR-010 | Enforce branch isolation and consolidated reporting controls.                               | Operational access is branch-scoped server-side; consolidated access requires an explicit permission and eligible branch-access relationship.                |
| BO-FBR-011 | Preserve complete financial auditability.                                                   | Invoice, payment, refund, receipt, installment, credit-rule, and adjustment actions are reconstructable from immutable transaction records and audit logs.   |
| BO-FBR-012 | Support ASTI finance operations in Oman.                                                    | Currency, GST timezone, bilingual documents, invoice numbering, receipt numbering, and tax-breakdown presentation are configurable and consistently applied. |

## 3. Scope

### 3.1 Included Scope

1. Student invoice creation for confirmed Regular, Walk-In, and Online enrollments.
2. Corporate invoices, including one-enrollment invoices and consolidated multi-enrollment invoices.
3. Advance, milestone, final, and refund invoice classifications supported by the domain model.
4. Invoice line item creation with enrollment and course traceability.
5. Validation of resolved price, resolved discount, subtotal, tax amount, total amount, paid amount, and outstanding amount.
6. Installment plan creation, validation, activation, and installment balance tracking.
7. Manual payment recording for Cash, Bank Transfer, Card, Cheque, and authorized Corporate Billing settlement records.
8. Online payment method representation in the domain model; automated payment-gateway processing remains excluded until the approved integration phase.
9. Payment allocation to an invoice and, when applicable, to an installment obligation.
10. Receipt number generation, receipt data persistence, bilingual receipt rendering, and re-download of issued receipts.
11. Refund request, approval, rejection, execution-status tracking, and financial impact calculation.
12. Receivable creation and maintenance for open invoice balances.
13. Aging classification using Current, 30 Days, 60 Days, 90 Days, and 120+ Days.
14. Corporate credit-rule maintenance and credit validation during corporate enrollment and bulk-enrollment workflows.
15. Payment-completion validation for completion and certificate eligibility consumers.
16. Branch-scoped invoice, payment, receipt, refund, installment, receivable, and credit views.
17. Permission-controlled consolidated reporting across authorized branches.
18. Search, filter, sort, pagination, export authorization, and finance dashboard summary data.
19. Finance audit logging for sensitive operations.
20. Soft deletion only for eligible configuration/support records; posted financial transactions are reversed or status-transitioned rather than deleted.
21. Effective dating for corporate credit rules and other mutable financial policies where multiple historical versions must be retained.
22. Oman GST timezone default and English/Arabic financial-document presentation.

### 3.2 Excluded Scope

1. Course price definition and ownership; Course Catalog owns CoursePricing.
2. Course discount definition and hierarchy ownership; Course Catalog owns CourseDiscount.
3. Course completion-rule ownership and evaluation.
4. Admission creation, StudentProfile creation, and Enrollment lifecycle ownership.
5. Corporate contract ownership and participant nomination ownership.
6. Automated online payment-gateway integration and webhook processing in the current phase.
7. Tally synchronization, Tally reconciliation, and accounting voucher mapping in the current phase.
8. General ledger, chart of accounts, double-entry bookkeeping, bank reconciliation, and statutory accounting close.
9. Payroll, trainer compensation settlement, HR expenses, procurement, inventory, and fixed-asset accounting.
10. Unapproved arbitrary price editing on posted invoices.
11. Hard deletion of invoices, payments, receipts, refunds, or receivables.
12. Certificate eligibility computation; this module only supplies payment-validation status.
13. Tax-policy administration beyond configurable tax inputs and compliant document presentation approved for ASTI.

## 4. Stakeholders and Actors

### 4.1 Human Actors

| Actor                                  | Responsibilities                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance Officer                        | Create and review invoices, create installment plans, record payments, issue receipts, monitor receivables, and initiate refunds subject to permissions.         |
| Cashier / Front Desk Officer           | Record authorized walk-in or counter payments, issue receipts, and view only permitted branch transactions.                                                      |
| Finance Manager                        | Approve high-impact finance actions, review refunds, view branch or consolidated receivables, manage credit policies subject to permission, and supervise aging. |
| Branch Manager                         | View branch financial status, approve actions explicitly delegated through approval rules, and review branch collection performance.                             |
| Admission Officer / Counselor          | View fee summary and payment status required for enrollment servicing without direct permission to mutate financial transactions.                                |
| Corporate Account Manager              | View corporate account billing position, request invoicing, and coordinate participant/enrollment billing; cannot post payments unless separately authorized.    |
| Academic Coordinator                   | Consume payment-validation status for completion workflows; cannot alter finance records through this module.                                                    |
| Auditor / Compliance Reviewer          | Read immutable transaction history and audit records across explicitly authorized branches.                                                                      |
| Executive / Consolidated Report Viewer | View aggregated financial KPIs across assigned branch hierarchy when granted consolidated reporting permission.                                                  |

### 4.2 System Actors

| System Actor                        | Interaction                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Admission & Enrollment Module       | Publishes or invokes confirmed enrollment data and consumes finance/payment status.                                                            |
| Course Catalog Module               | Supplies authoritative pricing, discount, and course commercial-reference data; does not create invoices.                                      |
| Training Delivery Module            | Supplies batch identity and branch-aligned delivery context referenced by enrollment billing.                                                  |
| Corporate Training Module           | Supplies corporate account, participant, contract linkage, billing cycle context, and bulk-enrollment references.                              |
| Corporate Sales & Quotation Module  | Supplies approved quotation or sales-order traceability for corporate commercial flows.                                                        |
| Identity & Access Management        | Supplies authenticated user identity, permissions, assigned branches, default branch, child-branch access, and consolidated-view entitlement.  |
| Organization Management             | Supplies branch hierarchy and institute identity used in scoping and document presentation.                                                    |
| Configuration / Master Data         | Supplies numbering series, payment methods, localized labels, currencies, and other controlled reference values.                               |
| Exam, Result & Completion Module    | Requests payment-validation result when completion rule requires payment completion.                                                           |
| Certificate Module                  | Consumes payment-validation result as one prerequisite for issuance when payment validation is configured.                                     |
| Reporting & Executive Dashboards    | Consumes branch-scoped and permission-controlled finance metrics without owning finance transactions.                                          |
| Audit & Compliance Module           | Persists sensitive finance action records and approval history.                                                                                |
| Communication & Notification Module | Receives reminder or notification requests such as installment due, invoice overdue, payment receipt issued, or refund decision, when enabled. |

## 5. Functional Overview

```text
Fee, Billing & Receivables Management
|
+-- Billing
|   +-- Student Invoice
|   +-- Corporate Invoice
|   +-- Consolidated Corporate Invoice
|   +-- Advance Invoice
|   +-- Milestone Invoice
|   +-- Final Invoice
|   +-- Refund Invoice
|   +-- Invoice Line Items
|   +-- Tax Breakdown
|   +-- Invoice Numbering
|
+-- Installments
|   +-- Installment Plan Creation
|   +-- Installment Schedule Validation
|   +-- Due-Date Tracking
|   +-- Installment Settlement Status
|
+-- Collections
|   +-- Manual Payment Recording
|   +-- Payment Validation
|   +-- Payment Allocation
|   +-- Partial Payment Handling
|   +-- Overpayment Prevention
|   +-- Payment Status Tracking
|
+-- Receipts
|   +-- Receipt Numbering
|   +-- Bilingual Receipt Rendering
|   +-- Receipt Retrieval
|   +-- Reprint Audit
|
+-- Refunds
|   +-- Refund Request
|   +-- Approval / Rejection
|   +-- Refund Execution Status
|   +-- Balance Recalculation
|   +-- Refund Audit
|
+-- Receivables
|   +-- Open Balance Tracking
|   +-- Due-Date Monitoring
|   +-- Aging Classification
|   +-- Student Receivables
|   +-- Corporate Receivables
|   +-- Branch Receivables
|
+-- Corporate Credit Control
|   +-- Credit Rule Maintenance
|   +-- Outstanding Exposure
|   +-- Committed Exposure
|   +-- Available Credit
|   +-- Enrollment Credit Validation
|   +-- Blocking / Warning Outcome
|
+-- Financial Controls
|   +-- Branch Isolation
|   +-- RBAC
|   +-- Audit Trail
|   +-- Effective Dating
|   +-- Soft Delete Policy
|   +-- Payment Completion Validation
|
+-- Finance Queries and Reporting Inputs
    +-- Invoice Search
    +-- Payment Search
    +-- Refund Search
    +-- Receivable Aging
    +-- Collection Summary
    +-- Branch Summary
    +-- Corporate Exposure Summary
```

## 6. Business Capabilities and User Types

### 6.1 Internal User Capabilities

| Capability                   |  Finance Officer |     Cashier |  Finance Manager |        Branch Manager | Admission/Counselor |          Auditor | Executive Viewer |
| ---------------------------- | ---------------: | ----------: | ---------------: | --------------------: | ------------------: | ---------------: | ---------------: |
| View branch invoices         |              Yes |         Yes |              Yes |                   Yes |             Limited |              Yes |              Yes |
| Create invoice               |              Yes |          No |              Yes |                    No |                  No |               No |               No |
| Create installment plan      |              Yes |          No |              Yes |                    No |                  No |               No |               No |
| Record manual payment        |              Yes |         Yes |              Yes |                    No |                  No |               No |               No |
| Issue receipt                |              Yes |         Yes |              Yes |                    No |                  No |             Read |               No |
| Request refund               |              Yes | Conditional |              Yes |           Conditional |                  No |               No |               No |
| Approve refund               |    No by default |          No |              Yes | Conditional by policy |                  No |               No |               No |
| Manage corporate credit rule |      Conditional |          No |              Yes |                    No |                  No |             Read |               No |
| View aging                   |              Yes |     Limited |              Yes |           Branch only |                  No |              Yes |       Aggregated |
| View consolidated finance    | Permission-based |          No | Permission-based |      Permission-based |                  No | Permission-based | Permission-based |
| Export finance data          | Permission-based |          No | Permission-based |      Permission-based |                  No | Permission-based | Permission-based |
| View audit history           |          Limited |          No |              Yes |               Limited |                  No |              Yes |               No |

### 6.2 External User Capabilities

The initial application strategy is a single admin portal, therefore external self-service finance portals are not part of the current delivery scope. The domain must nevertheless support controlled future read-only presentation of invoice, receipt, payment-status, certificate-payment-validation, and corporate billing data through dedicated portals without transferring transaction ownership out of Module 12.

Potential external consumers are:

| External User Type              | Current Capability Boundary                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Student / Learner               | Receives invoice or receipt through authorized staff or communication channels; no direct finance mutation.                                      |
| Corporate Contact / Coordinator | Receives approved corporate invoice, statement, receipt, and training-billing status through authorized operational channels; no direct posting. |
| Public Certificate Verifier     | No direct finance access; certificate verification only consumes certificate domain data.                                                        |

## 7. Functional Requirements Checklist

| Requirement ID | Requirement                                                                                                           | Priority |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-FBR-001     | Create a student invoice from a confirmed enrollment and immutable commercial snapshot.                               | Must     |
| FR-FBR-002     | Create a corporate invoice for one or more eligible corporate enrollments while preserving line-level traceability.   | Must     |
| FR-FBR-003     | Validate invoice totals, discount, tax, paid amount, and outstanding amount deterministically.                        | Must     |
| FR-FBR-004     | Generate unique branch-aware invoice numbers using configured NumberingSeries.                                        | Must     |
| FR-FBR-005     | View, search, filter, sort, and paginate invoices under server-side branch scope.                                     | Must     |
| FR-FBR-006     | Create and validate installment plans linked to an enrollment and invoice.                                            | Must     |
| FR-FBR-007     | Track installment due, partial, paid, and overdue status from payment allocations.                                    | Must     |
| FR-FBR-008     | Record authorized manual payments against invoice obligations.                                                        | Must     |
| FR-FBR-009     | Validate payment amount, method, reference data, branch access, invoice status, and outstanding balance.              | Must     |
| FR-FBR-010     | Generate exactly one authoritative receipt per payment and support controlled re-rendering.                           | Must     |
| FR-FBR-011     | Support partial payments and update invoice paid and outstanding balances atomically.                                 | Must     |
| FR-FBR-012     | Create and maintain receivable records for open balances.                                                             | Must     |
| FR-FBR-013     | Classify receivables into Current, 30 Days, 60 Days, 90 Days, and 120+ Days buckets.                                  | Must     |
| FR-FBR-014     | Submit refund requests linked to a valid invoice and payment.                                                         | Must     |
| FR-FBR-015     | Approve or reject refund requests through permission-controlled workflow.                                             | Must     |
| FR-FBR-016     | Apply approved refund financial effects without deleting or rewriting original payment history.                       | Must     |
| FR-FBR-017     | Configure and effective-date corporate credit rules.                                                                  | Must     |
| FR-FBR-018     | Validate corporate credit exposure during corporate enrollment and return allow, allow-with-warning, or block result. | Must     |
| FR-FBR-019     | Calculate corporate current outstanding, committed amount, and available credit.                                      | Must     |
| FR-FBR-020     | Provide authoritative enrollment payment-validation status for completion and certificate workflows.                  | Must     |
| FR-FBR-021     | Provide branch-scoped collection, outstanding, overdue, refund, and aging summaries.                                  | Must     |
| FR-FBR-022     | Permit consolidated finance views only to explicitly authorized users.                                                | Must     |
| FR-FBR-023     | Export authorized invoice, payment, refund, and receivable datasets with branch controls and audit logging.           | Should   |
| FR-FBR-024     | Emit finance domain events for approved internal module interactions without requiring an external broker.            | Should   |
| FR-FBR-025     | Preserve immutable audit history for sensitive finance operations.                                                    | Must     |
| FR-FBR-026     | Enforce soft-delete and reversal policy appropriate to financial records.                                             | Must     |
| FR-FBR-027     | Render invoice and receipt information in English and Arabic where configured.                                        | Should   |
| FR-FBR-028     | Use Oman GST (UTC+4) as default business timezone for due-date and aging calculations.                                | Must     |
| FR-FBR-029     | Enforce optimistic concurrency for mutable financial aggregates.                                                      | Must     |
| FR-FBR-030     | Support invoice status lifecycle and prohibit illegal transitions.                                                    | Must     |

## 8. Permission Model Overview

Permissions are capability-based and must not be inferred from hardcoded role names. Suggested permission codes are:

| Permission Code               | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `finance.invoice.read`        | View invoices within authorized branch scope.                                    |
| `finance.invoice.create`      | Create an invoice from an eligible source transaction.                           |
| `finance.invoice.issue`       | Transition validated draft invoice to issued state.                              |
| `finance.invoice.cancel`      | Cancel an eligible unpaid invoice with reason.                                   |
| `finance.installment.read`    | View installment plans and schedules.                                            |
| `finance.installment.create`  | Create installment plans.                                                        |
| `finance.payment.read`        | View payments.                                                                   |
| `finance.payment.record`      | Record manual payment.                                                           |
| `finance.receipt.read`        | View and render receipt.                                                         |
| `finance.receipt.issue`       | Issue receipt as part of successful payment posting.                             |
| `finance.refund.read`         | View refund records.                                                             |
| `finance.refund.request`      | Submit refund request.                                                           |
| `finance.refund.approve`      | Approve or reject refund request.                                                |
| `finance.refund.execute`      | Mark approved refund as financially executed after authorized settlement action. |
| `finance.receivable.read`     | View receivable balances and aging.                                              |
| `finance.credit.read`         | View corporate credit exposure and rules.                                        |
| `finance.credit.manage`       | Create or supersede effective-dated corporate credit rules.                      |
| `finance.report.branch`       | View branch-level finance summaries.                                             |
| `finance.report.consolidated` | View authorized consolidated multi-branch finance summaries.                     |
| `finance.export`              | Export authorized finance data.                                                  |
| `finance.audit.read`          | View finance audit trail.                                                        |

### Permission Enforcement Rules

1. Authentication is required for every administrative finance operation.
2. Authorization is enforced on the server before query execution or mutation.
3. Branch scope is derived from authenticated UserBranchAccess and cannot be trusted from client-submitted branch identifiers alone.
4. A user requesting consolidated data must have `finance.report.consolidated` and eligible multi-branch or hierarchy access.
5. Refund approval cannot be granted solely because a user can request refunds.
6. Read permissions do not imply export permissions.
7. Audit access is separate from transaction mutation permissions.
8. Payment collection is denied when the collector lacks access to the invoice branch.
9. Cross-branch corporate invoices require an explicitly authorized consolidated billing workflow and must preserve each line item’s source enrollment branch.
10. Permission and branch denials must return a non-disclosing authorization error and must be security-logged.

## 9. Security and Audit Requirements Summary

1. All finance mutations require authenticated user identity and server-side permission checks.
2. Branch filters must be mandatory predicates in finance application queries unless a consolidated permission path is explicitly selected and authorized.
3. Client-calculated totals are never authoritative; monetary totals are recomputed server-side using decimal-safe arithmetic.
4. Currency precision follows the configured currency scale. OMR calculations must not use binary floating-point arithmetic.
5. Invoice, payment, receipt, refund, installment, and receivable IDs must use non-guessable identifiers.
6. Invoice numbers, payment numbers, refund numbers, and receipt numbers must come from controlled numbering series and be unique under their configured scope.
7. Sensitive payment references are stored only to the degree operationally required; full payment-card credentials must not be stored in this module.
8. Every payment-posting attempt must be idempotent using a server-validated request key or equivalent duplicate-detection mechanism.
9. Audit records must capture actor user ID, branch context, entity type, entity ID, action, old value, new value, reason where required, IP address when available, and GST timestamp.
10. Refund request, approval, rejection, and execution are separately audited actions.
11. Corporate credit-rule changes must retain historical effective dates and audit history.
12. Posted financial transactions cannot be hard-deleted. Invalid posted records must be cancelled, reversed, refunded, or superseded according to state and business rule.
13. Export operations must be permission-controlled and audit-logged with filter criteria and row count.
14. Personally identifiable information displayed on finance screens and documents must be limited to the operational purpose and protected by the broader ASTI access model.
15. Security logs must not expose raw sensitive values or secrets.
16. Concurrent mutations must use optimistic locking or transactional conflict detection to prevent lost updates.
17. Payment posting, invoice balance update, receivable update, installment allocation, receipt creation, and audit persistence must be transactionally consistent.

## 10. Non-Functional Requirements Summary

| Category              | Requirement                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance           | Standard invoice, payment, receipt, refund, and receivable detail reads should complete within 2 seconds at the 95th percentile under normal production load, excluding file-rendering time. |
| Performance           | Standard paginated search requests should complete within 3 seconds at the 95th percentile for supported production data volumes and indexed filters.                                        |
| Transaction Integrity | Invoice issue and payment posting must be atomic. Partial database persistence is not acceptable.                                                                                            |
| Consistency           | Balance-changing operations require strong transactional consistency within the modular monolith database transaction boundary.                                                              |
| Availability          | Finance functionality should target at least 99.9% monthly availability excluding approved maintenance windows.                                                                              |
| Scalability           | Search and reporting queries must use pagination, indexed branch/date/status/customer keys, and bounded export workflows.                                                                    |
| Concurrency           | Mutable financial aggregates must use version-based optimistic locking or equivalent transactional conflict detection.                                                                       |
| Reliability           | Payment posting must be idempotent; duplicate submission must not create duplicate Payment or Receipt records.                                                                               |
| Security              | All operations require server-side authentication, authorization, branch scoping, and input validation.                                                                                      |
| Auditability          | Sensitive financial mutations must produce complete audit events and preserve original transaction history.                                                                                  |
| Localization          | Dates and business-day calculations default to Oman GST (UTC+4); invoice and receipt presentation supports English and Arabic where configured.                                              |
| Precision             | Monetary arithmetic must use fixed-precision decimal semantics and preserve configured currency scale.                                                                                       |
| Usability             | Finance UI must display currency, due date, payment status, outstanding balance, and branch context clearly before payment or refund actions.                                                |
| Accessibility         | Administrative screens should meet WCAG 2.1 AA interaction and contrast expectations for supported components.                                                                               |
| Observability         | Structured logs, metrics, and traces must cover invoice issue, payment posting, receipt generation, refund state change, aging recalculation, and credit validation boundaries.              |
| Recoverability        | Owned finance tables must be included in database backup and recovery procedures; restoration validation must include financial referential integrity and balance reconciliation checks.     |
