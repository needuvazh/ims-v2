# Part 8 - Reports, Dashboards, KPIs, Analytics

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines Module 09 reporting, dashboard, KPI, analytics, export, and reporting read-model requirements. The module owns operational trainer reporting over `TrainerProfile`, `TrainerQualification`, `TrainerAvailability`, `TrainerCourseAuthorization`, and `TrainerCompensationRate`. It may consume read-only projections from Person, Organization, Course Catalog, Training Delivery, Scheduling, Document Management, and Audit & Compliance.

Module 09 does not become the enterprise analytics owner. Executive cross-module KPI snapshots, historical enterprise aggregates, and institute-wide dashboards remain the responsibility of Reporting & Executive Dashboards. Module 09 provides governed source queries, operational report contracts, and fast read models for trainer-specific decisions.

All reporting behavior shall enforce:

- authenticated access;
- fine-grained report permissions;
- server-derived branch scope;
- explicit consolidated-report permission for cross-branch views;
- compensation-field redaction unless `trainer.compensation.read` is granted;
- Oman business timezone GST, UTC+4;
- English and Arabic labels where the report is user-facing;
- soft-deleted row exclusion by default;
- effective-date evaluation using the requested report date;
- immutable audit evidence for sensitive exports.

---

## 2. Reporting Principles

### 2.1 Source-of-Truth Rules

| Reporting Subject                  | Source of Truth              | Module 09 Use                        |
| ---------------------------------- | ---------------------------- | ------------------------------------ |
| Trainer profile status/type/branch | Faculty / Trainer Management | Owned operational reporting          |
| Person name and contact display    | Person / Party               | Read-only projection                 |
| Qualification evidence status      | Document Management          | Read-only verification projection    |
| Course name/code                   | Course Catalog               | Read-only projection                 |
| Batch and Session assignment       | Training Delivery            | Read-only assignment projection      |
| Session schedule                   | Scheduling                   | Read-only timetable projection       |
| Audit history                      | Audit & Compliance           | Read-only audit projection           |
| Enterprise KPI snapshots           | Reporting & Dashboards       | Consumer-facing enterprise analytics |

### 2.2 Reporting Scope Modes

1. **Active Branch Mode** – default; only the selected active branch.
2. **Authorized Multi-Branch Mode** – only branches within the server-derived effective branch scope.
3. **Consolidated Mode** – requires `trainer.report.consolidated.view`; includes only branches that the user can view.
4. **Self Scope** – future Trainer Portal use; only the authenticated trainer’s own record and permitted projections.

A client-supplied `branchId` or list of branch IDs shall only narrow scope. It shall never expand scope.

### 2.3 Effective-Date Formula

A record is current-effective on evaluation date `D` when:

```text
isDeleted = false
AND status = ACTIVE-equivalent
AND effectiveStartDate <= D
AND (effectiveEndDate IS NULL OR effectiveEndDate >= D)
```

Where an entity uses lifecycle values other than Active/Inactive, the entity-specific state machine shall determine ACTIVE-equivalent states.

---

## 3. KPI Catalog

### 3.1 KPI Summary

