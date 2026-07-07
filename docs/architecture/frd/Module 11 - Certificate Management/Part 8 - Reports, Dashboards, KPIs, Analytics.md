# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 11 – Certificate Management

## 1. Purpose

This document defines the reporting, dashboard, KPI, and analytics requirements for Module 11 – Certificate Management. It specifies operational metrics, management KPIs, dashboard widgets, report contracts, filter/sort/export behavior, read-only reporting projections, refresh expectations, branch and consolidated-report scoping, and authoritative-source lineage.

The design follows these principles:

1. Certificate Management owns certificate generation, issue, reissue, replacement, revocation, and verification facts.
2. Exam, Result & Completion owns completion evaluation and approval facts.
3. Finance & Receivables owns payment-completion/payment-validation truth.
4. Identity & Access owns user permissions and branch scope.
5. Audit & Compliance owns authoritative audit and approval-history records.
6. Reporting & Executive Dashboards may consume facts from these contexts but must not own or mutate Certificate transactions.
7. Every reporting view or projection defined here is strictly read-only.
8. Reports must not recompute certificate eligibility as an alternative source of truth. They consume authoritative completion and payment-validation outcomes.
9. Branch filters can only narrow the user's effective server-side branch scope.
10. Consolidated reporting requires both the relevant report permission and IAM consolidated-view entitlement.

---

## 2. Reporting Objectives

| Objective ID | Objective | Outcome |
|---|---|---|
| RO-CERT-001 | Provide timely visibility into certificate readiness and operational backlogs. | Operators can identify eligible, blocked, generated, and pending-issue work without manually reconciling multiple systems. |
| RO-CERT-002 | Measure certificate issuance throughput and turnaround time. | Management can assess operational efficiency from completion approval to issue. |
| RO-CERT-003 | Monitor certificate lifecycle quality and exception rates. | Reissue, replacement, and revocation trends can be investigated early. |
| RO-CERT-004 | Monitor public verification usage and invalid verification attempts. | Operations and compliance can understand verification demand and suspicious activity patterns without exposing unrestricted personal data. |
| RO-CERT-005 | Support branch, course, batch, and period comparisons. | Authorized users can analyze certificate performance at relevant operational dimensions. |
| RO-CERT-006 | Support executive visibility without granting transactional permissions. | Management consumes consolidated read models only. |
| RO-CERT-007 | Preserve traceability to authoritative source entities. | Every metric can be reconciled back to source records and reporting lineage. |
| RO-CERT-008 | Support CSV, XLSX, and PDF exports according to permission and report suitability. | Users can perform approved offline analysis and formal operational reporting. |

---

# 3. Reporting Scope

## 3.1 Included

The reporting scope includes:

- certificate readiness and blocked-case reporting;
- generated certificate volume;
- issued certificate volume and trends;
- pending issuance workload;
- certificate issuance turnaround time;
- reissue request volume and aging;
- reissue approval/rejection outcomes;
- replacement certificate generation outcomes;
- revoked certificate reporting;
- public/internal verification activity reporting;
- certificate registry reporting;
- certificate lifecycle audit reporting by composition with Audit read models;
- branch/course/batch/language dimensions;
- operational dashboards;
- executive consolidated KPI summaries;
- scheduled or on-demand export generation through Reporting-owned export infrastructure where implemented;
- read-only reporting views and projections.

## 3.2 Excluded

The following are outside Certificate Management reporting ownership:

- computing or overriding course-completion eligibility;
- computing attendance percentages;
- recording examination results;
- determining or changing payment settlement status;
- invoice or receivable analytics beyond consuming a payment-validation outcome needed for readiness reporting;
- trainer performance appraisal;
- course profitability calculations;
- student academic-performance analytics;
- editing Certificate records from dashboards or reports;
- modifying AuditLog or ApprovalHistory from reporting screens;
- using MetricSnapshot or reporting projections as transactional truth.

---

# 4. KPI Catalog

## 4.1 KPI Design Rules

Each KPI must define:

```text
KPI = authoritative source facts
      + explicit time window
      + explicit branch scope
      + deterministic inclusion/exclusion rules
      + documented refresh timestamp
```

For lifecycle metrics, the reporting layer must distinguish event dates correctly:

- certificate generation metrics use certificate creation/generation event time where available through transactional/audit projection;
- issuance metrics use `Certificate.issuedDate` or authoritative issue transition time;
- reissue metrics use request creation/approval timestamps;
- verification metrics use `CertificateVerification.verifiedAt`;
- revocation metrics use authoritative lifecycle/audit timestamps until the ER model receives explicit revocation timestamp fields.

Where a source timestamp is not available directly in the current ER entity, the KPI must consume the authoritative Audit read model rather than infer a timestamp from unrelated fields.

---

## 4.2 Operational KPIs

