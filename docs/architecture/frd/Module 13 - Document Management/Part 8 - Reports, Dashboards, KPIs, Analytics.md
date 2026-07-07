# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 13 - Document Management

## 1. Purpose

This document defines the reports, dashboards, KPIs, analytics calculations, read models, export behavior, security scope, and data-ownership boundaries for Module 13 - Document Management.

The design is constrained by the following architecture rules:

- Document Management owns authoritative `Document` and `DocumentVerification` transactional state.
- Reporting & Executive Dashboards owns dashboard definitions, dashboard widgets, report definitions, metric snapshots, and presentation-oriented analytical projections.
- IAM owns permissions, branch access, child-branch visibility, and consolidated-report eligibility.
- Audit & Compliance owns authoritative audit records.
- Communication & Notification owns notification delivery and provider-delivery status.
- Student, Trainer, Corporate Account, Person, and future Employee data remain owned by their respective bounded contexts.
- Vercel Blob stores binary objects. Blob storage telemetry is not authoritative evidence of document business status.
- All read models described in this Part are strictly read-only projections. They do not replace, override, or become authoritative alternatives to the transactional tables owned by Document Management or any other bounded context.

This Part is aligned with Parts 1-7 and does not introduce new lifecycle states, command-side entities, permissions, or cross-context ownership.

---

# 2. Reporting Principles

1. Reports must read authoritative data through approved repositories, reporting views, materialized read models, or reporting pipelines.
2. No report, dashboard, KPI job, export endpoint, or analytics process may update `Document` or `DocumentVerification`.
3. A stale read model may delay visibility, but it must never alter transaction validity.
4. Transaction screens must not use aggregated reporting models to decide whether approval, rejection, retirement, or file access is allowed.
5. Branch-scoped reports must apply server-side owner-derived branch scope.
6. Consolidated reporting requires both the relevant report permission and IAM `canViewConsolidated = true`.
7. Report export permissions do not imply report-view permissions.
8. Direct file URLs must not be included in analytical exports.
9. Personally identifying fields must be minimized and permission-controlled.
10. Historical trend metrics must be calculated from immutable verification history, audit facts, or approved snapshots rather than inferred by overwriting current state.
11. Date-only fields such as `issueDate` and `expiryDate` must preserve their calendar date and must not shift through UTC conversion.
12. Oman business timezone defaults apply to time-based grouping and operational "today" boundaries.
13. Deleted/retired documents are excluded from normal operational KPIs unless the metric explicitly measures retirement activity.
14. Read models must be rebuildable from authoritative sources.
15. A read-model rebuild failure must not block document upload, verification, or other transactional workflows.

---

# 3. KPI Catalog

## 3.1 KPI Summary

| KPI ID | KPI Name | Definition | Calculation | Default Grain | Scope | Primary Permission |
|---|---|---|---|---|---|---|
| KPI-DOC-001 | Total Active Documents | Count of non-soft-deleted documents in authorized scope. | `COUNT(Document WHERE deletedAt IS NULL)` | Current snapshot | B/B+/C | `document.report.operational.view` |
| KPI-DOC-002 | Pending Verification Count | Active documents currently in `PendingVerification`. | `COUNT(status = PendingVerification)` | Current snapshot | B/B+/C | `document.report.verification.view` |
| KPI-DOC-003 | Verification Backlog Age | Age distribution of pending verification items. | `businessNow - submittedForVerificationAt` or approved equivalent timestamp source | Current snapshot | B/B+/C | `document.report.verification.view` |
| KPI-DOC-004 | Average Verification Turnaround Time | Average elapsed time from submission to terminal verification decision. | `AVG(decisionAt - submissionAt)` | Day/week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-005 | Median Verification Turnaround Time | Median elapsed time from submission to decision. | `P50(decisionAt - submissionAt)` | Day/week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-006 | Verification SLA Compliance Rate | Percentage of completed verification decisions within configured target duration. | `(decisions within target / decisions total) * 100` | Day/week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-007 | Approval Rate | Approved decisions as a percentage of terminal verification decisions. | `Approved / (Approved + Rejected) * 100` | Day/week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-008 | Rejection Rate | Rejected decisions as a percentage of terminal verification decisions. | `Rejected / (Approved + Rejected) * 100` | Day/week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-009 | Expired Active Documents | Active documents whose effective expiry date is before business date. | `COUNT(expiryDate < businessDate)` | Current snapshot | B/B+/C | `document.report.expiry.view` |
| KPI-DOC-010 | Expiring in 30 Days | Active documents expiring from business date through +30 calendar days. | `COUNT(expiryDate BETWEEN today AND today+30)` | Current snapshot | B/B+/C | `document.report.expiry.view` |
| KPI-DOC-011 | Expiring in 31-60 Days | Active documents expiring from +31 through +60 days. | Date-window count | Current snapshot | B/B+/C | `document.report.expiry.view` |
| KPI-DOC-012 | Expiring in 61-90 Days | Active documents expiring from +61 through +90 days. | Date-window count | Current snapshot | B/B+/C | `document.report.expiry.view` |
| KPI-DOC-013 | Missing Expiry Date Count | Count of active documents of configured expiry-relevant types with null `expiryDate`. | Configurable type set + null expiry | Current snapshot | B/B+/C | `document.report.compliance.view` |
| KPI-DOC-014 | Verification Coverage Rate | Percentage of active documents that are Approved among documents requiring verification. | `Approved eligible docs / eligible docs * 100` | Current snapshot | B/B+/C | `document.report.compliance.view` |
| KPI-DOC-015 | Document Type Coverage | Distribution and count of active documents by document type. | `COUNT GROUP BY documentType` | Current snapshot | B/B+/C | `document.report.owner.view` |
| KPI-DOC-016 | Owner Type Coverage | Distribution of active documents by owner type. | `COUNT GROUP BY ownerType` | Current snapshot | B/B+/C | `document.report.owner.view` |
| KPI-DOC-017 | Owners with No Documents | Count of eligible owners returned by owning-context reporting adapters with zero active documents. | owner population LEFT JOIN document projection | Current snapshot | B/B+/C | `document.report.owner.view` |
| KPI-DOC-018 | Owners with Expired Evidence | Distinct owners with one or more expired active documents. | `COUNT(DISTINCT ownerRef)` | Current snapshot | B/B+/C | `document.report.compliance.view` |
| KPI-DOC-019 | Repeated Rejection Count | Documents with more than one rejected verification decision. | verification history group count > 1 | Week/month | B/B+/C | `document.report.verification.view` |
| KPI-DOC-020 | Document Upload Volume | Number of successfully registered documents in period. | `COUNT(createdAt in period)` | Day/week/month | B/B+/C | `document.report.operational.view` |
| KPI-DOC-021 | Document Retirement Volume | Number of documents soft-retired during period, from authoritative audit facts. | count retirement actions | Day/week/month | B/B+/C | `document.report.audit.view` |
| KPI-DOC-022 | Blob Consistency Incident Count | Count of detected Blob/database consistency incidents within period. | incident facts from approved operational source | Day/week/month | G | restricted operations/report permission |
| KPI-DOC-023 | Unresolved Blob Consistency Incidents | Current number of unresolved reconciliation incidents. | active unresolved incident count | Current snapshot | G | `document.operations.reconcile` or approved ops report permission |
| KPI-DOC-024 | Branch Compliance Rate | Percentage of in-scope compliance-required documents that are Approved and not expired. | compliant required docs / required docs * 100 | Current/monthly | B+/C | `document.report.compliance.view` + consolidated rules where applicable |