| KPI ID      | KPI Name                                 | Formula                                                                                           | Grain                     | Refresh                | Permission                                                                |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| KPI-FTM-001 | Active Trainer Count                     | Count of current-effective Active trainers                                                        | Branch / Institute        | Near real-time, ≤5 min | `trainer.report.view`                                                     |
| KPI-FTM-002 | Trainer Availability Coverage            | Trainers with at least one valid availability window ÷ Active trainers × 100                      | Branch                    | ≤15 min                | `trainer.report.availability-coverage.view`                               |
| KPI-FTM-003 | Course Authorization Coverage            | Active trainer-course authorization pairs ÷ required course coverage pairs × 100                  | Branch / Course           | ≤15 min                | `trainer.report.authorization-coverage.view`                              |
| KPI-FTM-004 | Courses Without Authorized Trainer       | Count of published/approved courses in scope with zero current-effective authorized trainer       | Branch / Institute        | ≤15 min                | `trainer.report.authorization-coverage.view`                              |
| KPI-FTM-005 | Trainer Assignment Utilization           | Assigned delivery minutes ÷ available minutes × 100                                               | Trainer / Branch / Period | Hourly                 | `trainer.report.utilization-reference.view`                               |
| KPI-FTM-006 | Unassigned Active Trainer Rate           | Active trainers with zero assignment in period ÷ Active trainers × 100                            | Branch / Period           | Hourly                 | `trainer.report.utilization-reference.view`                               |
| KPI-FTM-007 | Qualification Evidence Coverage          | Qualifications with approved evidence ÷ qualifications requiring evidence × 100                   | Branch                    | Daily                  | `trainer.report.qualification-compliance.view`                            |
| KPI-FTM-008 | Qualification Compliance Exception Count | Count of active trainers with required qualification evidence missing/rejected/expired            | Branch                    | Daily                  | `trainer.report.qualification-compliance.view`                            |
| KPI-FTM-009 | Expiring Course Authorization Count      | Active authorizations ending within configured threshold                                          | Branch / Threshold        | Daily                  | `trainer.report.authorization-coverage.view`                              |
| KPI-FTM-010 | Compensation Configuration Coverage      | Eligible assigned trainers with resolvable rate ÷ eligible assigned trainers requiring rate × 100 | Branch / Period           | Hourly                 | `trainer.report.compensation-coverage.view` + `trainer.compensation.read` |
| KPI-FTM-011 | Ambiguous Compensation Rate Count        | Count of rate-resolution attempts with more than one equal-specificity effective candidate        | Branch / Period           | Near real-time         | `trainer.report.compensation-coverage.view` + `trainer.compensation.read` |
| KPI-FTM-012 | Eligibility Rejection Rate               | Rejected eligibility validations ÷ total eligibility validations × 100                            | Branch / Period           | Hourly                 | `trainer.report.view`                                                     |
| KPI-FTM-013 | Availability Conflict Rejection Rate     | Availability overlap/time-bound validation failures ÷ availability mutation attempts × 100        | Branch / Period           | Hourly                 | `trainer.report.availability-coverage.view`                               |
| KPI-FTM-014 | Trainer Status Stability Rate            | 1 − disruptive status transitions ÷ average active trainers                                       | Branch / Period           | Daily                  | `trainer.report.view`                                                     |
| KPI-FTM-015 | Trainer Master Data Completeness         | Weighted completed required trainer-role fields ÷ weighted required fields × 100                  | Trainer / Branch          | ≤15 min                | `trainer.report.roster.view`                                              |

---

## 4. KPI Definitions and Calculation Rules

### KPI-FTM-001 – Active Trainer Count

**Purpose:** Show operational trainer capacity at a point in time.

**Formula:**

```text
COUNT(DISTINCT TrainerProfile.id)
WHERE status = 'Active'
AND isDeleted = false
AND effectiveStartDate <= evaluationDate
AND (effectiveEndDate IS NULL OR effectiveEndDate >= evaluationDate)
AND branchId IN effectiveBranchScope
```

**Exclusions:** Suspended, Inactive, future-effective, expired, and deleted profiles.

**Drill-down:** Trainer Directory filtered to the same branch and effective date.

---

### KPI-FTM-002 – Trainer Availability Coverage

**Numerator:** Count of current-effective Active trainers who have at least one non-deleted active availability interval in a branch for the selected planning horizon.

**Denominator:** Active Trainer Count.

```text
availabilityCoveragePct =
  trainersWithAvailability / activeTrainerCount * 100
```

If `activeTrainerCount = 0`, return `null` rather than `0%`, because there is no population to measure.

---

### KPI-FTM-003 – Course Authorization Coverage

For each course visible in the selected reporting scope, count current-effective trainer authorization coverage.

```text
authorizedTrainerCount(course, branch, date) =
  COUNT(DISTINCT trainerId)
  WHERE TrainerCourseAuthorization.courseId = course.id
  AND authorization effective on date
  AND trainer Active and effective on date
  AND trainer branch within report scope
```

A coverage gap exists when the count is zero.

---

### KPI-FTM-004 – Courses Without Authorized Trainer

**Formula:** count distinct courses in the relevant approved/published course set with no current-effective authorized trainer in accessible branch scope.

This KPI consumes course lifecycle data from Course Catalog and shall not infer Course publication status from Module 09 data.

---

### KPI-FTM-005 – Trainer Assignment Utilization

**Purpose:** Provide an operational utilization reference; this is not payroll time calculation.

```text
assignedMinutes = SUM(non-cancelled assigned Session scheduled duration)
availableMinutes = SUM(availability window minutes intersecting reporting period)
utilizationPct = assignedMinutes / availableMinutes * 100
```

Rules:

1. Use Scheduling/Training Delivery read projections for assignment and schedule duration.
2. Deduplicate a Session assigned through multiple read paths.
3. Exclude Cancelled Sessions.
4. Clip availability intervals to the requested report date range.
5. A utilization result greater than 100% is allowed as an anomaly indicator and shall be flagged `OVER_UTILIZED`; it shall not be silently capped.
6. If availableMinutes = 0, return utilization as `null` and status `NO_AVAILABILITY_DEFINED`.