| KPI ID | KPI | Definition / Formula | Authoritative Facts | Grain | Scope | Target/Threshold Behavior |
|---|---|---|---|---|---|---|
| KPI-CERT-001 | Ready for Certificate Count | Count of enrollments whose authoritative completion outcome is approved, payment gate passes where required, and no active/current certificate already satisfies issuance policy. | Enrollment ref + Completion outcome + Finance payment gate + Certificate existence/state | Enrollment | B/C | Operational queue; no universal target. |
| KPI-CERT-002 | Blocked by Completion Count | Count of in-scope enrollments where certificate readiness is blocked by authoritative completion status/rule outcome. | Completion read contract | Enrollment | B/C | Investigate sustained backlog trend. |
| KPI-CERT-003 | Blocked by Payment Count | Count of otherwise completion-eligible enrollments whose authoritative payment validation has not passed where payment is required. | Completion + Finance payment validation outcome | Enrollment | B/C | Operational indicator only; Finance remains owner. |
| KPI-CERT-004 | Generated Certificates | Count of Certificate records generated in period according to authoritative generation timestamp/event. | Certificate + lifecycle/audit read projection | Certificate | B/C | Trend KPI. |
| KPI-CERT-005 | Issued Certificates | Count of certificates transitioned to issued state in period. | Certificate.issuedDate/status + lifecycle event | Certificate | B/C | Core DDD mandatory report area contribution. |
| KPI-CERT-006 | Pending Issue Count | Count of generated but not issued, revoked, replaced, or otherwise terminal certificates eligible for issue. | Certificate state | Certificate | B/C | Alert when aging exceeds SLA. |
| KPI-CERT-007 | Median Completion-to-Issue Time | Median duration from authoritative completion approval timestamp to certificate issue timestamp. | Completion approvedAt + Certificate issuedDate | Enrollment/Certificate | B/C | Prefer percentile statistics over average alone. |
| KPI-CERT-008 | P90 Completion-to-Issue Time | 90th percentile of completion approval to issue duration for certificates issued in period. | Completion + Certificate | Certificate | B/C | SLA monitoring. |
| KPI-CERT-009 | On-Time Issuance Rate | Issued within configured reporting SLA ÷ certificates issued in period × 100. SLA configuration is a reporting/NFR parameter, not a Certificate aggregate rule. | Completion + Certificate | Certificate | B/C | Threshold configurable by operations. |
| KPI-CERT-010 | Reissue Request Count | Count of reissue requests submitted in period. | CertificateReissueRequest created timestamp/common audit columns | Reissue Request | B/C/G | Trend KPI. |
| KPI-CERT-011 | Reissue Approval Rate | Approved reissue requests ÷ decided reissue requests × 100. Pending requests excluded from denominator. | CertificateReissueRequest.status | Reissue Request | B/C/G | Monitor policy consistency. |
| KPI-CERT-012 | Reissue Rejection Rate | Rejected reissue requests ÷ decided reissue requests × 100. | CertificateReissueRequest.status | Reissue Request | B/C/G | Investigate spikes by reason category when structured reason taxonomy exists. |
| KPI-CERT-013 | Open Reissue Backlog | Count of requests in non-terminal, actionable states. | CertificateReissueRequest.status | Reissue Request | B/C/G | Work queue KPI. |
| KPI-CERT-014 | Reissue Backlog Aging P90 | P90 age of open reissue requests from request creation to current time. | Reissue request createdAt/common audit fields | Reissue Request | B/C/G | SLA monitoring. |
| KPI-CERT-015 | Replacement Completion Rate | Approved reissue requests with `newCertificateId` populated ÷ approved requests eligible for replacement generation × 100. | CertificateReissueRequest | Reissue Request | B/C/G | Detect approved-but-not-generated backlog. |
| KPI-CERT-016 | Revoked Certificate Count | Count of certificates revoked in period using authoritative lifecycle/audit event time. | Certificate state + Audit read projection | Certificate | B/C/G | Compliance KPI. |
| KPI-CERT-017 | Revocation Rate | Certificates revoked in period ÷ certificates issued in comparable cohort/period × 100. Cohort definition must be explicit in report metadata. | Certificate + Audit lifecycle | Certificate | B/C/G | Investigate material increases. |
| KPI-CERT-018 | Verification Attempts | Count of CertificateVerification attempts in period. | CertificateVerification | Verification attempt | B/C/G | Usage KPI. |
| KPI-CERT-019 | Successful Verification Rate | Successful verification attempts ÷ total verification attempts × 100. | CertificateVerification.verificationStatus | Verification attempt | B/C/G | Security/quality indicator. |
| KPI-CERT-020 | Invalid Verification Attempts | Count of unsuccessful/invalid verification outcomes in period. | CertificateVerification.verificationStatus | Verification attempt | B/C/G | Security monitoring; IP details restricted. |
| KPI-CERT-021 | Unique Certificates Verified | Count distinct certificateId with at least one verification attempt in period. | CertificateVerification | Certificate | B/C/G | Adoption/use KPI. |
| KPI-CERT-022 | Verification Attempts per Issued Certificate | Verification attempts ÷ issued certificates in selected population/period. | Verification + Certificate | Period | B/C/G | Contextual usage KPI; not a performance score. |
| KPI-CERT-023 | Bilingual Certificate Distribution | Percentage split of issued certificates by `Certificate.language`. | Certificate.language/status | Certificate | B/C | Localization monitoring. |
| KPI-CERT-024 | Certificate Artifact Availability Rate | Certificates expected to have an artifact and having a valid artifact reference ÷ eligible certificates × 100. This checks reference presence/availability through storage health integration, not artifact business validity. | Certificate.certificateUrl + storage health read | Certificate | B/C | Operational quality KPI. |
| KPI-CERT-025 | Duplicate Generation Conflict Count | Count of prevented duplicate-generation/idempotency conflict outcomes in period from structured application metrics/logs. | Application metrics/audit signal | Command attempt | B/C | Reliability indicator. |
| KPI-CERT-026 | Certificate Lifecycle Exception Count | Count of failed sensitive lifecycle commands grouped by validation/error category, excluding ordinary authorization denials from business-performance KPIs. | Structured error/telemetry projection | Command attempt | B/C/G | Operations and quality monitoring. |

### 4.2.1 KPI Calculation Notes

1. `KPI-CERT-001` to `KPI-CERT-003` are cross-context read compositions. They do not create a competing eligibility engine.
2. `KPI-CERT-007` to `KPI-CERT-009` require authoritative completion approval time from Exam, Result & Completion and issue time from Certificate Management.
3. `KPI-CERT-016` and `KPI-CERT-017` currently require Audit lifecycle projection because the ER model does not define explicit `revokedAt` metadata.
4. `KPI-CERT-025` and `KPI-CERT-026` are operational analytics sourced from application telemetry/read projections, not new Certificate entities.
5. A dashboard must show `dataAsOf` and, for cross-context widgets, may show `sourceAsOf` per contributing source when refresh timing differs.

---

# 5. Dashboard Specifications

## 5.1 Dashboard Types

Certificate analytics participates in two UI categories:

1. **Certificate Operational Dashboard** – branch-scoped operational work management for certificate teams and branch management.
2. **Executive Certificate KPI Summary** – consolidated, read-only management summary for users with executive report permission and consolidated entitlement.

Dashboard access is permission-based and never inferred from role name.

---

## 5.2 Certificate Operational Dashboard

**Screen mapping:** `SCR-CERT-A01`

**Primary query:** `CertificateDashboardQuery`

**Minimum permissions:**

```text
certificate.menu.dashboard
AND certificate.read
```

Widget-specific data may require additional report permissions as described below.

### 5.2.1 Global Dashboard Filters

| Filter | Type | Behavior |
|---|---|---|
| Date Range | date range | Required for trend widgets; default current month or approved operational default. Maximum interactive range should be bounded by NFR configuration. |
| Branch | single/multi-select | Server-populated from effective IAM scope. Multi-branch selection requires consolidated entitlement where aggregation is requested. |
| Course | searchable select | Read-only reference from Course Catalog. |
| Batch | searchable select | Constrained by selected course/branch and Training Delivery read scope. |
| Certificate Language | enum | `en`, `ar`, or all according to supported persisted values. |
| Certificate Status | enum/multi-select | Uses authoritative configured/persisted statuses; UI must not invent unsupported status values. |

Filters must be encoded in query state for shareable internal URLs where security policy allows, but the server must re-resolve scope on every request.

---

## 5.3 Operational Widget Catalog