## 3.2 KPI Calculation Notes

### KPI-DOC-004 / 005 - Verification Turnaround Time

Preferred calculation source:

```text
Submission event/time
      |
      v
Terminal DocumentVerification decision
      |
      v
Elapsed business duration
```

Because the current ER baseline does not explicitly define `submittedForVerificationAt` on `Document`, implementation must use one approved authoritative source:

1. an existing lifecycle timestamp in Prisma if present;
2. an immutable audit fact emitted on submission;
3. an approved append-only lifecycle event/read projection.

The reporting layer must not invent submission timestamps from `updatedAt` when updates can occur for unrelated reasons.

### KPI-DOC-006 - SLA Compliance

The verification target duration is a configuration/NFR input, not a hardcoded Document aggregate rule. The report must display the target used in the calculation metadata.

Example:

```text
Target: 2 business days
Decisions within target: 184
Total terminal decisions: 200
SLA Compliance Rate = 92.00%
```

### KPI-DOC-013 - Missing Expiry Date Count

Not every document naturally expires. Therefore:

```text
expiryDate IS NULL
```

must not automatically be treated as non-compliance. The metric applies only to document types configured as expiry-required or expiry-expected.

### KPI-DOC-014 / 024 - Compliance Metrics

The Document Management context may report its own document compliance facts, such as:

- required document present;
- approved;
- not expired.

It must not declare that a Student is eligible for enrollment, a Trainer is eligible for batch assignment, a Corporate Account is compliant for contracting, or a Certificate is eligible for issuance. Those decisions belong to the owning contexts.

---

# 4. Dashboard Architecture

## 4.1 Ownership Boundary

Document Management provides read-only document facts and module-specific metric definitions. Reporting & Executive Dashboards owns:

- `DashboardDefinition`;
- `DashboardWidget`;
- `MetricSnapshot`;
- dashboard composition;
- cross-module executive dashboard layout;
- snapshot scheduling and retention policy.

Document Management must not create duplicate dashboard definition tables.

## 4.2 Dashboard Families

### A. Document Operations Dashboard

Audience:

- Document Administrator;
- Branch Manager;
- Head Office Operations Manager;
- Compliance Officer.

Required menu/report access:

```text
document.menu.reports
AND at least one relevant document.report.* permission
```

### B. Verification Performance Dashboard

Audience:

- Document Verifier;
- Compliance Officer;
- Branch Manager;
- Head Office Operations Manager.

Primary permission:

```text
document.report.verification.view
```

### C. Expiry & Compliance Dashboard

Audience:

- Compliance Officer;
- Branch Manager;
- Head Office Operations Manager;
- authorized auditors in read-only mode.

Primary permissions:

```text
document.report.expiry.view
and/or
document.report.compliance.view
```

### D. Consolidated Document Compliance Dashboard

Audience:

- Head Office executives/operations;
- authorized MIS analysts;
- authorized compliance leadership.

Required composition:

```text
relevant document.report.* permission
AND document.report.consolidated
AND IAM.canViewConsolidated = true
```

This dashboard is read-only and does not expose transaction mutation controls.

---

# 5. Dashboard Widget Specifications