---

### KPI-FTM-006 – Unassigned Active Trainer Rate

```text
unassignedActiveRate =
activeTrainersWithZeroAssignment / activeTrainers * 100
```

Assignments are read from Training Delivery. This KPI shall not create or modify assignments.

---

### KPI-FTM-007 – Qualification Evidence Coverage

```text
coveragePct =
approvedEvidenceQualifications / evidenceRequiredQualifications * 100
```

Evidence verification status comes from Document Management. Module 09 shall not infer an Approved status solely from the existence of a `documentId`.

---

### KPI-FTM-008 – Qualification Compliance Exception Count

Count trainers satisfying at least one configured exception condition:

- required qualification has no linked document;
- linked document status is Rejected;
- linked document status is Expired;
- linked document is outside accessible verification scope;
- qualification rule is required for operational use but not satisfied.

A trainer is counted once in the top-level KPI, even if multiple exceptions exist. Drill-down shows every exception row.

---

### KPI-FTM-009 – Expiring Course Authorization Count

**Default threshold:** 30 Oman calendar days.

```text
COUNT(authorization)
WHERE status = Active
AND effectiveEndDate BETWEEN evaluationDate AND evaluationDate + thresholdDays
AND isDeleted = false
```

The threshold selector may support 7, 14, 30, 60, and 90 days.

---

### KPI-FTM-010 – Compensation Configuration Coverage

Only visible to users with both:

- `trainer.report.compensation-coverage.view`
- `trainer.compensation.read`

For each assignment in the period that requires a trainer rate:

1. resolve session-specific effective rate;
2. if absent, resolve batch-specific effective rate;
3. if absent, resolve trainer-level effective rate;
4. if exactly one rate is resolved, mark covered;
5. if zero rates resolve, mark `MISSING`;
6. if multiple equal-specificity candidates resolve, mark `AMBIGUOUS`.

```text
coveragePct = resolvableAssignments / assignmentsRequiringRate * 100
```

No payroll amount, payable balance, payslip value, tax, allowance, or deduction shall be calculated.

---

### KPI-FTM-011 – Ambiguous Compensation Rate Count

Count rate-resolution attempts producing `ERR_FTM_RATE_AMBIGUOUS` during the selected period. Group by trainer, branch, specificity level, and payment basis.

---

### KPI-FTM-012 – Eligibility Rejection Rate

```text
rejectionRate = rejectedValidations / totalEligibilityValidations * 100
```

Rejection reasons shall be grouped as:

- TRAINER_INACTIVE
- TRAINER_NOT_EFFECTIVE
- COURSE_NOT_AUTHORIZED
- AVAILABILITY_NOT_COVERED
- BRANCH_SCOPE_DENIED
- DEPENDENCY_UNAVAILABLE
- INVALID_INPUT

Dependency failures are reported separately from true business ineligibility and shall not be included in the business rejection numerator unless explicitly selected.

---

### KPI-FTM-013 – Availability Conflict Rejection Rate

```text
conflictRejectionRate =
overlapAndTimeValidationFailures / availabilityMutationAttempts * 100
```

Count failures from:

- `ERR_FTM_AVAILABILITY_OVERLAP`
- `ERR_FTM_AVAILABILITY_TIME_ORDER_INVALID`
- `ERR_FTM_AVAILABILITY_CROSS_MIDNIGHT_NOT_ALLOWED`
- `ERR_FTM_AVAILABILITY_TIME_FORMAT_INVALID`

---

### KPI-FTM-014 – Trainer Status Stability Rate

A disruptive transition is:

- Active → Inactive
- Active → Suspended

```text
stabilityRate = 1 - disruptiveTransitions / averageActiveTrainerPopulation
```

If average active trainer population is zero, return `null`.

---

### KPI-FTM-015 – Trainer Master Data Completeness

Required weighted fields:

| Field Group                              | Weight |
| ---------------------------------------- | -----: |
| Valid Person link                        |     15 |
| Trainer code                             |     10 |
| Trainer type                             |     10 |
| Branch                                   |     10 |
| Specialization                           |     10 |
| Effective dates                          |     10 |
| At least one qualification               |     10 |
| At least one valid availability window   |     10 |
| At least one active course authorization |     15 |

```text
completenessPct = achievedWeight / 100 * 100
```

The score measures operational readiness; it does not replace eligibility validation.

---