| Widget ID | Widget | Type | Primary KPI / Query | Permission | Scope | Interaction |
|---|---|---|---|---|---|---|
| W-CERT-001 | Ready for Certificate | Metric card | KPI-CERT-001 | `certificate.read` | B/C | Opens readiness report filtered to `READY`. |
| W-CERT-002 | Blocked by Completion | Metric card | KPI-CERT-002 | `certificate.report.readiness` | B/C | Opens blocked readiness report. |
| W-CERT-003 | Blocked by Payment | Metric card | KPI-CERT-003 | `certificate.report.readiness` | B/C | Opens blocked readiness report; no Finance mutation action. |
| W-CERT-004 | Generated This Period | Metric card | KPI-CERT-004 | `certificate.report.issuance` | B/C | Opens issuance trend/report with generated filter. |
| W-CERT-005 | Issued This Period | Metric card | KPI-CERT-005 | `certificate.report.issuance` | B/C | Opens issuance report. |
| W-CERT-006 | Pending Issue | Metric card + aging badge | KPI-CERT-006 | `certificate.read` | B/C | Opens registry filtered to pending issue. |
| W-CERT-007 | Completion-to-Issue Time | KPI card | KPI-CERT-007/008 | `certificate.report.issuance` | B/C | Opens turnaround report. |
| W-CERT-008 | Issuance Trend | Line/column chart | KPI-CERT-005 by date bucket | `certificate.report.issuance` | B/C | Drill to period/branch/course. |
| W-CERT-009 | Issuance by Course | Horizontal bar chart | Issued count by course | `certificate.report.issuance` | B/C | Select course to narrow dashboard. |
| W-CERT-010 | Issuance by Branch | Bar chart | Issued count by branch | `certificate.report.issuance` | C | Visible only with consolidated entitlement. |
| W-CERT-011 | Open Reissue Backlog | Metric card | KPI-CERT-013 | `certificate.report.reissue` | B/C | Opens reissue report filtered open. |
| W-CERT-012 | Reissue Aging Buckets | Stacked bar/table | KPI-CERT-014 distribution | `certificate.report.reissue` | B/C | Drill to request list. |
| W-CERT-013 | Reissue Outcomes | Donut/bar chart | KPI-CERT-011/012 | `certificate.report.reissue` | B/C/G | Drill by status. |
| W-CERT-014 | Revocations This Period | Metric card | KPI-CERT-016 | `certificate.report.revocation` | B/C/G | Opens revocation report. |
| W-CERT-015 | Verification Attempts | Metric card | KPI-CERT-018 | `certificate.report.verification` | B/C/G | Opens verification report. |
| W-CERT-016 | Verification Outcome Trend | Stacked line/bar | KPI-CERT-019/020 | `certificate.report.verification` | B/C/G | Drill by date/status. |
| W-CERT-017 | Language Distribution | Donut/bar | KPI-CERT-023 | `certificate.report.issuance` | B/C | Filters report by language. |
| W-CERT-018 | Operational Work Queue | Table | Ready, pending issue, open reissue counts | `certificate.read` + applicable permissions | B | Links to work queues; no inline lifecycle mutation. |
| W-CERT-019 | Recent Lifecycle Exceptions | Table | KPI-CERT-026 | `certificate.audit.read` | B/G | Links to read-only lifecycle/audit view. |
| W-CERT-020 | Data Freshness | Status tile | Projection refresh metadata | `certificate.read` | B/C/G | Shows `dataAsOf`, lag, and degraded source state. |

### 5.3.1 Widget Permission Hiding

A widget is hidden when the user lacks its specific permission. The dashboard must not render a placeholder containing sensitive totals for unauthorized widgets.

Example:

```text
User has certificate.read
but does not have certificate.report.revocation

Result:
- registry/readiness widgets may render;
- revocation metric card is not rendered;
- dashboard API must omit revocation metric payload, not merely hide it client-side.
```

---

## 5.4 Executive Certificate KPI Summary

**Permission composition:**

```text
certificate.menu.dashboard
AND certificate.report.read
AND certificate.report.executive
AND canViewConsolidated = true
```

The executive summary is read-only and may include:

| Widget ID | Executive Widget | Definition | Scope |
|---|---|---|---|
| W-CERT-E01 | Certificates Issued | Issued certificates in selected period, with prior-period comparison | C |
| W-CERT-E02 | On-Time Issuance Rate | KPI-CERT-009 | C |
| W-CERT-E03 | P90 Completion-to-Issue | KPI-CERT-008 | C |
| W-CERT-E04 | Open Readiness Backlog | KPI-CERT-001 + blocked counts summarized | C |
| W-CERT-E05 | Reissue Rate | Reissue requests ÷ issued certificate population under explicitly labeled cohort definition | C |
| W-CERT-E06 | Revocation Rate | KPI-CERT-017 | C |
| W-CERT-E07 | Verification Success Rate | KPI-CERT-019 | C |
| W-CERT-E08 | Branch Issuance Comparison | Issued count and turnaround metrics by authorized branch | C |
| W-CERT-E09 | Course Certificate Volume | Top courses by certificates issued | C |
| W-CERT-E10 | Trend Overview | Monthly issued, reissue, revocation, and verification trend | C |

Executive widgets must not expose:

- student civil ID, passport number, or private contact data;
- verification IP addresses;
- certificate artifact URLs;
- reissue reason free text unless separately authorized for compliance use;
- raw audit old/new values;
- operational command controls.

---

# 6. Operational Reports Catalog

## 6.1 Common Report Behavior

All operational reports must support:

- server-side filtering;
- server-side sorting;
- server-side pagination for interactive tables;
- deterministic ordering with `id` as a final tie-breaker;
- branch scope resolved by IAM before query execution;
- explicit `dataAsOf` timestamp;
- visible applied-filter summary in exported outputs;
- export only when `certificate.report.export` is also granted;
- audit/access logging for sensitive exports according to platform policy;
- no inline editing of transactional data.

### 6.1.1 Common Export Options

| Format | Usage | Requirements |
|---|---|---|
| CSV | Large tabular extraction | UTF-8; bilingual text preserved; ISO dates in machine-oriented export or configured localized display columns. |
| XLSX | Business analysis | Header row, frozen panes, typed date/number cells, filter summary worksheet or header block. |
| PDF | Formal summary/print report | Best for bounded row counts and summarized reports; includes title, period, branch scope, generated timestamp, and page numbering. |

Reports with sensitive verification network metadata must apply field-level permission masking even in exports.

---

## 6.2 RPT-CERT-001 – Certificate Registry Report

**Permission:** `certificate.report.read` + `certificate.report.registry`

**Purpose:** Complete branch-scoped or authorized consolidated certificate registry.

### Filters

- issue date from/to;
- certificate status;
- certificate number;
- verification code exact lookup for authorized internal use;
- student name search;
- student number;
- enrollment number;
- course;
- batch;
- branch;
- certificate language;
- has reissue history;
- has revocation history.

