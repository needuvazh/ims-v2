# Part 6 – Permission Matrix

## Module 12 – Fee, Billing & Receivables Management

## 1. Permission Model Principles

Module 12 uses capability-based RBAC. Business role names provide a default assignment matrix only; authorization code must evaluate permission grants and branch entitlements at runtime. Role names must not be hardcoded into Finance services.

Every permission evaluation combines:

1. authenticated user identity;
2. active permission grant;
3. active assigned branch access;
4. optional child-branch or consolidated entitlement;
5. resource-specific scope such as enrollment, corporate account, or audit assignment;
6. command-specific separation-of-duties rules.

`finance.report.consolidated` does not grant row-level invoice access. `finance.refund.request` does not imply `finance.refund.approve`. `finance.refund.approve` does not imply `finance.refund.execute`. `finance.invoice.read` does not imply `finance.export`.

## 2. Business Roles

| Role | Finance Responsibility |
|---|---|
| Super Admin | Platform-level administration with explicit permission grants; does not bypass branch or financial separation-of-duties checks automatically. |
| Finance Manager | Supervises branch or authorized hierarchy finance, approves refunds, manages credit policy, and views finance reports. |
| Accountant / Finance Officer | Creates invoices, installment plans, records payments, issues operational finance documents, monitors receivables, and requests refunds. |
| Branch Admin / Branch Manager | Oversees branch finance, views branch reports, and may receive delegated refund or invoice permissions. |
| Counselor / Admission Officer | Reads enrollment-linked fee summary, installment status, receipt availability, and payment-validation status; no direct transaction mutation. |
| Corporate Account Manager | Reads billing, payment, receipt, refund status, receivables, and credit exposure for managed corporate accounts; may request refunds when explicitly granted. |
| Academic Coordinator | Reads payment-validation status required for completion workflow; no unrestricted finance navigation. |
| Trainer | No operational Finance permissions; may see only non-financial eligibility status through Exam/Completion UI. |
| Student | Self-service read access to own invoices, installment schedules, payments, receipts, and refund statuses when Student Portal is enabled. |
| Auditor / Compliance Reviewer | Read-only finance entity and audit-trail access in explicitly assigned audit scope. |
| Executive / Consolidated Report Viewer | Aggregated consolidated reporting and approved export access; transaction row access is not implied. |
| Communication System | Consumes approved minimum-necessary event payloads; no human menu permission. |
| Reporting System | Reads branch-scoped projections through Finance query ports; no mutation permission. |

## 3. Action-Level Permission Catalog

| Permission Code | Capability |
|---|---|
| `finance.invoice.read` | Search and view authorized invoices and line details. |
| `finance.invoice.create` | Create draft invoice and edit draft attributes. |
| `finance.invoice.issue` | Issue validated draft invoice. |
| `finance.invoice.cancel` | Cancel eligible unpaid invoice with reason. |
| `finance.installment.read` | View installment plans and schedules. |
| `finance.installment.create` | Create installment plan for eligible invoice. |
| `finance.payment.read` | Search and view payments and allocations. |
| `finance.payment.record` | Record manual payment and trigger atomic posting. |
| `finance.receipt.read` | View or download authorized receipts. |
| `finance.receipt.issue` | Allow receipt issuance inside payment-posting workflow; not a standalone user command. |
| `finance.refund.read` | Search and view refund requests and status. |
| `finance.refund.request` | Submit refund request. |
| `finance.refund.approve` | Approve or reject eligible refund request subject to maker-checker rule. |
| `finance.refund.execute` | Record approved refund execution. |
| `finance.receivable.read` | View receivable balances and aging records. |
| `finance.credit.read` | View effective credit rules and exposure calculations. |
| `finance.credit.manage` | Create, end-date, or supersede effective corporate credit rules. |
| `finance.report.branch` | View branch-level financial summaries and KPIs. |
| `finance.report.consolidated` | View authorized consolidated finance summaries. |
| `finance.export` | Export permitted finance datasets after branch filtering. |
| `finance.audit.read` | View finance audit records in assigned scope. |
| `finance.self.invoice.read` | Student Portal access to own invoices only. |
| `finance.self.installment.read` | Student Portal access to own installment schedule only. |
| `finance.self.payment.read` | Student Portal access to own payment history only. |
| `finance.self.receipt.read` | Student Portal access to own receipts only. |
| `finance.self.refund.read` | Student Portal access to own refund status only. |