## 5. Dashboard Inventory

### 5.1 Admin Portal Dashboard

**Route:** `/faculty/dashboard`

**Minimum permissions:** `menu.faculty` and `trainer.report.view`.

**Layout:** Dense 12-column desktop grid; 8-column tablet; single-column mobile. Metric cards occupy 3 columns desktop, charts 6 columns, tables 12 columns. Filters remain sticky below the page header.

#### Global Filters

- Branch selector: active branch by default; consolidated mode only with `trainer.report.consolidated.view`.
- Effective date: Oman business date default.
- Date range: for trend and utilization widgets, maximum 366 days without privileged analytics mode.
- Trainer type: FullTime, PartTime, Freelance.
- Status.
- Course.
- Specialization.

### 5.2 Metric Summary Widgets

| Widget ID | Widget                             | KPI         | Permission                                     | Click Behavior                       |
| --------- | ---------------------------------- | ----------- | ---------------------------------------------- | ------------------------------------ |
| W-FTM-001 | Active Trainers                    | KPI-FTM-001 | `trainer.report.view`                          | Open filtered Trainer Directory      |
| W-FTM-002 | Availability Coverage              | KPI-FTM-002 | `trainer.report.availability-coverage.view`    | Open coverage report                 |
| W-FTM-003 | Courses Without Authorized Trainer | KPI-FTM-004 | `trainer.report.authorization-coverage.view`   | Open authorization gap report        |
| W-FTM-004 | Qualification Exceptions           | KPI-FTM-008 | `trainer.report.qualification-compliance.view` | Open qualification compliance report |
| W-FTM-005 | Compensation Coverage              | KPI-FTM-010 | compensation report + read permissions         | Open compensation coverage report    |
| W-FTM-006 | Eligibility Rejection Rate         | KPI-FTM-012 | `trainer.report.view`                          | Open eligibility diagnostics report  |

### 5.3 Chart Widgets

#### W-FTM-010 – Trainer Mix by Type

- Visualization: Donut chart.
- Dimensions: FullTime, PartTime, Freelance.
- Measure: current-effective trainer count.
- Permission: `trainer.report.roster.view`.
- Drill-down: directory filtered by type.

#### W-FTM-011 – Active Trainer Trend

- Visualization: Line chart.
- X-axis: day/week/month based on selected range.
- Y-axis: current-effective Active trainer count.
- Permission: `trainer.report.view`.
- Maximum default range: 12 months.

#### W-FTM-012 – Utilization Distribution

- Visualization: Histogram/bar bands.
- Bands: No Availability, 0%, 1–49%, 50–79%, 80–100%, >100%.
- Permission: `trainer.report.utilization-reference.view`.
- Source: assignment and scheduling read projections.

#### W-FTM-013 – Authorization Coverage by Course

- Visualization: horizontal bar chart.
- Dimension: courseCode + localized course name.
- Measure: active authorized trainer count.
- Highlight zero count.
- Permission: `trainer.report.authorization-coverage.view`.

#### W-FTM-014 – Qualification Evidence Status

- Visualization: stacked bar.
- Status groups: Approved, PendingVerification, Rejected, Expired, Missing.
- Permission: `trainer.report.qualification-compliance.view`.

#### W-FTM-015 – Eligibility Rejection Reasons

- Visualization: bar chart.
- Dimensions: normalized rejection reason.
- Measure: validation count.
- Permission: `trainer.report.view`.

### 5.4 Table Widgets

#### W-FTM-020 – Trainers Requiring Attention

Columns:

- Trainer Code
- Trainer Name
- Branch
- Trainer Type
- Current Status
- Attention Reason
- Severity
- Effective End Date
- Next Action

Reasons include expiring authorization, missing availability, qualification evidence exception, missing compensation coverage where user is allowed to see it, or over-utilization anomaly.

Permission behavior:

- without compensation permission, compensation-related reasons are entirely excluded;
- no masked row count shall reveal that hidden compensation exceptions exist.

#### W-FTM-021 – Upcoming Authorization Expiry

Columns:

- Trainer Code
- Trainer Name
- Course Code
- Course Name
- Authorization End Date
- Days Remaining
- Branch

Default sort: Days Remaining ascending, Trainer Code ascending.

#### W-FTM-022 – High Utilization Reference

Columns:

- Trainer Code
- Trainer Name
- Available Minutes
- Assigned Minutes
- Utilization %
- Assignment Count
- Branch

Default filter: utilization >= 80%.

---

## 6. Trainer Portal and Student Portal Applicability

### 6.1 Current Scope