### Columns

| Column | Source / Rule |
|---|---|
| Certificate Number | Certificate.certificateNumber |
| Student Number | StudentProfile reference, read-only |
| Student Name | Person/Student read projection |
| Enrollment Number | Enrollment reference |
| Course Code | Course Catalog reference |
| Course Name | Course localized display projection |
| Batch Code | Training Delivery reference |
| Branch | Enrollment/Batch branch read projection |
| Certificate Language | Certificate.language |
| Certificate Status | Certificate.certificateStatus |
| Issued Date | Certificate.issuedDate |
| Issued By | user display projection from issuedBy |
| Verification Enabled | derived from presence/validity of verificationCode under Certificate rules |
| Has Reissue | exists reissue request/replacement lineage |
| Replacement Certificate Number | joined through approved lineage where unambiguous |
| Data As Of | report metadata, not row column by default |

### Sorting

- certificate number;
- issued date;
- student name;
- course name;
- batch code;
- branch;
- certificate status.

Default: `issuedDate DESC NULLS LAST, certificateNumber ASC, id ASC`.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes, with bounded result size or summary mode

---

## 6.3 RPT-CERT-002 – Certificate Issuance Trend Report

**Permission:** `certificate.report.read` + `certificate.report.issuance`

**Purpose:** Analyze certificate generation and issuance throughput over time.

### Filters

- date range;
- date basis: generated or issued;
- grouping: day/week/month/quarter;
- branch;
- course;
- batch;
- language;
- certificate status.

### Columns

- period bucket;
- branch;
- course;
- batch where selected;
- generated count;
- issued count;
- pending issue count;
- median completion-to-issue duration;
- P90 completion-to-issue duration;
- on-time issuance rate;
- prior-period variance percentage where requested.

### Sorting

- period ascending/descending;
- issued count;
- generated count;
- P90 turnaround;
- on-time issuance rate.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes

---

## 6.4 RPT-CERT-003 – Certificate Readiness and Blocked Cases Report

**Permission:** `certificate.report.read` + `certificate.report.readiness`

**Purpose:** Show certificate readiness and blockers using authoritative cross-context outcomes.

### Filters

- readiness state: `READY`, `BLOCKED_COMPLETION`, `BLOCKED_PAYMENT`, `ALREADY_CERTIFIED`;
- branch;
- course;
- batch;
- completion approval date range;
- student search;
- enrollment number;
- aging bucket since completion approval or readiness qualification.

### Columns

- enrollment number;
- student number;
- student name;
- branch;
- course;
- batch;
- completion status summary;
- completion approved at;
- payment validation required;
- payment validation outcome;
- readiness state;
- blocker category;
- existing certificate number/status where applicable;
- readiness age in calendar days;
- data freshness for completion/payment source where required.

### Sorting

- readiness age descending;
- completion approved date;
- student name;
- course;
- batch;
- blocker category.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes, summary and bounded detail

### Ownership Rule

The report must display Completion and Finance outcomes as consumed facts. It must not independently calculate pass/fail, attendance compliance, or financial settlement.

---

## 6.5 RPT-CERT-004 – Pending Issuance Aging Report

**Permission:** `certificate.report.read` + `certificate.report.issuance`

**Purpose:** Identify certificates generated but not yet issued and monitor operational aging.

### Filters

- branch;
- course;
- batch;
- generated date range;
- aging bucket: 0–1, 2–3, 4–7, 8–14, 15+ days or approved configurable buckets;
- language.

### Columns

- certificate number;
- student name/number;
- enrollment number;
- course;
- batch;
- branch;
- generated timestamp;
- current certificate status;
- age in days/hours according to reporting convention;
- last lifecycle activity timestamp;
- artifact reference availability indicator.

### Sorting

- age descending (default);
- generated timestamp;
- branch;
- course;
- student name.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes

---

## 6.6 RPT-CERT-005 – Completion-to-Issue Turnaround Report

**Permission:** `certificate.report.read` + `certificate.report.issuance`

**Purpose:** Measure operational elapsed time between completion approval and certificate issuance.

### Filters

- issue date range;
- completion approval date range;
- branch;
- course;
- batch;
- SLA outcome: on-time/late;
- language.

### Columns

- certificate number;
- enrollment number;
- branch;
- course;
- batch;
- completion approved at;
- certificate issued at;
- elapsed hours/days;
- SLA target used;
- SLA outcome;
- period percentile context optional in summary mode.

### Sorting

- elapsed duration descending;
- issued date;
- completion date;
- branch;
- course.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes

---

## 6.7 RPT-CERT-006 – Reissue Request and Replacement Report

**Permission:** `certificate.report.read` + `certificate.report.reissue`

**Purpose:** Monitor reissue demand, decisions, aging, and replacement completion.

### Filters

- request date range;
- decision date range;
- request status;
- branch;
- course;
- batch;
- requester type: student/staff/system when resolvable;
- has replacement certificate;
- aging bucket.

### Columns

- request identifier;
- original certificate number;
- student number/name according to access level;
- branch;
- course;
- batch;
- requested at;
- requested by display identity;
- reason summary or controlled category if available;
- request status;
- approved/rejected by;
- decision timestamp;
- request age / decision turnaround;
- replacement certificate number;
- replacement generated timestamp where authoritative lifecycle projection provides it.

### Sorting

- requested at descending;
- age descending;
- decision timestamp;
- status;
- branch;
- course.

### Export

- CSV: Yes, subject to free-text reason masking policy
- XLSX: Yes
- PDF: Yes

---

## 6.8 RPT-CERT-007 – Revoked Certificate Report

**Permission:** `certificate.report.read` + `certificate.report.revocation`

**Scope:** B/C/G according to IAM and policy.

**Purpose:** Compliance and operational review of revoked certificates.

### Filters

- revocation event date range;
- issue date range;
- branch;
- course;
- batch;
- certificate number;
- revocation reason category where structured metadata becomes available;
- replacement/reissue linkage.

### Columns

- certificate number;
- student identifier/name according to permission;
- enrollment number;
- course;
- batch;
- branch;
- issued date;
- revocation timestamp from authoritative lifecycle/audit projection;
- revoked by display identity from Audit projection;
- revocation reason from authorized Audit projection;
- replacement certificate reference if applicable;
- current certificate status.

### Sorting

- revocation timestamp descending;
- certificate number;
- branch;
- course;
- issued date.

### Export

- CSV: Yes
- XLSX: Yes
- PDF: Yes

### ER Gap Note

The current ER model does not define explicit `revokedAt`, `revokedBy`, or `revocationReason` fields. This report therefore relies on the authoritative Certificate lifecycle status plus Audit read projection until the domain model is formally extended.