| Widget ID | Widget Title | Type | Data | Default Interaction | Permission | Scope |
|---|---|---|---|---|---|---|
| W-DOC-001 | Total Active Documents | Metric card | KPI-DOC-001 | Click opens authorized registry filter | `document.report.operational.view` | B/B+/C |
| W-DOC-002 | Pending Verification | Metric card | KPI-DOC-002 | Click opens verification report/queue based on separate menu/action permission | `document.report.verification.view` | B/B+/C |
| W-DOC-003 | Average Verification TAT | Metric card + trend | KPI-DOC-004 | Compare current period vs prior period | `document.report.verification.view` | B/B+/C |
| W-DOC-004 | Verification SLA Compliance | Gauge/progress | KPI-DOC-006 | Drill to SLA breach report | `document.report.verification.view` | B/B+/C |
| W-DOC-005 | Approval vs Rejection Trend | Line/column chart | KPI-DOC-007/008 | Period and branch filters | `document.report.verification.view` | B/B+/C |
| W-DOC-006 | Pending Backlog Aging | Stacked bar | KPI-DOC-003 | Buckets: 0-1, 2-3, 4-7, 8+ business days | `document.report.verification.view` | B/B+/C |
| W-DOC-007 | Expired Documents | Metric card | KPI-DOC-009 | Drill to expiry report | `document.report.expiry.view` | B/B+/C |
| W-DOC-008 | Upcoming Expiry Buckets | Stacked bar | KPI-DOC-010/011/012 | 0-30, 31-60, 61-90 days | `document.report.expiry.view` | B/B+/C |
| W-DOC-009 | Compliance Rate | Gauge + trend | KPI-DOC-024 | Drill by branch/document type | `document.report.compliance.view` | B+/C |
| W-DOC-010 | Document Status Distribution | Donut/bar | Counts by current effective status | Click applies status filter | `document.report.operational.view` | B/B+/C |
| W-DOC-011 | Documents by Owner Type | Bar chart | KPI-DOC-016 | Student/Trainer/Corporate/Person | `document.report.owner.view` | B/B+/C |
| W-DOC-012 | Documents by Type | Horizontal bar/table | KPI-DOC-015 | Top N plus full report link | `document.report.owner.view` | B/B+/C |
| W-DOC-013 | Upload Volume Trend | Line chart | KPI-DOC-020 | Day/week/month grain | `document.report.operational.view` | B/B+/C |
| W-DOC-014 | Repeated Rejections | Alert table | KPI-DOC-019 | Drill to document verification history | `document.report.verification.view` | B/B+/C |
| W-DOC-015 | Branch Compliance Comparison | Ranked bar/table | KPI-DOC-024 | Branch ranking, current vs previous period | `document.report.compliance.view` + consolidated requirements | C |
| W-DOC-016 | Blob Consistency Incidents | Restricted metric/alert | KPI-DOC-022/023 | Drill to operations report | `document.operations.reconcile` or approved ops report permission | G |

## 5.1 Widget Permission Behavior

1. A user without the widget's underlying report permission must not receive the widget dataset.
2. Hiding a widget in the UI is not sufficient authorization.
3. A metric-card drill-down must re-authorize the target report or transaction route.
4. Report access does not imply action access.
5. Example: a user may view Pending Verification statistics without receiving `document.verify.approve` or `document.verify.reject`.
6. Consolidated widgets must reject access when IAM consolidated capability is absent, even if the user can see one or more individual branches.

## 5.2 Recommended Dashboard Filters

Common filters:

- business date / date range;
- branch or branch hierarchy, limited by IAM scope;
- owner type;
- document type;
- verification/effective status;
- verifier, only where permitted;
- expiry bucket;
- created/uploaded period;
- decision period.

Filters must not allow users to infer data outside authorized scope through counts or autocomplete values.

---

# 6. Operational Report Catalog

## 6.1 RPT-DOC-001 - Document Registry Report

**Purpose:** Operational inventory of active documents in authorized scope.

**Permission:** `document.report.operational.view`

**Default sort:** `createdAt DESC, id ASC`

### Filters

- branch scope;
- owner type;
- owner reference/search;
- document type;
- current status;
- issue date from/to;
- expiry date from/to;
- created date from/to;
- created by, where policy permits;
- has expiry date: yes/no.

### Columns

- Document ID/reference;
- file display name;
- document type;
- owner type;
- owner display reference;
- resolved branch;
- issue date;
- expiry date;
- effective expiry indicator;
- current verification status;
- created at;
- created by display reference;
- updated at.

Sensitive owner PII is excluded by default.

### Sorting

- created date;
- updated date;
- issue date;
- expiry date;
- document type;
- owner type;
- status.

### Export

- CSV;
- XLSX;
- PDF summary/list format.

Requires `document.report.export` in addition to report-view permission.

---

## 6.2 RPT-DOC-002 - Verification Queue & Backlog Report

**Purpose:** Show pending verification workload and backlog aging.

**Permission:** `document.report.verification.view`

**Default sort:** oldest pending first.

### Filters

- branch;
- document type;
- owner type;
- pending age bucket;
- submission date range;
- assigned verifier, only if assignment model exists in approved schema;
- owner reference.

### Columns

- document reference;
- owner type;
- owner display reference;
- document type;
- submission time/date;
- pending age;
- branch;
- current status;
- last decision summary, where policy permits.

### Sorting

- pending age;
- submission date;
- document type;
- branch;
- owner type.

### Export

- CSV;
- XLSX;
- PDF.

No file URLs or raw Blob paths in exports.

---

## 6.3 RPT-DOC-003 - Verification Decision Report