The current ASTI implementation is Admin Portal first. No Module 09 Student Portal dashboard is required. No Trainer Portal self-service dashboard is required in current scope.

### 6.2 Future Trainer Portal Projection

When a Trainer Portal is introduced, the following self-scoped widgets may consume Module 09 read models without granting admin permissions:

- My Profile Summary
- My Course Authorizations
- My Availability
- My Upcoming Assignment References
- Qualification Evidence Status

All future self-service mutations require separate FRD scope and shall not be inferred from this document.

---

## 7. Operational Report Catalog

### RPT-FTM-001 – Trainer Roster

**Purpose:** Operational master list of trainers.

**Permission:** `trainer.report.roster.view`; export also requires `trainer.report.export`.

**Filters:**

- branch
- trainer type
- status
- specialization
- course authorization
- effective on date
- trainer code
- person name

**Columns:**

1. Trainer Code
2. Trainer Name
3. Name Arabic when available
4. Branch Code
5. Branch Name
6. Trainer Type
7. Specialization
8. Status
9. Effective Start Date
10. Effective End Date
11. Active Authorization Count
12. Availability Window Count
13. Qualification Count
14. Created At
15. Updated At

**Sorting:** trainerCode, trainerName, branchCode, trainerType, status, effectiveStartDate, updatedAt.

**Default sort:** branchCode ASC, trainerCode ASC.

**Paging:** server-side; default 25; allowed 25, 50, 100.

**Exports:** CSV, XLSX, PDF. PDF maximum 5,000 rows; XLSX/CSV maximum 50,000 rows per export job.

---

### RPT-FTM-002 – Course Authorization Coverage

**Permission:** `trainer.report.authorization-coverage.view`.

**Filters:** branch, course category, course, trainer type, authorization status, effective on date, expiry threshold.

**Columns:**

- Course Code
- Course Name English
- Course Name Arabic
- Branch
- Active Authorized Trainer Count
- Trainer Codes
- Earliest Authorization Expiry
- Expiring Within Threshold Count
- Coverage Status: COVERED / GAP / EXPIRING_RISK

**Sorting:** courseCode, courseName, authorizedTrainerCount, earliestExpiry.

**Exports:** CSV, XLSX, PDF.

---

### RPT-FTM-003 – Trainer Authorization Detail

**Permission:** `trainer.report.authorization-coverage.view`.

**Filters:** branch, trainer, course, authorization status, start date range, end date range.

**Columns:** Trainer Code, Trainer Name, Course Code, Course Name, Status, Effective Start Date, Effective End Date, Days Remaining, Last Updated At.

**Default sort:** effectiveEndDate ASC NULLS LAST, trainerCode ASC.

---

### RPT-FTM-004 – Availability Coverage

**Permission:** `trainer.report.availability-coverage.view`.

**Filters:** branch, trainer, trainer type, day of week, status, effective on date.

**Columns:** Trainer Code, Trainer Name, Branch, Day of Week, Start Time, End Time, Window Minutes, Status, Effective Start Date, Effective End Date.

**Derived summary:** number of active days per trainer and total weekly available minutes.

**Exports:** CSV, XLSX, PDF.

---

### RPT-FTM-005 – Availability Gap and Conflict Diagnostics

**Permission:** `trainer.report.availability-coverage.view`.

**Filters:** branch, trainer, date range, failure reason.

**Columns:** Event Time, Trainer Code, Trainer Name, Attempted Day, Attempted Start, Attempted End, Failure Code, Conflicting Availability ID reference, Actor, Correlation ID.

Sensitive internal identifiers shall be excluded from ordinary exports unless required for operational support roles.

---

### RPT-FTM-006 – Trainer Utilization Reference

**Permission:** `trainer.report.utilization-reference.view`.

**Filters:** branch, trainer, trainer type, date range, course, batch, utilization band.

**Columns:** Trainer Code, Trainer Name, Branch, Available Minutes, Assigned Minutes, Assignment Count, Utilization %, Utilization Status, Unassigned Days.

**Sorting:** utilizationPct, assignedMinutes, trainerCode.

**Exports:** CSV, XLSX, PDF.

**Note:** This is an operational reference. It does not calculate payroll.

---

### RPT-FTM-007 – Qualification Compliance

**Permission:** `trainer.report.qualification-compliance.view`.

**Filters:** branch, trainer, institution, completion year range, document status, exception type.

**Columns:** Trainer Code, Trainer Name, Qualification Name, Institution, Year Completed, Evidence Linked, Document Verification Status, Document Expiry Date, Exception Type, Last Reviewed At.