---

## 6.9 RPT-CERT-008 – Verification Activity Report

**Permission:** `certificate.report.read` + `certificate.report.verification`

**Scope:** B/C/G. Sensitive network metadata requires stricter field-level access.

**Purpose:** Analyze certificate verification usage and outcomes.

### Filters

- verified date/time range;
- verification outcome/status;
- branch of referenced certificate;
- course;
- batch;
- certificate number;
- verification channel/source when captured by approved telemetry;
- suspicious-volume threshold query for compliance users.

### Columns

Standard authorized view:

- verified at;
- certificate number or masked identifier according to role;
- branch;
- course;
- batch;
- verification status;
- verification attempt count in aggregation mode.

Restricted compliance view may additionally include:

- minimized/masked IP representation;
- repeated-attempt pattern indicators;
- rate-limit/security outcome reference.

Raw `verifiedByIp` must not be displayed broadly merely because a user can view verification totals.

### Sorting

- verified at descending;
- verification status;
- certificate number;
- attempt count descending in aggregation mode.

### Export

- CSV: Yes, with field masking
- XLSX: Yes, with field masking
- PDF: Summary yes; raw detail only under compliance policy

---

## 6.10 RPT-CERT-009 – Certificate Lifecycle Audit Report

**Permission composition:**

```text
certificate.report.read
AND certificate.report.audit
AND certificate.audit.read
```

**Purpose:** Read-only composition of Certificate lifecycle facts and Audit-owned evidence.

### Filters

- action/event date range;
- entity type: Certificate/Reissue Request;
- entity identifier;
- certificate number;
- branch;
- action type;
- performed by user;
- lifecycle transition;
- sensitive action only flag.

### Columns

- event/action timestamp;
- entity type;
- entity business identifier;
- branch;
- action;
- previous status;
- new status;
- performed by;
- reason where authorized;
- correlation/request identifier where available;
- audit record reference.

### Sorting

- action timestamp descending (default);
- entity identifier;
- action;
- performed by.

### Export

- CSV: Yes, authorized fields only
- XLSX: Yes
- PDF: Yes

### Ownership Rule

The report does not own or synthesize Audit history. The authoritative `AuditLog` and approval history remain owned by Audit & Compliance.

---

## 6.11 RPT-CERT-010 – Executive Certificate KPI Summary

**Permission:** `certificate.report.read` + `certificate.report.executive` + consolidated entitlement.

**Purpose:** Management-level summary across authorized branches.

### Filters

- period;
- comparison period;
- authorized branch group/selection;
- course category;
- course;
- language.

### Columns / Sections

- issued certificates;
- prior-period change;
- ready/blocked backlog summary;
- median and P90 completion-to-issue time;
- on-time issuance rate;
- reissue request rate and outcome distribution;
- revocation count/rate;
- verification attempts and success rate;
- branch comparison;
- top courses by certificate volume.

### Sorting

For branch/course tables:

- issued volume;
- on-time rate;
- P90 turnaround;
- reissue rate;
- revocation rate.

### Export

- CSV: Summary tables only
- XLSX: Yes
- PDF: Yes, primary executive format

---

# 7. Report Permission and Scope Matrix

| Report | Permission | Branch Scope | Consolidated | Global | Export |
|---|---|---:|---:|---:|---|
| RPT-CERT-001 Registry | `certificate.report.registry` | Yes | Yes with entitlement | No by default | CSV/XLSX/PDF |
| RPT-CERT-002 Issuance Trend | `certificate.report.issuance` | Yes | Yes with entitlement | No by default | CSV/XLSX/PDF |
| RPT-CERT-003 Readiness/Blocked | `certificate.report.readiness` | Yes | Yes with entitlement | No | CSV/XLSX/PDF |
| RPT-CERT-004 Pending Issuance Aging | `certificate.report.issuance` | Yes | Yes with entitlement | No | CSV/XLSX/PDF |
| RPT-CERT-005 Turnaround | `certificate.report.issuance` | Yes | Yes with entitlement | No | CSV/XLSX/PDF |
| RPT-CERT-006 Reissue/Replacement | `certificate.report.reissue` | Yes | Yes with entitlement | Policy-based for auditor | CSV/XLSX/PDF |
| RPT-CERT-007 Revocation | `certificate.report.revocation` | Yes | Yes with entitlement | Explicit compliance only | CSV/XLSX/PDF |
| RPT-CERT-008 Verification Activity | `certificate.report.verification` | Yes | Yes with entitlement | Explicit compliance only | Masked CSV/XLSX/PDF |
| RPT-CERT-009 Lifecycle Audit | `certificate.report.audit` + `certificate.audit.read` | Yes | Yes with entitlement | Explicit auditor only | CSV/XLSX/PDF |
| RPT-CERT-010 Executive KPI | `certificate.report.executive` | No single branch requirement | Required | No | CSV/XLSX/PDF |

All rows also require `certificate.report.read`. Export additionally requires `certificate.report.export`.

---

# 8. Read Models and Reporting Database Views

## 8.1 Read-Only Rule

Every view or projection in this section is explicitly **read-only**.

The following are prohibited:

- insert/update/delete through a reporting view;
- triggering Certificate lifecycle transitions from a read-model write;
- treating a MetricSnapshot as the source of certificate status;
- changing completion or payment outcomes through a dashboard;
- resolving reissue approval by updating a reporting table;
- writing verification results into an analytics aggregate instead of `CertificateVerification`;
- allowing ORM repositories for Certificate transactional commands to point at reporting views.

The authoritative transactional tables remain:

```text
Certificate Management:
- Certificate
- CertificateVerification
- CertificateReissueRequest

Referenced authoritative contexts:
- Enrollment / StudentProfile
- Course / Batch / Branch
- CourseCompletion / CompletionApproval
- Finance-owned payment/invoice/receivable facts
- IAM UserBranchAccess / Permission mappings
- AuditLog / ApprovalHistory
```

---

## 8.2 Recommended Read Models

### RM-CERT-001 – `certificate_registry_read`

**Purpose:** Fast registry search and report listing.

**Grain:** One row per Certificate record.

**Suggested columns:**

```text
certificateId
certificateNumber
enrollmentId
enrollmentNumber
studentProfileId
studentNumber
studentDisplayName
courseId
courseCode
courseNameEn
courseNameAr
batchId
batchCode
branchId
branchCode
branchName
issuedDate
issuedByUserId
issuedByDisplayName
certificateStatus
language
verificationCodeHashOrLookupKey where appropriate
hasVerificationCode
hasArtifact
hasReissueHistory
replacementCertificateId
replacementCertificateNumber
isSoftDeleted
dataAsOf
```