**Purpose:** Analyze approved/rejected decisions and verifier throughput.

**Permission:** `document.report.verification.view`

### Filters

- decision date range;
- branch;
- verifier;
- decision status;
- document type;
- owner type;
- turnaround-time bucket.

### Columns

- verification record reference;
- document reference;
- document type;
- owner type;
- branch;
- decision status;
- verifier display reference;
- decision time;
- turnaround duration;
- rejection category, only if an approved structured category exists;
- remarks indicator, not necessarily full remarks in broad exports.

### Sorting

- decision time;
- turnaround duration;
- verifier;
- status;
- document type;
- branch.

### Export

- CSV;
- XLSX;
- PDF summary.

Full sensitive remarks should require stricter policy and should not be included in broad management exports by default.

---

## 6.4 RPT-DOC-004 - Expired Documents Report

**Purpose:** Identify active documents whose expiry date has passed.

**Permission:** `document.report.expiry.view`

### Filters

- branch;
- owner type;
- document type;
- expiry date range;
- expired age bucket;
- current verification status;
- owner reference.

### Columns

- document reference;
- owner display reference;
- owner type;
- document type;
- branch;
- issue date;
- expiry date;
- days expired;
- current status;
- last verification decision date;
- alert fact/status only if exposed through approved Communication reporting boundary.

### Default sort

Most recently expired first or greatest compliance risk first according to approved report configuration.

### Export

- CSV;
- XLSX;
- PDF.

---

## 6.5 RPT-DOC-005 - Upcoming Expiry Report

**Purpose:** Proactive worklist for documents nearing expiry.

**Permission:** `document.report.expiry.view`

### Filters

- expiry window: 7/15/30/60/90/custom days;
- branch;
- owner type;
- document type;
- owner reference;
- status.

### Columns

- document reference;
- owner display reference;
- owner type;
- branch;
- document type;
- expiry date;
- days remaining;
- current verification status;
- notification eligibility fact where available, without taking ownership of delivery status.

### Default sort

`expiryDate ASC`

### Export

- CSV;
- XLSX;
- PDF.

---

## 6.6 RPT-DOC-006 - Document Compliance Coverage Report

**Purpose:** Show document presence, approval, and expiry coverage by owner population and document type.

**Permission:** `document.report.compliance.view`

### Filters

- branch;
- owner type;
- document type;
- compliance state;
- owner population segment exposed by owning context;
- as-of business date.

### Columns

- owner reference;
- owner display name/reference;
- owner type;
- branch;
- document type;
- present yes/no;
- approved yes/no;
- expired yes/no;
- compliance fact: compliant/non-compliant/unknown according to Document Management criteria only;
- last document update date.

### Sorting

- compliance fact;
- branch;
- owner;
- document type;
- expiry date.

### Export

- CSV;
- XLSX;
- PDF summary.

**DDD restriction:** The report must not label an owner as eligible/ineligible for another context's business transaction.

---

## 6.7 RPT-DOC-007 - Document Type Distribution Report

**Purpose:** Analyze document inventory by document type and owner type.

**Permission:** `document.report.owner.view`

### Filters

- branch;
- owner type;
- document type;
- status;
- created period.

### Columns

- document type;
- owner type;
- branch;
- active count;
- approved count;
- rejected count;
- pending count;
- expired count;
- no-expiry-date count.

### Sorting

- active count;
- expired count;
- pending count;
- document type.

### Export

- CSV;
- XLSX;
- PDF.

---

## 6.8 RPT-DOC-008 - Owner Document Coverage Report

**Purpose:** Identify eligible owners with missing, incomplete, rejected, or expired document evidence.

**Permission:** `document.report.owner.view` and, for compliance interpretation, `document.report.compliance.view`.

### Filters

- branch;
- owner type;
- owner search;
- document type;
- coverage state: missing/present/pending/rejected/approved/expired;
- as-of date.

### Columns

- owner reference;
- owner display reference;
- owner type;
- branch;
- required/expected document type where configured;
- coverage state;
- document reference if present;
- status;
- expiry date;
- days remaining/expired.

### Sorting

- coverage risk;
- expiry date;
- owner;
- branch.

### Export

- CSV;
- XLSX;
- PDF summary.

Owner population and eligibility for inclusion are sourced from the owning context through approved read adapters or reporting projections.

---

## 6.9 RPT-DOC-009 - Verification SLA Performance Report

**Purpose:** Measure turnaround performance against configured target.

**Permission:** `document.report.verification.view`

### Filters

- decision period;
- branch;
- verifier;
- document type;
- owner type;
- within SLA/breached SLA;
- turnaround bucket.

### Columns

- period;
- branch;
- verifier;
- decisions completed;
- average TAT;
- median TAT;
- P90 TAT where supported;
- SLA target used;
- within-SLA count;
- breach count;
- SLA compliance percentage.

### Sorting

- SLA compliance rate;
- average TAT;
- breach count;
- branch;
- verifier.

### Export

- CSV;
- XLSX;
- PDF management summary.

---

## 6.10 RPT-DOC-010 - Rejection Analysis Report

**Purpose:** Identify recurring rejection patterns without changing verification rules.

**Permission:** `document.report.verification.view`

### Filters

- rejection period;
- branch;
- document type;
- owner type;
- verifier;
- repeated rejection: yes/no;
- structured rejection category if approved in schema.

### Columns