**Exports:** CSV, XLSX, PDF.

---

### RPT-FTM-008 – Compensation Configuration Coverage

**Permissions required:**

- `trainer.report.compensation-coverage.view`
- `trainer.compensation.read`

**Filters:** branch, trainer, payment basis, status, effective date, specificity level, resolution status.

**Columns:**

- Trainer Code
- Trainer Name
- Branch
- Specificity Level
- Batch Code when applicable
- Session Reference when applicable
- Payment Basis
- Amount OMR
- Status
- Effective Start Date
- Effective End Date
- Resolution Status: RESOLVED / MISSING / AMBIGUOUS

**Sorting:** branch, trainerCode, specificityLevel, effectiveStartDate.

**Exports:** CSV and XLSX by default; PDF permitted for authorized finance use.

Every export is audited.

---

### RPT-FTM-009 – Trainer Status History

**Permission:** `trainer.audit.read`.

**Filters:** branch, trainer, from status, to status, action date range, actor.

**Columns:** Action At, Trainer Code, Trainer Name, From Status, To Status, Effective Date, Reason, Performed By, Branch Context, Correlation ID.

**Exports:** CSV, XLSX, PDF subject to audit export policy.

---

### RPT-FTM-010 – Eligibility Validation Diagnostics

**Permission:** `trainer.report.view`.

**Filters:** branch, trainer, course, batch, date range, eligible flag, rejection reason, calling context.

**Columns:** Validation Time, Trainer Code, Course Code, Batch Code, Requested Start, Requested End, Eligible, Rejection Reason, Dependency Status, Calling Context, Correlation ID.

Raw compensation fields are never included.

---

### RPT-FTM-011 – Trainer Master Data Completeness

**Permission:** `trainer.report.roster.view`.

**Filters:** branch, trainer type, completeness band, missing component.

**Columns:** Trainer Code, Trainer Name, Branch, Completeness %, Missing Qualification, Missing Availability, Missing Authorization, Missing Specialization, Effective Date Issue, Recommended Action.

---

## 8. Common Report Behavior

### 8.1 Filtering

1. All filters are applied server-side.
2. Branch filters are intersected with server-derived scope.
3. Invalid branch requests return `ERR_FTM_BRANCH_SCOPE_DENIED`.
4. Report date range above the allowed limit returns `ERR_FTM_REPORT_RANGE_TOO_LARGE`.
5. Unknown report codes return `ERR_FTM_REPORT_CODE_INVALID`.
6. Unsupported query parameters return `ERR_FTM_INVALID_QUERY`.

### 8.2 Sorting

- Only allowlisted columns are sortable.
- Every sort includes a deterministic secondary key.
- Localized display columns sort using the active locale where database collation supports it; otherwise sort by canonical code and display localized label independently.

### 8.3 Pagination

- Default page size: 25.
- Supported interactive sizes: 25, 50, 100.
- Maximum direct API page size: 100.
- Cursor pagination may be used for very large audit or diagnostics streams.

### 8.4 Export Rules

| Format | Interactive Threshold | Max Rows | Notes                                                                |
| ------ | --------------------: | -------: | -------------------------------------------------------------------- |
| PDF    |     1,000 recommended |    5,000 | landscape for wide reports; repeated table headers                   |
| XLSX   |                50,000 |   50,000 | typed dates/numbers; frozen header; autofilter                       |
| CSV    |                50,000 |   50,000 | UTF-8 BOM for Arabic compatibility; formula-injection neutralization |

If export size exceeds the limit, return `ERR_FTM_REPORT_EXPORT_LIMIT_EXCEEDED`.

Repeated excessive export attempts may return `ERR_FTM_EXPORT_RATE_LIMITED`.

### 8.5 CSV Injection Protection

For any exported text value beginning with `=`, `+`, `-`, or `@`, the export layer shall neutralize spreadsheet formula execution according to the approved export security standard. Original database values shall not be modified.

### 8.6 Bilingual Export Rules

- English report: LTR, English headings, Oman date formatting.
- Arabic report: RTL page/table direction, Arabic headings, localized names where available.
- Bilingual report mode: code first, English and Arabic names in separate columns.
- Numeric amounts remain numeric and use OMR precision where applicable.

---

## 9. Dashboard Permission Scope