**Source lineage:** Certificate + Enrollment + StudentProfile/Person display projection + Course + Batch + Branch + reissue lineage.

**Use cases:** Registry screen, registry report, certificate lookup.

**Write policy:** Read-only.

---

### RM-CERT-002 – `certificate_readiness_read`

**Purpose:** Operational readiness queue without moving business rule ownership into Reporting.

**Grain:** One row per enrollment relevant to certificate processing.

**Suggested columns:**

```text
enrollmentId
enrollmentNumber
studentProfileId
studentNumber
studentDisplayName
branchId
courseId
courseCode
courseNameEn
courseNameAr
batchId
batchCode
completionStatus
completionApproved
completionApprovedAt
paymentValidationRequired
paymentValidationOutcome
existingCertificateId
existingCertificateNumber
existingCertificateStatus
readinessState
blockerCategory
readinessQualifiedAt
dataAsOf
completionSourceAsOf
financeSourceAsOf
```

**Critical rule:** `readinessState` is a read projection of authoritative application-service decisions/outcomes. It must not implement a second independent completion/payment rules engine.

**Use cases:** Readiness dashboard, blocked cases report.

**Write policy:** Read-only.

---

### RM-CERT-003 – `certificate_issuance_fact`

**Purpose:** Time-series issuance analytics.

**Grain:** One row per certificate lifecycle record/event needed for issuance analytics.

**Suggested columns:**

```text
certificateId
enrollmentId
branchId
courseId
batchId
language
generatedAt
issuedAt
completionApprovedAt
completionToIssueSeconds
onTimeFlag
currentCertificateStatus
periodDate
```

**Source lineage:** Certificate + Completion read contract + lifecycle/audit event timestamps where direct fields are absent.

**Use cases:** Issuance trend, turnaround KPI, SLA report.

**Write policy:** Read-only.

---

### RM-CERT-004 – `certificate_reissue_read`

**Purpose:** Reissue workflow reporting and aging.

**Grain:** One row per CertificateReissueRequest.

**Suggested columns:**

```text
reissueRequestId
originalCertificateId
originalCertificateNumber
enrollmentId
studentProfileId
studentDisplayName
branchId
courseId
batchId
requestedByUserId
requestedByDisplayName
requestedAt
reason
status
approvedByUserId
approvedByDisplayName
approvedAt
newCertificateId
newCertificateNumber
replacementGeneratedAt
requestAgeSeconds
decisionDurationSeconds
dataAsOf
```

**Source lineage:** CertificateReissueRequest + Certificate + identity display projection + lifecycle/audit timestamps where needed.

**Use cases:** Reissue dashboard, report, open backlog aging.

**Write policy:** Read-only.

---

### RM-CERT-005 – `certificate_verification_fact`

**Purpose:** Verification usage analytics.

**Grain:** One row per CertificateVerification attempt.

**Suggested columns:**

```text
verificationId
certificateId
branchId
courseId
batchId
verifiedAt
verificationStatus
verifiedByIpMasked
verifiedByIpSecurityTokenized optional security-only projection
attemptDate
hourBucket
dataAsOf
```

**Source lineage:** CertificateVerification + Certificate branch/course/batch projection.

**Privacy rule:** Broad analytics must use masked or omitted network identifiers. Any security-only tokenized/hash projection must be access-controlled and used only for approved abuse analysis.

**Write policy:** Read-only.

---

### RM-CERT-006 – `certificate_revocation_read`

**Purpose:** Revocation compliance reporting.

**Grain:** One row per revoked certificate lifecycle occurrence.

**Suggested columns:**

```text
certificateId
certificateNumber
enrollmentId
branchId
courseId
batchId
issuedAt
revokedAt
revokedByUserId
revokedByDisplayName
revocationReason
replacementCertificateId
currentCertificateStatus
auditRecordId
dataAsOf
```

**Source lineage:** Certificate + Audit read projection.

**Gap rule:** This view must not manufacture revocation metadata from `updatedAt`. It requires authoritative lifecycle/audit evidence until explicit ER revocation fields exist.

**Write policy:** Read-only.

---

### RM-CERT-007 – `certificate_lifecycle_audit_read`

**Purpose:** Unified read-only certificate lifecycle timeline.

**Grain:** One row per authoritative lifecycle/audit action.

**Suggested columns:**

```text
eventId
entityType
entityId
certificateId
businessIdentifier
branchId
action
oldStatus
newStatus
performedByUserId
performedByDisplayName
performedAt
reason
correlationId
auditRecordId
```

**Source lineage:** Audit & Compliance-owned records plus Certificate identity references.

**Ownership rule:** Audit remains authoritative. This projection is a convenience join only.

**Write policy:** Read-only.

---

### RM-CERT-008 – `certificate_kpi_daily`

**Purpose:** Pre-aggregated daily metrics for responsive dashboards.

**Grain:** One row per metric/date/branch/dimension combination.

**Suggested columns:**

```text
metricDate
metricCode
branchId nullable for authorized consolidated aggregate only
courseId nullable
batchId nullable
language nullable
metricValue
numerator nullable
denominator nullable
metadataJson
dataAsOf
createdAt
```

**Source lineage:** Derived from RM-CERT-001 through RM-CERT-006 or equivalent authoritative fact projections.

**Relationship to ER `MetricSnapshot`:** The Reporting context may store selected aggregates in `MetricSnapshot` using `metricCode`, `branchId`, period fields, `metricValue`, and metadata. Such snapshots are read-optimization artifacts and are never Certificate transactional truth.

**Write policy:** Writable only by Reporting projection jobs/services, never by Certificate business commands or users. Consumer access is read-only.

---

## 8.3 Read Model Ownership Matrix

| Read Model | Physical Owner | Source Contexts | Consumer | Can Replace Transactional Table? |
|---|---|---|---|---|
| RM-CERT-001 Registry | Reporting/read layer | Certificate + Enrollment + Course + Batch + Organization | Certificate UI/Reports | **No** |
| RM-CERT-002 Readiness | Reporting/read composition | Enrollment + Completion + Finance + Certificate | Certificate operations | **No** |
| RM-CERT-003 Issuance Fact | Reporting/read layer | Certificate + Completion + Audit timestamps | Dashboard/Reports | **No** |
| RM-CERT-004 Reissue | Reporting/read layer | Certificate + Reissue + IAM display refs | Dashboard/Reports | **No** |
| RM-CERT-005 Verification Fact | Reporting/read layer | CertificateVerification + Certificate dimensions | Operations/Compliance | **No** |
| RM-CERT-006 Revocation | Reporting/read composition | Certificate + Audit | Compliance | **No** |
| RM-CERT-007 Lifecycle Audit | Audit/Reporting read composition | Audit + Certificate references | Audit report/UI | **No** |
| RM-CERT-008 KPI Daily | Reporting & Dashboards | Reporting facts/read models | Dashboards | **No** |