- document type;
- owner type;
- branch;
- rejection count;
- distinct documents rejected;
- repeated-rejection count;
- rejection rate;
- median time to subsequent decision where calculable.

### Sorting

- rejection count;
- rejection rate;
- repeated rejection count.

### Export

- CSV;
- XLSX;
- PDF.

Free-text remarks analytics are excluded unless separately approved for privacy, security, and NLP processing.

---

## 6.11 RPT-DOC-011 - Document Activity Audit Report

**Purpose:** Provide authorized document-related action evidence from Audit & Compliance.

**Permission:** `document.report.audit.view` plus Audit policy.

### Filters

- action period;
- branch;
- actor;
- action type;
- entity/document reference;
- owner type;
- document type.

### Columns

- performed at;
- actor reference;
- action;
- document reference;
- entity type;
- branch scope;
- reason indicator;
- old/new value summary or audit reference according to policy;
- correlation/request ID where available.

### Sorting

- performed at;
- action;
- actor;
- document reference.

### Export

- CSV;
- XLSX;
- PDF.

The report reads Audit & Compliance-owned records. Document Management does not duplicate `AuditLog`.

---

## 6.12 RPT-DOC-012 - Blob Consistency Operations Report

**Purpose:** Restricted operational visibility into missing Blob, orphaned Blob, or inconsistent registration conditions.

**Permission:** `document.operations.reconcile` or a future separately approved operations-report permission.

**Scope:** Global operational scope only.

### Filters

- incident detected period;
- incident type;
- resolution state, if approved persistence exists;
- document reference;
- Blob object reference/hash;
- retry count, if approved persistence exists.

### Columns

- incident reference;
- incident type;
- document reference;
- detected at;
- current resolution state;
- latest retry time;
- retry count;
- error category;
- correlation ID.

### Sorting

- detected at;
- incident type;
- retry count;
- status.

### Export

- CSV and XLSX only by default.

**Gap:** Durable reconciliation incident persistence is not currently defined in the DDD/ER baseline and requires an architecture decision before this report can be implemented as a persisted operational report.

---

# 7. Export Standards

## 7.1 Supported Formats

| Format | Use | Rules |
|---|---|---|
| CSV | Large flat operational datasets | UTF-8 BOM where required for spreadsheet compatibility; stable headers; no raw Blob URL. |
| XLSX | Business analysis and filtered reports | Bilingual-safe; date cells as calendar dates; filter metadata sheet recommended. |
| PDF | Human-readable operational or management summary | Page headers, filter summary, generation timestamp, scope label, page numbers. |

## 7.2 Export Authorization

Branch export:

```text
report-specific view permission
AND document.report.export
AND authorized branch scope
```

Consolidated export:

```text
report-specific view permission
AND document.report.consolidated
AND document.report.consolidated.export
AND IAM.canViewConsolidated = true
```

## 7.3 Export Safety Rules

Exports must not include:

- permanent Vercel Blob URLs;
- signed download URLs;
- credentials or tokens;
- unrestricted verification remarks;
- PII fields not necessary for the report purpose;
- data from inaccessible branches;
- deleted records unless the report explicitly covers retirement/audit activity.

Every export should capture:

- generatedAt;
- report ID/name;
- applied filters;
- scope type: branch/branch hierarchy/consolidated/global;
- requesting user reference in server-side export audit metadata;
- row count.

---

# 8. Read Models and Reporting Views

## 8.1 General Rule

All views below are **read-only projections**.

They must not:

- accept INSERT, UPDATE, or DELETE commands;
- be used as aggregate repositories;
- replace `Document` or `DocumentVerification`;
- become the source for lifecycle transitions;
- become the source of owner validity or IAM branch permissions;
- be used to authorize file access;
- write back calculated status into transactional tables.

Commands must continue through Document Management application services and authoritative transactional repositories.

---

## 8.2 `rm_document_registry`

**Purpose:** Fast document registry list and filter projection.

### Suggested columns

```text
documentId
fileName
documentType
ownerType
ownerId
ownerDisplayReference
resolvedBranchId
resolvedBranchName
issueDate
expiryDate
effectiveExpiryState
verificationStatus
createdAt
createdBy
updatedAt
isRetired
```

### Sources

- Document Management authoritative `Document`;
- approved owner display/branch projection from owning contexts;
- no authoritative owner state duplicated beyond display/reporting purposes.

### Refresh model

- database view for moderate scale; or
- incrementally refreshed projection/materialized view where query volume requires it.

---

## 8.3 `rm_document_verification_queue`

**Purpose:** Pending-verification backlog and aging.

### Suggested columns

```text
documentId
ownerType
ownerId
ownerDisplayReference
documentType
resolvedBranchId
submittedAt
pendingAgeMinutes
pendingAgeBucket
currentStatus
lastDecisionAt
lastDecisionStatus
version
```

`version` may be displayed for diagnostics but must not be used by reporting to execute commands.

### Source caution

`submittedAt` must come from an authoritative lifecycle timestamp or immutable event/audit fact. It must not be guessed from generic `updatedAt`.

---

## 8.4 `rm_document_expiry_workbench`

**Purpose:** Expired and upcoming-expiry operational reporting.

### Suggested columns

```text
documentId
ownerType
ownerId
ownerDisplayReference
documentType
resolvedBranchId
issueDate
expiryDate
businessDate
daysToExpiry
expiryBucket
verificationStatus
effectiveComplianceFact
```

### Expiry buckets