## 4. Action-Level Role Matrix

Legend: **A** = default allow assignment; **C** = conditional/delegated; **R** = restricted self/account-linked read; **—** = no default assignment.

| Permission | Super Admin | Finance Manager | Accountant | Branch Admin | Counselor | Corporate Acct. Mgr | Academic Coord. | Trainer | Student | Auditor | Executive |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `finance.invoice.read` | A | A | A | A | R | R | R | — | — | A | — |
| `finance.invoice.create` | C | A | A | C | — | — | — | — | — | — | — |
| `finance.invoice.issue` | C | A | A | C | — | — | — | — | — | — | — |
| `finance.invoice.cancel` | C | A | C | C | — | — | — | — | — | — | — |
| `finance.installment.read` | A | A | A | A | R | R | R | — | — | A | — |
| `finance.installment.create` | C | A | A | C | — | — | — | — | — | — | — |
| `finance.payment.read` | A | A | A | A | R | R | R | — | — | A | — |
| `finance.payment.record` | C | A | A | C | — | — | — | — | — | — | — |
| `finance.receipt.read` | A | A | A | A | R | R | — | — | — | A | — |
| `finance.receipt.issue` | System | System | System | System | — | — | — | — | — | — | — |
| `finance.refund.read` | A | A | A | A | R | R | — | — | — | A | — |
| `finance.refund.request` | C | A | A | C | — | C | — | — | — | — | — |
| `finance.refund.approve` | C | A | — | C | — | — | — | — | — | — | — |
| `finance.refund.execute` | C | A | C | — | — | — | — | — | — | — | — |
| `finance.receivable.read` | A | A | A | A | R | R | R | — | — | A | — |
| `finance.credit.read` | A | A | A | A | — | R | — | — | — | A | R |
| `finance.credit.manage` | C | A | — | C | — | — | — | — | — | — | — |
| `finance.report.branch` | A | A | A | A | — | R | — | — | — | A | C |
| `finance.report.consolidated` | C | C | — | C | — | C | — | — | — | C | A |
| `finance.export` | C | A | C | C | — | C | — | — | — | C | C |
| `finance.audit.read` | C | A | — | C | — | — | — | — | — | A | — |
| `finance.self.invoice.read` | — | — | — | — | — | — | — | — | A | — | — |
| `finance.self.installment.read` | — | — | — | — | — | — | — | — | A | — | — |
| `finance.self.payment.read` | — | — | — | — | — | — | — | — | A | — | — |
| `finance.self.receipt.read` | — | — | — | — | — | — | — | — | A | — | — |
| `finance.self.refund.read` | — | — | — | — | — | — | — | — | A | — | — |

### 4.1 Conditional Assignment Rules

- Super Admin may receive finance mutations, but platform administration status alone must not bypass maker-checker restrictions or branch predicates.
- Branch Admin permissions apply only to assigned branches and permitted child branches.
- Counselor and Academic Coordinator access is mediated through enrollment-linked summary services; unrestricted finance search is not granted by default.
- Corporate Account Manager access is constrained to managed corporate accounts and authorized branches.
- Executive access is aggregated by default; transaction-detail read requires separate operational permission.
- Student permissions always require subject ownership: authenticated Person → StudentProfile → target Invoice/Payment/Receipt/Refund relationship.

## 5. Menu-Level Permissions