| Widget / Report Family   | Base Permission            | Additional Permission                   | Scope Rule                                         |
| ------------------------ | -------------------------- | --------------------------------------- | -------------------------------------------------- |
| Trainer roster           | `trainer.report.view`      | `trainer.report.roster.view`            | Effective branch scope                             |
| Authorization            | `trainer.report.view`      | authorization report permission         | Effective branch scope                             |
| Availability             | `trainer.report.view`      | availability report permission          | Effective branch scope                             |
| Utilization              | `trainer.report.view`      | utilization report permission           | Effective branch scope; assignment read projection |
| Qualification compliance | `trainer.report.view`      | qualification report permission         | Effective branch scope                             |
| Compensation coverage    | `trainer.report.view`      | compensation report + compensation read | Effective branch scope; field-level protection     |
| Consolidated selector    | report-specific permission | `trainer.report.consolidated.view`      | Accessible branches only                           |
| Export                   | report view permission     | `trainer.report.export`                 | Same row and field scope as on-screen report       |

---

## 10. Reporting Read Models and Database Views

### 10.1 Design Rules

1. Read models are query accelerators, not new systems of record.
2. Module 09-owned reporting views may join owned tables directly.
3. Cross-context data should be consumed through approved projections/read interfaces or reporting views, not unauthorized writes across boundaries.
4. Read-model refresh behavior must be explicit.
5. All views must retain branch identifiers required for mandatory scope filtering.
6. Compensation read models must not be accessible through generic trainer reporting roles.

### 10.2 `vw_ftm_trainer_roster`

**Purpose:** Fast Trainer Directory and roster reporting.

Proposed columns:

```text
trainer_id
person_id
trainer_code
person_display_name_en
person_display_name_ar
branch_id
branch_code
branch_name_en
branch_name_ar
trainer_type
specialization
trainer_status
effective_start_date
effective_end_date
qualification_count
active_authorization_count
active_availability_window_count
created_at
updated_at
```

Indexes should support branch/status/type/code query patterns on the underlying tables. If implemented as a materialized view, refresh at ≤5 minute intervals and expose refresh timestamp.

### 10.3 `vw_ftm_authorization_coverage`

Proposed grain: branch + course.

Columns:

```text
branch_id
course_id
course_code
course_name_en
course_name_ar
active_authorized_trainer_count
expiring_7d_count
expiring_30d_count
earliest_expiry_date
coverage_status
as_of_date
```

Course lifecycle eligibility comes from Course Catalog projection.

### 10.4 `vw_ftm_trainer_availability_weekly`

Proposed grain: trainer + branch + dayOfWeek.

Columns:

```text
trainer_id
branch_id
day_of_week
active_window_count
total_available_minutes
first_start_time
last_end_time
effective_as_of_date
```

This view is for reporting summaries only. Eligibility validation shall use authoritative interval records and domain validation, not an aggregated view.

### 10.5 `vw_ftm_trainer_utilization_reference`

Proposed grain: trainer + report date.

Columns:

```text
trainer_id
branch_id
report_date
available_minutes
assigned_minutes
assignment_count
utilization_pct
utilization_status
```

Input projections:

- Module 09 availability intervals;
- Scheduling session times;
- Training Delivery trainer assignment references.

Refresh: hourly or incremental on relevant assignment/schedule changes.

### 10.6 `vw_ftm_qualification_compliance`

Proposed grain: qualification.

Columns:

```text
trainer_id
branch_id
qualification_id
qualification_name
institution
year_completed
document_id
document_verification_status
document_expiry_date
exception_type
```

The view stores or joins only the minimum Document projection required for reporting.

### 10.7 `vw_ftm_compensation_resolution_coverage`

Restricted view. Proposed grain: trainer + assignment target + evaluation date.

Columns:

```text
trainer_id
branch_id
batch_id
session_id
payment_basis
specificity_level
resolved_rate_id
resolved_amount
resolution_status
effective_on
```

Access requires compensation permissions. This view shall not be exposed through generic reporting endpoints.

### 10.8 `vw_ftm_master_data_completeness`

Proposed grain: trainer.

Columns:

```text
trainer_id
branch_id
completeness_pct
has_qualification
has_availability
has_authorization
has_specialization
has_valid_effective_dates
missing_component_codes
```

---

## 11. Read Model Refresh and Consistency

| Read Model               | Consistency Expectation       |          Maximum Staleness |
| ------------------------ | ----------------------------- | -------------------------: |
| Trainer roster           | Near real-time                |                  5 minutes |
| Authorization coverage   | Near real-time                |                 15 minutes |
| Availability weekly      | Near real-time                |                 15 minutes |
| Utilization reference    | Operational                   |                 60 minutes |
| Qualification compliance | Operational compliance        | 24 hours, or event refresh |
| Compensation coverage    | Operational finance-sensitive |                 60 minutes |
| Master data completeness | Near real-time                |                 15 minutes |