```text
Expired 90+ days
Expired 31-90 days
Expired 1-30 days
Expires today
1-7 days
8-30 days
31-60 days
61-90 days
90+ days
No expiry date
```

The view may calculate `effectiveExpiryState` even when the implementation decision is to persist or not persist `Expired` as current status. It must not write that calculated state back to `Document`.

---

## 8.5 `rm_document_verification_performance`

**Purpose:** Aggregate verification throughput, TAT, and SLA performance.

### Suggested grain

```text
businessDate
branchId
verifierUserId
documentType
ownerType
```

### Suggested measures

```text
submittedCount
approvedCount
rejectedCount
terminalDecisionCount
avgTatMinutes
medianTatMinutes
p90TatMinutes
slaTargetMinutes
withinSlaCount
breachCount
slaComplianceRate
```

### Sources

- immutable `DocumentVerification` history;
- authoritative submission lifecycle fact;
- configuration/NFR target snapshot metadata where needed.

---

## 8.6 `rm_document_compliance_summary`

**Purpose:** Reporting-only compliance coverage facts.

### Suggested columns

```text
asOfDate
resolvedBranchId
ownerType
ownerId
documentType
isPresent
isApproved
isExpired
complianceFact
latestDocumentId
latestExpiryDate
```

### Important restriction

`complianceFact` means only document evidence compliance according to approved Document Management reporting criteria. It does not mean:

- enrollment eligible;
- trainer assignable;
- corporate credit approved;
- certificate eligible;
- admission approved.

Those decisions belong to other bounded contexts.

---

## 8.7 `rm_document_branch_kpi_daily`

**Purpose:** Daily branch-level metric snapshot input for dashboard trends.

### Suggested grain

```text
snapshotDate
branchId
```

### Measures

```text
totalActiveDocuments
pendingVerificationCount
expiredCount
expiring30Count
approvedCount
rejectedCount
verificationCoverageRate
documentComplianceRate
uploadCount
terminalDecisionCount
avgTatMinutes
```

### Ownership

The read projection can be produced from Document facts, while persisted generic `MetricSnapshot` remains owned by Reporting & Dashboards according to the ER model.

---

# 9. Read Model Refresh and Consistency

## 9.1 Permitted Strategies

Within the modular monolith, acceptable strategies include:

1. ordinary SQL views for directly queryable projections;
2. materialized views refreshed on an approved schedule;
3. same-database reporting projection tables updated through application jobs;
4. Reporting-owned `MetricSnapshot` generation for historical KPI charts.

This Part does not require microservices, an external broker, CQRS, or Event Sourcing.

## 9.2 Freshness Classes

| Class | Use Case | Suggested Target |
|---|---|---|
| Near-current operational | Verification queue, expiry workbench | seconds to a few minutes depending on implementation |
| Daily operational analytics | Upload trends, coverage, branch summary | daily or more frequent |
| Historical executive trends | Monthly compliance, verification performance | snapshot-based |

Exact refresh intervals belong to architecture/NFR configuration and should be validated in Part 10/11.

## 9.3 Read Model Failure Behavior

If a reporting projection is stale or unavailable:

- transactional document upload must continue if dependencies are healthy;
- verification commands must continue if authoritative tables are healthy;
- expiry evaluation command/job behavior must not depend on a stale report projection;
- dashboard UI must show data freshness or unavailable state;
- the system must not silently present stale metrics as real-time.

---

# 10. Branch and Consolidated Reporting Rules

## 10.1 Branch Scope Resolution

Because the current ER model does not define `Document.branchId`, reports must derive branch scope from the document owner through approved owner-context read projections.

```text
Document.ownerType + ownerId
        |
        v
Approved owner-context reporting adapter/projection
        |
        v
Resolved branch scope
        |
        v
IAM effective branch access predicate
        |
        v
Report result
```

## 10.2 Scope Rules

| Scope | Rule |
|---|---|
| B | Only owners/documents resolving to directly assigned branches. |
| B+ | Includes child branches only when IAM `canViewChildBranches = true`. |
| C | Consolidated read-only result; requires report permission, `document.report.consolidated`, and IAM `canViewConsolidated = true`. |
| G | Exceptional operational scope, primarily reconciliation operations. |

## 10.3 Person Owner Gap

Generic `Person` documents may not have a deterministic branch relationship in the current ER model.

Until an approved branch-resolution rule exists:

- branch reports must fail closed or exclude unresolved Person documents with an explicit data-quality count;
- consolidated totals must disclose unresolved-scope exclusions;
- the reporting layer must not invent a branch from uploader, last viewer, or current user's branch.

---

# 11. Analytics Dimensions

Approved dimensions include:

- business date;
- decision date;
- upload/created date;
- branch;
- branch hierarchy;
- owner type;
- document type;
- current verification status;
- effective expiry bucket;
- verifier;
- SLA result;
- compliance fact.

Prohibited or restricted analytics dimensions unless explicitly approved:

- nationality;
- gender;
- civil ID/passport value;
- sensitive free-text verification remarks;
- file contents;
- permanent Blob location;
- arbitrary profiling attributes unrelated to Document Management purpose.

---

# 12. Data Quality Metrics

The following data-quality metrics are recommended because they directly affect Document Management reporting accuracy.