### 5.1 Menu Permission Catalog

| Menu Permission | Navigation Item |
|---|---|
| `menu.finance` | Finance root menu. |
| `menu.finance.dashboard` | Finance dashboard. |
| `menu.finance.invoices` | Invoices. |
| `menu.finance.installments` | Installment plans and schedules. |
| `menu.finance.payments` | Payments. |
| `menu.finance.receipts` | Receipts. |
| `menu.finance.refunds` | Refunds. |
| `menu.finance.receivables` | Receivables and aging. |
| `menu.finance.credit` | Corporate credit. |
| `menu.finance.reports` | Finance reports. |
| `menu.finance.audit` | Finance audit trail. |
| `menu.student.billing` | Student Portal billing root. |
| `menu.student.invoices` | Student Portal invoices. |
| `menu.student.payments` | Student Portal payment history. |
| `menu.student.receipts` | Student Portal receipts. |
| `menu.student.refunds` | Student Portal refund status. |

### 5.2 Menu-Level Role Matrix

| Menu | Super Admin | Finance Manager | Accountant | Branch Admin | Counselor | Corp. Acct. Mgr | Academic Coord. | Trainer | Student | Auditor | Executive |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `menu.finance` | A | A | A | A | C | C | — | — | — | A | A |
| `menu.finance.dashboard` | A | A | A | A | — | C | — | — | — | A | A |
| `menu.finance.invoices` | A | A | A | A | C | C | — | — | — | A | — |
| `menu.finance.installments` | A | A | A | A | C | C | — | — | — | A | — |
| `menu.finance.payments` | A | A | A | A | C | C | — | — | — | A | — |
| `menu.finance.receipts` | A | A | A | A | C | C | — | — | — | A | — |
| `menu.finance.refunds` | A | A | A | A | C | C | — | — | — | A | — |
| `menu.finance.receivables` | A | A | A | A | — | C | — | — | — | A | C |
| `menu.finance.credit` | A | A | A | C | — | C | — | — | — | A | C |
| `menu.finance.reports` | A | A | A | A | — | C | — | — | — | A | A |
| `menu.finance.audit` | C | A | — | C | — | — | — | — | — | A | — |
| `menu.student.billing` | — | — | — | — | — | — | — | — | A | — | — |
| `menu.student.invoices` | — | — | — | — | — | — | — | — | A | — | — |
| `menu.student.payments` | — | — | — | — | — | — | — | — | A | — | — |
| `menu.student.receipts` | — | — | — | — | — | — | — | — | A | — | — |
| `menu.student.refunds` | — | — | — | — | — | — | — | — | A | — | — |

### 5.3 Menu Rendering Rules

1. A menu item is hidden when its menu permission is absent.
2. Menu visibility never substitutes for API authorization.
3. Finance root menu is shown only when at least one child Finance menu is visible.
4. A user with report-only permissions sees only dashboard/report navigation and no transaction mutation navigation.
5. Student billing navigation is shown only when Student Portal is enabled and authenticated person resolves to an active StudentProfile.
6. Trainer Portal does not expose Module 12 menu items.

## 6. Report-Level Permission Catalog

| Report Permission | Report / Dataset |
|---|---|
| `report.finance.collection-efficiency` | Invoice value vs net collections for a period. |
| `report.finance.receivables-aging` | Aging by Current, 30, 60, 90, and 120+ compatibility buckets. |
| `report.finance.overdue-invoices` | Overdue invoice detail and totals. |
| `report.finance.payment-trends` | Payment counts and values by date and method. |
| `report.finance.refund-analysis` | Requested, approved, rejected, and executed refund metrics. |
| `report.finance.corporate-exposure` | Corporate credit limit, outstanding, committed, and available credit. |
| `report.finance.branch-performance` | Branch finance KPI comparison. |
| `report.finance.consolidated-summary` | Consolidated multi-branch summary. |
| `report.finance.audit-export` | Compliance-oriented finance audit extraction. |