---

# 9. Refresh and Consistency Requirements

## 9.1 Freshness Classes

| Data Class | Example | Recommended Freshness | Consistency Expectation |
|---|---|---|---|
| Operational queue | readiness, pending issue, open reissue | Near-real-time or short interval | Must not permit commands from stale state without command-time revalidation. |
| Operational dashboard | daily counts, workload | ≤ 5 minutes target unless architecture/NFR specifies stricter | Display `dataAsOf`. |
| Management trend | issuance trends, turnaround | ≤ 15 minutes or scheduled incremental refresh | Eventual consistency acceptable. |
| Executive KPI | daily/period summary | Hourly or daily snapshot depending KPI | Display snapshot period and refresh time. |
| Audit/compliance | lifecycle audit | Near-real-time read path preferred | Audit source remains authoritative. |
| Public verification | verification result | Transactional/authoritative lookup, not stale BI cache | Must reflect current certificate validity according to application rules. |

These are FRD reporting expectations. Exact infrastructure mechanisms belong in architecture/NFR design.

## 9.2 Command-Time Revalidation Rule

A report or dashboard may indicate that an item is actionable, but any sensitive command must re-read authoritative current state.

Example:

```text
Dashboard at 10:00 shows certificate READY.
Completion or payment state changes before operator clicks Generate at 10:03.
GenerateCertificateCommand executes at 10:03.
Application service revalidates authoritative gates.
The stale dashboard indication cannot force generation.
```

---

# 10. Query Performance and Indexing Guidance

The following are reporting requirements, not physical schema mandates. Final indexes must be validated against the actual Prisma schema and query plans.

Recommended access patterns:

- Certificate by `(branch dimension via enrollment/batch projection, certificateStatus, issuedDate)`;
- Certificate by `certificateNumber` unique lookup;
- Certificate by `verificationCode` unique lookup;
- CertificateVerification by `(certificateId, verifiedAt DESC)`;
- CertificateVerification by `(verificationStatus, verifiedAt)` for aggregate reporting;
- CertificateReissueRequest by `(status, requested/created timestamp)`;
- CertificateReissueRequest by `certificateId`;
- read-model dimensions by `(branchId, periodDate, courseId, batchId)`;
- MetricSnapshot by `(metricCode, branchId, periodType, periodStart, periodEnd)`.

Large exports should be generated by server-side/reporting infrastructure using bounded filters and streaming/background export infrastructure only if such infrastructure is approved in the architecture design. The FRD does not mandate a message broker or microservice.

---

# 11. Analytics Dimensions and Drill Paths

## 11.1 Standard Dimensions

| Dimension | Owner | Usage |
|---|---|---|
| Time | Shared reporting convention | Daily/weekly/monthly/quarterly trends |
| Branch | Organization/IAM scope | Branch comparison and isolation |
| Course | Course Catalog | Course volume and turnaround |
| Batch | Training Delivery | Batch-level operational analysis |
| Certificate Status | Certificate | Lifecycle analysis |
| Certificate Language | Certificate | Localization distribution |
| Readiness State | Read projection from authoritative source outcomes | Ready/blocked workload |
| Reissue Status | Certificate | Request outcome and aging |
| Verification Status | CertificateVerification | Verification success/failure analysis |

## 11.2 Drill Paths

Approved drill paths include:

```text
Executive KPI
  → Branch summary
    → Course summary
      → Batch summary
        → authorized certificate registry rows
```

```text
Readiness count
  → readiness state
    → blocker category
      → authorized enrollment readiness detail
```

```text
Reissue backlog
  → status / aging bucket
    → reissue request list
      → authorized reissue request detail
```

```text
Verification metric
  → outcome trend
    → certificate-level activity
      → authorized certificate detail
```

Each drill step must rerun authorization and branch-scope enforcement.

---

# 12. Data Privacy and Export Controls

1. Reports should use minimum necessary student identity fields.
2. Civil ID, passport number, visa number, personal phone, and personal email are excluded from default Certificate reports.
3. Verification IP data must be masked or omitted for normal operational roles.
4. Reissue free-text reasons may contain personal information and require controlled access/export handling.
5. Certificate artifact URLs must not be exported as unrestricted public links.
6. Verification codes should not be bulk-exported unless a specific approved business requirement and permission model exists.
7. Export files must honor the exact server-side branch scope used by the report query.
8. Consolidated export requires consolidated entitlement at export execution time.
9. Report exports must not bypass soft-delete/status filters silently; inclusion of archived/soft-deleted rows, if ever permitted, requires explicit compliance use case and permission.
10. PDF reports containing personal data should display classification/footer metadata according to organization security policy.

---

# 13. Empty, Loading, Error, and Stale Data States

## 13.1 Dashboard Loading State

- KPI cards render skeleton placeholders preserving layout.
- Charts render axis/container skeletons without fake values.
- Work-queue tables render row skeletons.
- Permission-filtered widgets are not skeleton-rendered because they are not part of the authorized response.

## 13.2 Empty State

The UI must distinguish:

- no data for selected filters;
- no records in authorized branches;
- no branch assigned;
- no consolidated entitlement;
- read-model refresh unavailable;
- upstream Completion or Finance source temporarily unavailable.

An upstream failure must not be displayed as `0`.

## 13.3 Stale Data State

When freshness threshold is exceeded:

- show `Data may be delayed`;
- show last successful refresh time;
- keep read-only reports available when safe;
- do not allow stale projection values to bypass command-time validation;
- use authoritative API routes for public verification and sensitive lifecycle decisions.

---

# 14. KPI and Report Traceability

| KPI / Report | Certificate Source | Cross-Context Source | Permission |
|---|---|---|---|
| KPI-CERT-001 Ready Count | Certificate existence/state | Enrollment + Completion + Finance | `certificate.report.readiness` |
| KPI-CERT-005 Issued Certificates | Certificate issued state/date | Branch/course/batch dimensions | `certificate.report.issuance` |
| KPI-CERT-007 Turnaround | Certificate issuedDate | Completion approvedAt | `certificate.report.issuance` |
| KPI-CERT-010 Reissue Count | CertificateReissueRequest | Identity display refs | `certificate.report.reissue` |
| KPI-CERT-016 Revoked Count | Certificate status | Audit lifecycle timestamp/reason | `certificate.report.revocation` |
| KPI-CERT-018 Verification Attempts | CertificateVerification | Certificate dimensions | `certificate.report.verification` |
| RPT-CERT-001 Registry | Certificate | Enrollment, Student, Course, Batch, Branch | `certificate.report.registry` |
| RPT-CERT-003 Readiness | Certificate | Enrollment, Completion, Finance | `certificate.report.readiness` |
| RPT-CERT-006 Reissue | CertificateReissueRequest | Identity display refs | `certificate.report.reissue` |
| RPT-CERT-009 Lifecycle Audit | Certificate reference | AuditLog/ApprovalHistory | `certificate.report.audit` + `certificate.audit.read` |
| RPT-CERT-010 Executive KPI | Certificate facts | Reporting aggregate dimensions | `certificate.report.executive` + consolidated entitlement |