| DQ ID | Metric | Meaning | Owner/Action |
|---|---|---|---|
| DQ-DOC-001 | Unresolved Owner Reference Count | Document owner reference cannot be resolved. | Document Management investigates association integrity; owning context remains authoritative for owner. |
| DQ-DOC-002 | Unresolved Branch Scope Count | Owner exists but branch reporting scope cannot be resolved. | Architecture/owner-context integration issue. |
| DQ-DOC-003 | Missing File Object Count | Document metadata exists but file object is unavailable. | Restricted reconciliation operations. |
| DQ-DOC-004 | Orphan Blob Candidate Count | Blob object exists without registered Document metadata. | Restricted reconciliation operations; persistence owner is an open gap. |
| DQ-DOC-005 | Status-History Mismatch Count | Current status conflicts with latest immutable verification decision according to approved lifecycle semantics. | Document Management consistency investigation. |
| DQ-DOC-006 | Invalid Date Order Count | `expiryDate < issueDate` in legacy/imported data. | Document Management data remediation under audited process. |
| DQ-DOC-007 | Missing Expiry on Expiry-Required Type | Required expiry type lacks expiry date. | Document operations/compliance follow-up. |

These are monitoring/reporting facts. Automated correction must not occur through a read model.

---

# 13. Dashboard Dynamic States

## 13.1 Loading

- metric cards: fixed-size skeletons;
- charts: chart-area skeleton without fake trend lines;
- tables: row skeletons preserving column layout;
- consolidated dashboard: independent widget loading permitted, but each widget must show its own freshness state.

## 13.2 Empty State

Examples:

- `No pending documents in your authorized scope.`
- `No documents expire in the selected period.`
- `No verification decisions match the selected filters.`

Empty state must be distinguished from authorization failure and system error.

## 13.3 Stale Data State

Display:

- `Last refreshed at` timestamp;
- stale indicator when freshness target is exceeded;
- no misleading "live" label.

## 13.4 Partial Data State

Where branch resolution or cross-context owner projection is incomplete, the report must disclose:

```text
Included records: N
Excluded due to unresolved scope: M
As-of timestamp: T
```

It must not silently assign unresolved records to the current branch.

---

# 14. Bilingual Reporting Rules

1. Dashboard labels and report headers must support English and Arabic.
2. English renders LTR; Arabic renders RTL.
3. Numeric identifiers, codes, UUIDs, file names, and ISO dates remain readable in their natural LTR direction inside RTL layouts.
4. Chart axes and legends mirror appropriately for RTL without reversing chronological meaning.
5. Date ranges remain semantically ascending even when controls are mirrored.
6. CSV machine headers should remain stable canonical identifiers where integrations depend on them; user-facing XLSX/PDF headers may be localized.
7. Exported PDF layout must support Arabic shaping and page direction correctly.
8. Document type localized labels should come from the approved Configuration representation where available.

---

# 15. Report-to-Permission Matrix