## 7. Report-Level Role Matrix

| Report | Super Admin | Finance Manager | Accountant | Branch Admin | Counselor | Corp. Acct. Mgr | Academic Coord. | Trainer | Student | Auditor | Executive |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Collection efficiency | C | A | A | A | — | C | — | — | — | A | A |
| Receivables aging | C | A | A | A | — | C | — | — | — | A | A |
| Overdue invoices | C | A | A | A | — | C | — | — | — | A | C |
| Payment trends | C | A | A | A | — | C | — | — | — | A | A |
| Refund analysis | C | A | C | C | — | — | — | — | — | A | C |
| Corporate exposure | C | A | A | C | — | R | — | — | — | A | A |
| Branch performance | C | A | C | A | — | C | — | — | — | A | A |
| Consolidated summary | C | C | — | C | — | C | — | — | — | C | A |
| Audit export | C | C | — | — | — | — | — | — | — | A | — |

## 8. Branch Scope Matrix

| Actor / Role | Default Scope | Child Branch Expansion | Consolidated Scope | Mutation Scope |
|---|---|---|---|---|
| Super Admin | Explicit assigned branches | Only with IAM entitlement | Requires `finance.report.consolidated` and consolidated entitlement | Only branches explicitly allowed for mutation. |
| Finance Manager | Assigned finance branches | When `canViewChildBranches=true` | Conditional | Assigned mutation branches. |
| Accountant | Assigned operational branches | Normally no | No default | Assigned operational branches. |
| Branch Admin | Assigned branch | Conditional child hierarchy | Conditional and permission-gated | Assigned branch and explicitly delegated children only. |
| Counselor | Assigned admission branch | No finance hierarchy expansion by default | No | No Finance mutation. |
| Corporate Account Manager | Managed corporate accounts intersect authorized branches | Conditional | Conditional | Refund request only when separately granted. |
| Academic Coordinator | Enrollment-linked status in assigned academic branch | Conditional via academic entitlement | No | No Finance mutation. |
| Trainer | None | No | No | None. |
| Student | Own records only | No | No | None in current Module 12 scope. |
| Auditor | Explicit audit branches | Conditional | Conditional and read-only | None. |
| Executive | Aggregated authorized branches | Conditional | Yes when entitled | None. |

## 9. Separation of Duties

| Sensitive Capability | Required Control |
|---|---|
| Refund request vs approval | Requester cannot approve the same refund. |
| Refund approval vs execution | Approval permission does not automatically grant execution permission. |
| Credit-rule management | Every create/supersede operation requires reason and audit record. |
| Invoice cancellation | Requires explicit cancel permission and reason; paid invoice cannot be cancelled. |
| Finance export | Requires export permission in addition to dataset read/report permission. |
| Consolidated reporting | Requires both Finance consolidated permission and IAM consolidated/hierarchy entitlement. |
| Audit review | Audit read does not grant transaction mutation. |

## 10. Permission Enforcement Acceptance Criteria

1. Permission checks execute on the server for REST routes, Server Actions, and internal application ports.
2. Role names are never checked directly in Finance domain or application services.
3. Branch scope is resolved before resource lookup results are returned.
4. Unauthorized cross-branch identifiers do not disclose resource existence.
5. Menu permissions affect presentation only and never replace action permission checks.
6. Report permissions are evaluated separately from transaction permissions.
7. Student self-service permissions enforce ownership through Person and StudentProfile linkage.
8. Corporate account manager access is constrained by corporate-account assignment and branch intersection.
9. Trainer receives no Finance menu or transaction access.
10. Refund maker-checker restriction is enforced even when one user holds both request and approval permissions.
11. Consolidated reporting never silently widens scope beyond authorized branches.
12. Every sensitive permission denial is security-logged with actor, attempted capability, target type, branch context, and correlation ID.