Interactive eligibility validation and compensation rate resolution shall never rely solely on stale reporting views.

---

## 12. Reporting API Expectations

Primary contracts align with Module 09 report APIs:

- report query endpoint accepts allowlisted report code, branch scope, filters, sort, and paging;
- export endpoint requires report export permission and report-specific permission;
- compensation report requests additionally require compensation read permission;
- consolidated mode requires explicit consolidated report permission;
- all requests return `generatedAt` and `dataAsOf` timestamps.

A representative report response:

```json
{
  "reportCode": "trainer-roster",
  "generatedAt": "2026-07-04T11:30:00Z",
  "dataAsOf": "2026-07-04T11:29:30Z",
  "timezone": "Asia/Muscat",
  "scope": {
    "mode": "ACTIVE_BRANCH",
    "branchIds": ["br_mct_01"]
  },
  "page": 1,
  "pageSize": 25,
  "total": 132,
  "rows": []
}
```

---

## 13. Analytics Quality Controls

1. Every KPI has one documented formula and grain.
2. Every KPI result includes `dataAsOf`.
3. Null denominator returns `null`, not misleading `0%`.
4. Cross-context dependency failures are surfaced as data-quality status, not silently treated as zero.
5. Compensation values are not cached in unrestricted client storage.
6. Branch scope is applied before aggregation.
7. Deleted rows are excluded unless an audit/historical report explicitly requests them.
8. Effective-date evaluation is performed using Oman business date unless the user selects another allowed date.
9. Course coverage reports consume valid Course lifecycle status from Course Catalog.
10. Assignment utilization consumes non-cancelled assignment/schedule projections only.

---

## 14. Metric Instrumentation

Operational telemetry supporting analytics quality shall include:

```text
ftm_report_query_total{report_code,result}
ftm_report_query_duration_ms{report_code}
ftm_report_export_total{report_code,format,result}
ftm_report_export_rows{report_code,format}
ftm_read_model_refresh_total{model,result}
ftm_read_model_refresh_duration_ms{model}
ftm_read_model_staleness_seconds{model}
ftm_eligibility_validation_total{result,reason}
ftm_compensation_resolution_total{result,specificity}
ftm_availability_validation_failure_total{reason}
```

Metrics shall not contain trainer names, Civil IDs, phone numbers, email addresses, or compensation amounts as labels.

---

## 15. Report-to-FR Traceability

| Report / KPI Area                   | Primary FRs                                    |
| ----------------------------------- | ---------------------------------------------- |
| Trainer roster and search analytics | FR-FTM-001, FR-FTM-003, FR-FTM-017, FR-FTM-019 |
| Status metrics and history          | FR-FTM-005, FR-FTM-017, FR-FTM-018             |
| Qualification compliance            | FR-FTM-006, FR-FTM-017                         |
| Availability coverage               | FR-FTM-007, FR-FTM-008, FR-FTM-014, FR-FTM-017 |
| Authorization coverage              | FR-FTM-009, FR-FTM-010, FR-FTM-017             |
| Eligibility analytics               | FR-FTM-010, FR-FTM-013, FR-FTM-014             |
| Compensation coverage               | FR-FTM-011, FR-FTM-012, FR-FTM-017, FR-FTM-019 |
| Assignment utilization reference    | FR-FTM-015, FR-FTM-017                         |
| Audit/status history                | FR-FTM-018                                     |
| Branch-consolidated analytics       | FR-FTM-019                                     |

---

## 16. Acceptance Checklist

- [ ] Every KPI has formula, grain, refresh expectation, and permission.
- [ ] Dashboard widgets are hidden when permission is absent.
- [ ] Compensation widgets require both report and compensation permissions.
- [ ] Branch scope is applied server-side before aggregation.
- [ ] Consolidated reporting requires explicit permission.
- [ ] Student Portal has no invented Module 09 dashboard in current scope.
- [ ] Trainer Portal widgets are marked future/self-scoped only.
- [ ] Every report defines filters, columns, sorting, pagination, and export formats.
- [ ] CSV export is protected against formula injection.
- [ ] Arabic exports support RTL and localized labels.
- [ ] Read models are explicitly non-authoritative for transactional eligibility decisions.
- [ ] Cross-context read projections do not transfer ownership to Module 09.
- [ ] Export attempts and sensitive compensation exports are audited.
- [ ] Read-model staleness is measurable.
- [ ] KPI denominator-zero behavior is defined.