| Report | View Permission | Export Permission | Consolidated Additional Requirement |
|---|---|---|---|
| RPT-DOC-001 Registry | `document.report.operational.view` | `document.report.export` | `document.report.consolidated` + IAM consolidated capability + consolidated export for export |
| RPT-DOC-002 Verification Queue | `document.report.verification.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-003 Verification Decisions | `document.report.verification.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-004 Expired Documents | `document.report.expiry.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-005 Upcoming Expiry | `document.report.expiry.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-006 Compliance Coverage | `document.report.compliance.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-007 Type Distribution | `document.report.owner.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-008 Owner Coverage | `document.report.owner.view` and where applicable compliance view | `document.report.export` | Same consolidated composition |
| RPT-DOC-009 SLA Performance | `document.report.verification.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-010 Rejection Analysis | `document.report.verification.view` | `document.report.export` | Same consolidated composition |
| RPT-DOC-011 Audit Activity | `document.report.audit.view` plus Audit policy | approved export capability | Audit policy + consolidated rules |
| RPT-DOC-012 Blob Consistency | `document.operations.reconcile` or approved future ops report permission | explicit restricted export policy | Global operations only; not ordinary consolidated business reporting |

---

# 16. Role-to-Dashboard Recommendations

These are recommended IAM role bundles, not hardcoded role checks.

| Business Role | Recommended Dashboard Access |
|---|---|
| Document Administrator | Operations, Expiry, selected Verification summary within branch scope. |
| Document Verifier | Verification Performance and own/authorized queue statistics; no compliance mutation implied. |
| Compliance Officer | Expiry & Compliance, Verification trends, audit-oriented document views subject to policy. |
| Branch Manager | Branch Operations, Expiry & Compliance, branch-level Verification Performance. |
| Head Office Operations Manager | Multi-branch dashboards when consolidated permission and IAM capability are granted. |
| Auditor / Compliance Reviewer | Read-only audit/compliance reporting subject to Audit policy. |
| MIS Analyst | Approved report/dashboard datasets; no transaction mutation or file access. |
| Reconciliation Operator | Restricted Blob consistency widget/report only. |
| Student / Trainer Self-Service User | No administrative dashboard. Self-service document status widgets, if future portals are activated, must use identity-bound SELF scope and separate portal permissions. |

---

# 17. DDD Fit and Ownership Check

| Reporting Concern | Correct Owner | Module 13 Role | Fit Result |
|---|---|---|---|
| Document transactional metadata | Document Management | Authoritative source | Aligned |
| Verification history | Document Management | Authoritative source | Aligned |
| Expiry facts | Document Management | Authoritative/derived source | Aligned |
| Dashboard definition | Reporting & Dashboards | Consumer/provider of document metrics only | Aligned |
| Dashboard widget configuration | Reporting & Dashboards | Supplies document-specific dataset contract | Aligned |
| Metric snapshots | Reporting & Dashboards | Source facts from DOC; snapshot ownership stays reporting | Aligned |
| Branch access | IAM | DOC reports enforce resolved scope | Aligned |
| Owner master data | Owning bounded context | Referenced through approved reporting adapters | Aligned |
| Audit history | Audit & Compliance | Referenced for audit report | Aligned |
| Notification delivery metrics | Communication & Notification | Referenced only through approved reporting boundary | Aligned |
| Blob binary storage | Infrastructure adapter | Not a business analytics authority | Aligned |
| Certificate compliance | Certificate Management | Not calculated by DOC dashboards | Aligned |
| Enrollment eligibility | Admission & Enrollment | Not calculated by DOC dashboards | Aligned |
| Trainer assignment eligibility | Training Delivery / Trainer contexts | Not calculated by DOC dashboards | Aligned |

---

# 18. ER Model Alignment Check

The ER baseline defines:

- `Document` for document metadata/current status;
- `DocumentVerification` for verification records;
- `DashboardDefinition`;
- `DashboardWidget`;
- `MetricSnapshot`.

This Part therefore follows these rules:

1. Document metrics originate from `Document` and `DocumentVerification` facts.
2. Generic dashboard metadata and snapshots are not moved into the Document Management bounded context.
3. Read models may denormalize owner display and branch reporting attributes, but those attributes remain non-authoritative copies/projections.
4. No additional command-side reporting aggregate is introduced.
5. No report writes back to `Document` or `DocumentVerification`.
6. The current ER ambiguity around `Expired` persistence is handled through deterministic effective-expiry projections without forcing a new status column.
7. Person-owner branch scope remains a gap and is not solved through invented report logic.

---

# 19. Traceability to Earlier FRD Parts

| Earlier Part | Part 8 Alignment |
|---|---|
| Module Overview / Part 1 | Implements compliance visibility, reporting consumption, expiry facts, branch/consolidated constraints. |
| Part 2 | Uses existing verification and expiry workflows; introduces no new lifecycle transitions. |
| Part 3 | Supports Document Registry, Verification Queue, Expiry Workbench, Audit/History, and operations views. |
| Part 4 | Uses `Document` and `DocumentVerification` as authoritative owned entities; reporting models remain projections. |
| Part 5 | Report endpoints/actions should apply the same authentication and owner-derived branch-scope principles as transactional APIs. |
| Part 6 | Uses canonical action/menu/report permissions and B/B+/C/G scope classifications. |
| Part 7 | Uses defined error/validation ownership and notification event boundaries; delivery state is not duplicated. |

---

# 20. Known Gaps and Decisions Required

## GAP-DOC-RPT-001 - Prisma Schema Validation

The Prisma schema has not been validated in the provided source set used for this FRD sequence. Final SQL/view definitions must be reconciled with actual model and field names.

## GAP-DOC-RPT-002 - Submission Timestamp Source

Verification turnaround analytics require an authoritative submission timestamp. The ER baseline does not explicitly define this field on `Document`.

Decision required: use approved Prisma field, immutable audit fact, or lifecycle event projection.

## GAP-DOC-RPT-003 - Person Branch Resolution

Generic Person-owned documents lack a fully defined branch resolution rule.

Reports must fail closed or explicitly disclose exclusions until resolved.

## GAP-DOC-RPT-004 - Expired Persistence Semantics

The source model includes `Expired` in document workflow/status semantics, but expiry is also naturally date-derived.

Reporting may derive effective expiry state, but transactional persistence behavior must remain consistent with the final domain/data decision.

## GAP-DOC-RPT-005 - Document Type Requirement Matrix

Metrics such as Missing Expiry Date and Owner Coverage require a configuration source identifying which document types are required or expected for which owner populations.

The reporting layer must not hardcode this matrix.

## GAP-DOC-RPT-006 - Reconciliation Incident Persistence

The Blob/database reconciliation report requires a durable incident source if operational history, status, and retry counts are to be reported. Ownership of such persistence is not defined in the current DDD/ER baseline.

## GAP-DOC-RPT-007 - SLA Target Configuration

Verification SLA metrics require an approved target and business-time calculation policy. This belongs to configuration/NFR design and must not be hardcoded inside KPI SQL.

## GAP-DOC-RPT-008 - Rejection Category Structure

The current model supports remarks, but structured rejection categories are not defined. Rejection analytics must not infer categories from free text unless separately approved.

---

# 21. Final Consistency Confirmation

Part 8 remains consistent with the ASTI IMS architecture and earlier Module 13 FRD parts:

- Document Management remains the owner of document metadata, verification state/history, and expiry facts.
- Reporting & Executive Dashboards remains the owner of dashboard definitions, widgets, generic metric snapshots, and cross-context executive reporting.
- IAM remains the owner of permissions and branch/consolidated scope.
- Operational reports are server-side branch scoped.
- Consolidated reports are read-only and require explicit consolidated permission plus IAM capability.
- Read models are explicitly read-only, rebuildable projections.
- No read model replaces `Document`, `DocumentVerification`, owner-context tables, IAM tables, AuditLog, NotificationLog, or Blob storage metadata authority.
- No dashboard or report performs document approval, rejection, metadata mutation, retirement, or file authorization.
- No microservice, external broker, CQRS architecture, or Event Sourcing requirement is introduced.
- Unresolved requirements are flagged as gaps rather than being implemented through invented aggregates or ownership.