---

# 15. DDD Ownership Fit Check

| Reporting Requirement | Owning Context | Certificate Module Use | Fit Result |
|---|---|---|---|
| Certificate generation/issue facts | Certificate Management | Source facts for reports | Aligned |
| Verification activity | Certificate Management | Source fact from CertificateVerification | Aligned |
| Reissue request/replacement facts | Certificate Management | Source facts for workflow analytics | Aligned |
| Completion approval | Exam, Result & Completion | Read-only input to readiness and turnaround | Aligned; no recomputation |
| Payment validation | Finance & Receivables | Read-only gate outcome in readiness report | Aligned; no Finance mutation |
| Branch scope | IAM + Organization | Authorization/filter dimensions | Aligned; server-side enforcement |
| Audit history | Audit & Compliance | Read-only lifecycle composition | Aligned; Audit remains owner |
| Dashboard widgets/KPI snapshots | Reporting & Executive Dashboards | Read optimization and presentation | Aligned; no transaction ownership |
| Course names/categories | Course Catalog | Reporting dimensions | Aligned; read-only reference |
| Batch dimensions | Training Delivery | Reporting dimensions | Aligned; read-only reference |

---

# 16. ER Model Alignment Check

| ER Entity / Field | Reporting Use | Ownership Treatment |
|---|---|---|
| Certificate | Registry, issuance, status, language, artifact presence | Certificate-owned authoritative source |
| CertificateVerification | Verification volume/outcome analytics | Certificate-owned authoritative source |
| CertificateReissueRequest | Reissue backlog/outcome/replacement lineage | Certificate-owned authoritative source |
| Enrollment | Enrollment number and certificate lifecycle linkage | Referenced read-only |
| StudentProfile / Person | Display identity dimensions | Referenced read-only; minimize PII |
| Course | Course reporting dimension | Referenced read-only |
| Batch | Batch reporting dimension | Referenced read-only |
| Branch | Branch reporting dimension | Referenced read-only |
| CourseCompletion | Completion status/approved timing input | Referenced read-only |
| CompletionApproval | Approval workflow timing where required | Referenced read-only |
| Invoice/Payment/Receivable | Payment-validation truth input | Finance-owned; report consumes outcome, not raw recalculation by default |
| DashboardDefinition | Dashboard metadata | Reporting-owned |
| DashboardWidget | Widget metadata | Reporting-owned |
| MetricSnapshot | Read-optimized KPI storage | Reporting-owned; never transactional truth |
| AuditLog | Revocation/lifecycle evidence | Audit-owned read dependency |
| ApprovalRequest / ApprovalHistory | Reissue approval evidence where used | Audit-owned read dependency |

---

# 17. Known Source-Model Gaps Affecting Reporting

## GAP-CERT-RPT-001 – Generation Timestamp

The ER Certificate definition includes `issuedDate` but does not explicitly list a `generatedAt` timestamp. Common base fields may provide `createdAt`, but whether this semantically equals generation time must be confirmed. Reports must not assume equivalence without implementation validation.

## GAP-CERT-RPT-002 – Revocation Metadata

Revocation is a DDD responsibility, but the ER Certificate model lacks explicit `revokedAt`, `revokedBy`, and `revocationReason`. Revocation reporting must use authoritative lifecycle/audit records until the model is formally resolved.

## GAP-CERT-RPT-003 – Reissue Decision Rejection Metadata

The ER defines `approvedBy` and `approvedAt`, but does not define `rejectedBy`, `rejectedAt`, or structured rejection reason. Rejection analytics may need Audit/ApprovalHistory composition.

## GAP-CERT-RPT-004 – Certificate Replacement Cardinality

The ER cardinality summary states Enrollment → Certificate as 1:1, while `CertificateReissueRequest.newCertificateId` implies replacement lineage and potentially multiple historical certificates for one enrollment. Registry and lineage reports must not enforce an unsafe uniqueness assumption until schema semantics are resolved.

## GAP-CERT-RPT-005 – Status Enum Definitions

The ER model does not enumerate authoritative values for `certificateStatus`, `verificationStatus`, or reissue `status`. Reports must source values from implemented enum/configuration definitions after schema verification and must not hardcode unsupported values.

## GAP-CERT-RPT-006 – CertificateIssueLog

DDD identifies `CertificateIssueLog` conceptually, but the ER model has no matching entity. Reporting must use Certificate fields plus Audit/lifecycle projections rather than invent a transactional IssueLog table in this FRD.

---

# 18. Read-Only Assurance Statement

All dashboard widgets, KPIs, reports, materialized views, SQL views, denormalized projections, search indexes, and `MetricSnapshot` records defined or referenced in this document are **read models only**.

They exist to improve query performance, aggregation, historical trend presentation, and cross-context read composition. They do not replace, override, or become authoritative alternatives to:

- `Certificate` for certificate lifecycle state;
- `CertificateVerification` for verification-attempt records;
- `CertificateReissueRequest` for reissue workflow state;
- `Enrollment` for learning lifecycle participation;
- Completion-owned records for eligibility decisions;
- Finance-owned records for payment truth;
- IAM records for authorization and branch access;
- Audit-owned records for audit evidence and approval history.

No Certificate business command may update a reporting read model as its primary business state mutation. Transactional state must be committed through the owning bounded context/application service, after which the reporting projection may refresh or be rebuilt from authoritative sources.

---

# 19. Final Consistency Check

The reporting design is consistent with the Module 11 FRD parts generated so far:

1. It uses the Part 6 report permissions without introducing hardcoded role authorization.
2. It maps the Part 3 Certificate Dashboard and operational screens to read-only query models.
3. It aligns with the Part 5 registry, dashboard, report, and export API surface.
4. It preserves Part 7 validation ownership by consuming Completion and Finance outcomes rather than reimplementing them.
5. It keeps Certificate Management transactional ownership limited to Certificate, CertificateVerification, and CertificateReissueRequest as established in Part 4.
6. It preserves branch isolation and consolidated reporting rules.
7. It does not introduce CQRS/Event Sourcing as a required architecture pattern; the term read model here means a read-only projection/view optimized for reporting, compatible with the modular-monolith architecture.
8. It explicitly marks known DDD/ER inconsistencies rather than inventing transactional entities or fields.

