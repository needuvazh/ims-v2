# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 09 – Faculty / Trainer Management

## 1. Purpose

This document defines executable-style BDD acceptance criteria for Module 09. The scenarios cover functional behavior, validation, negative cases, effective dating, state transitions, branch isolation, fine-grained authorization, compensation confidentiality, reporting, export, auditability, optimistic concurrency, soft deletion, and cross-context dependency failure.

All dates used for business-date evaluation shall be interpreted using Oman business timezone `Asia/Muscat` unless the scenario explicitly supplies another valid evaluation instant.

The scenario suite is organized by feature and traces to `FR-FTM-001` through `FR-FTM-020`.

---

## 2. Test Data Conventions

### 2.1 Branches

```text
BR-MCT = Muscat Branch
BR-SOH = Sohar Branch
BR-SAL = Salalah Branch
```

### 2.2 Users

```text
U-SA       = Super Admin with all explicit Module 09 permissions and all branches
U-MCT-BA   = Branch Admin scoped to BR-MCT
U-SOH-BA   = Branch Admin scoped to BR-SOH
U-ACAD     = Academic Coordinator scoped to BR-MCT
U-TRAINING = Training Coordinator scoped to BR-MCT
U-ACC      = Accountant scoped to BR-MCT with compensation read/manage
U-REPORT   = Reporting Analyst scoped to BR-MCT and BR-SOH
U-CONS     = Compliance Officer with audit read in BR-MCT
U-COUNS    = Counselor with no Module 09 permissions
U-TRAINER  = Trainer role with no Admin Module 09 permissions
U-STUDENT  = Student role with no Admin Module 09 permissions
```

### 2.3 Trainers

```text
T-MCT-001 = Active FullTime trainer in BR-MCT
T-MCT-002 = Active Freelance trainer in BR-MCT
T-MCT-003 = Suspended trainer in BR-MCT
T-SOH-001 = Active PartTime trainer in BR-SOH
T-SAL-001 = Inactive trainer in BR-SAL
```

### 2.4 Courses and Delivery References

```text
C-HSE-101 = Health and Safety
C-FA-201  = First Aid
B-MCT-101 = Muscat batch for C-HSE-101
S-MCT-101-01 = Session under B-MCT-101
```

---

# Feature 1: Search and List Trainers

**Traceability:** FR-FTM-001, FR-FTM-019

```gherkin
Feature: Search and list trainers within authorized branch scope
  As an authorized institute user
  I want to search trainers using operational filters
  So that I can find eligible trainer records without seeing data outside my scope

  Background:
    Given trainer "T-MCT-001" exists in branch "BR-MCT" and is not deleted
    And trainer "T-SOH-001" exists in branch "BR-SOH" and is not deleted

  Scenario: List trainers in the active branch
    Given user "U-MCT-BA" is authenticated
    And user "U-MCT-BA" has permission "trainer.read"
    And the active branch is "BR-MCT"
    When the user requests the trainer list
    Then the response status shall be 200
    And every returned trainer shall belong to "BR-MCT" or an explicitly authorized child branch
    And trainer "T-SOH-001" shall not be returned

  Scenario Outline: Filter trainer list by supported criteria
    Given user "U-MCT-BA" has permission "trainer.read"
    When the user filters trainers by <filter> equal to <value>
    Then only trainers matching <filter> equal to <value> shall be returned
    And branch scope shall still be enforced

    Examples:
      | filter         | value       |
      | trainerType    | FullTime    |
      | trainerType    | Freelance   |
      | status         | Active      |
      | specialization | Safety      |
      | courseId       | C-HSE-101   |

  Scenario: Apply deterministic pagination
    Given 130 trainers exist in the authorized branch
    When page 2 is requested with pageSize 50 and sortBy trainerCode ascending
    Then 50 rows shall be returned
    And the rows shall be ordered by trainerCode ascending
    And id shall be used as a deterministic tie-breaker where required

  Scenario Outline: Reject invalid paging values
    Given user "U-MCT-BA" has permission "trainer.read"
    When the user requests page <page> and pageSize <pageSize>
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_INVALID_QUERY"

    Examples:
      | page | pageSize |
      | 0    | 25       |
      | -1   | 25       |
      | 1    | 24       |
      | 1    | 101      |

  Scenario: Exclude soft-deleted trainers
    Given trainer "T-MCT-001" has isDeleted true
    When an authorized user searches trainers
    Then trainer "T-MCT-001" shall not be returned

  Scenario: Deny trainer list without read permission
    Given user "U-COUNS" is authenticated
    And user "U-COUNS" lacks permission "trainer.read"
    When the user requests the trainer list
    Then the response status shall be 403
    And the error code shall be "ERR_AUTH_PERMISSION_DENIED"
```

---

# Feature 2: Create Trainer Profile

**Traceability:** FR-FTM-002, FR-FTM-018, FR-FTM-020

```gherkin
Feature: Create a trainer profile linked to canonical Person

  Scenario: Create a valid trainer profile
    Given user "U-MCT-BA" has permission "trainer.create"
    And person "P-1001" exists and has no non-deleted TrainerProfile
    And branch "BR-MCT" is within the user's write scope
    When the user creates a trainer with:
      | personId           | P-1001     |
      | branchId           | BR-MCT     |
      | trainerType        | FullTime   |
      | specialization     | Safety     |
      | effectiveStartDate | 2026-07-04 |
      | status              | Active     |
    Then the response status shall be 201
    And exactly one TrainerProfile shall reference person "P-1001"
    And createdAt, createdBy, updatedAt, updatedBy shall be populated
    And version shall equal 1
    And an immutable trainer creation audit event shall exist
    And "TrainerCreated" shall be published after commit

  Scenario: Reject duplicate trainer profile for the same Person
    Given person "P-1001" already has a non-deleted TrainerProfile
    When an authorized user creates another TrainerProfile for person "P-1001"
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_DUPLICATE_TRAINER_PROFILE"
    And no second TrainerProfile shall be committed

  Scenario: Reject duplicate trainer code
    Given trainer code "TR-MCT-0001" belongs to a non-deleted trainer
    When an authorized user attempts to create another trainer with code "TR-MCT-0001"
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_TRAINER_CODE_CONFLICT"

  Scenario Outline: Accept supported trainer types
    When an authorized user creates a trainer with trainerType <trainerType>
    Then the trainer shall be created successfully

    Examples:
      | trainerType |
      | FullTime    |
      | PartTime    |
      | Freelance   |

  Scenario: Reject unsupported trainer type
    When an authorized user creates a trainer with trainerType "GuestFaculty"
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_VALIDATION_FAILED"

  Scenario: Reject Person-owned fields in trainer payload
    Given user "U-MCT-BA" has permission "trainer.create"
    When the request attempts to set "civilId" directly on TrainerProfile
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_PERSON_FIELD_OWNERSHIP_VIOLATION"
```

---

# Feature 3: View Trainer Detail with Section-Level Permissions

**Traceability:** FR-FTM-003, FR-FTM-019

```gherkin
Feature: View complete trainer profile with permission-sensitive sections

  Scenario: User with all read permissions sees all authorized sections
    Given user "U-SA" has trainer, qualification, availability, authorization, compensation, and audit read permissions
    When the user reads trainer "T-MCT-001"
    Then the response status shall be 200
    And profile, qualifications, availability, authorizations, compensation metadata, assignment references, and audit access indicators shall be present

  Scenario: Generic trainer reader does not receive compensation values
    Given user "U-TRAINING" has "trainer.read"
    And user "U-TRAINING" lacks "trainer.compensation.read"
    When the user reads trainer "T-MCT-001"
    Then the response status shall be 200
    And no compensation amount field shall appear in the response
    And compensation section access shall be denied or omitted

  Scenario: Out-of-scope direct object access does not leak trainer details
    Given user "U-MCT-BA" is scoped only to "BR-MCT"
    When the user requests trainer "T-SOH-001"
    Then no trainer data from "BR-SOH" shall be returned
    And the endpoint shall use the configured scope-safe 403 or 404 policy
```

---

# Feature 4: Update Trainer Profile and Optimistic Concurrency

**Traceability:** FR-FTM-004

```gherkin
Feature: Update trainer-owned profile attributes safely

  Scenario: Update mutable trainer fields with matching version
    Given trainer "T-MCT-001" has version 4
    And user "U-MCT-BA" has permission "trainer.update"
    When the user updates specialization to "Industrial Safety" with expected version 4
    Then the update shall succeed
    And version shall become 5
    And updatedBy shall identify the user
    And old and new specialization values shall be auditable

  Scenario: Reject stale update
    Given trainer "T-MCT-001" has current version 5
    When the user submits an update with expected version 4
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_VERSION_CONFLICT"
    And no requested field changes shall be committed

  Scenario: Reject Person identity mutation through trainer endpoint
    When a trainer update request includes primaryPhone
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_PERSON_FIELD_OWNERSHIP_VIOLATION"

  Scenario: Reject invalid effective date range
    When effectiveStartDate is 2026-08-01 and effectiveEndDate is 2026-07-31
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_EFFECTIVE_DATE_INVALID"
```

---

# Feature 5: Trainer Operational Status State Machine

**Traceability:** FR-FTM-005, FR-FTM-018, FR-FTM-020

```gherkin
Feature: Manage trainer operational status through controlled transitions

  Scenario Outline: Allow configured trainer status transition
    Given trainer "T-MCT-001" is in status <fromStatus>
    And user "U-MCT-BA" has permission "trainer.status.manage"
    When the user requests transition to <toStatus> with a valid reason where required
    Then the transition shall succeed
    And the new status shall be <toStatus>
    And the transition shall be audited
    And "TrainerStatusChanged" shall be published after commit

    Examples:
      | fromStatus | toStatus  |
      | Active     | Inactive  |
      | Active     | Suspended |
      | Inactive   | Active    |
      | Suspended  | Active    |
      | Suspended  | Inactive  |

  Scenario: Reject undefined status transition
    Given trainer "T-MCT-003" is Suspended
    When the user requests an undefined transition under the configured matrix
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_INVALID_STATUS_TRANSITION"

  Scenario: Require reason for suspension
    Given trainer "T-MCT-001" is Active
    When an authorized user requests status Suspended without a reason
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_VALIDATION_FAILED"

  Scenario: Require assignment impact review for disruptive transition
    Given trainer "T-MCT-001" has future active assignment references
    When a user requests Active to Suspended transition
    Then the system shall perform assignment impact analysis
    And if required review is not acknowledged the transition shall be blocked
    And the error code shall be "ERR_FTM_ACTIVE_ASSIGNMENT_IMPACT_REVIEW_REQUIRED"
```

---

# Feature 6: Trainer Qualifications

**Traceability:** FR-FTM-006

```gherkin
Feature: Manage trainer qualification metadata while preserving Document ownership

  Scenario: Add a valid trainer qualification
    Given user "U-ACAD" has permission "trainer.qualification.manage"
    And trainer "T-MCT-001" is within branch scope
    When the user adds qualification "NEBOSH IGC" from institution "NEBOSH" with yearCompleted 2024
    Then the qualification shall be created
    And it shall reference trainer "T-MCT-001"
    And the mutation shall be audited

  Scenario: Reject future completion year
    When the user submits yearCompleted later than the current Oman calendar year
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_QUALIFICATION_YEAR_IN_FUTURE"

  Scenario: Link qualification to existing Document reference
    Given document "DOC-100" exists in Document Management and is visible for linkage
    When qualification is created with documentId "DOC-100"
    Then the qualification shall store the document reference
    And Trainer Management shall not change the document verification status

  Scenario: Reject document ownership violation
    When a Trainer Management request attempts to set Document verification status to Approved
    Then the response status shall be 400 or 403 according to contract
    And the error code shall be "ERR_FTM_DOCUMENT_STATUS_OWNERSHIP_VIOLATION"

  Scenario: Return qualification not found
    When an authorized user updates a non-existent qualification
    Then the response status shall be 404
    And the error code shall be "ERR_FTM_QUALIFICATION_NOT_FOUND"
```

---

# Feature 7: Trainer Availability and Overlap Validation

**Traceability:** FR-FTM-007, FR-FTM-008, FR-FTM-014

```gherkin
Feature: Configure recurring trainer availability safely

  Scenario: Create a non-overlapping availability window
    Given trainer "T-MCT-001" has no Monday window between 08:00 and 12:00 in the effective period
    When an authorized user creates Monday availability from 08:00 to 12:00
    Then the availability shall be created

  Scenario Outline: Reject invalid time order
    When availability startTime is <start> and endTime is <end>
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_AVAILABILITY_TIME_ORDER_INVALID"

    Examples:
      | start | end   |
      | 12:00 | 08:00 |
      | 09:00 | 09:00 |

  Scenario: Reject malformed time
    When availability time is "25:90"
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_AVAILABILITY_TIME_FORMAT_INVALID"

  Scenario: Reject cross-midnight recurring interval
    When startTime is 22:00 and endTime is 02:00 for the same day record
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_AVAILABILITY_CROSS_MIDNIGHT_NOT_ALLOWED"

  Scenario Outline: Detect interval overlap
    Given an existing Monday availability is 09:00 to 12:00 for the same effective period
    When a candidate interval is <candidateStart> to <candidateEnd>
    Then the result shall be <result>

    Examples:
      | candidateStart | candidateEnd | result       |
      | 08:00          | 09:00        | ACCEPTED     |
      | 08:59          | 09:30        | OVERLAP      |
      | 09:00          | 12:00        | OVERLAP      |
      | 11:59          | 13:00        | OVERLAP      |
      | 12:00          | 13:00        | ACCEPTED     |

  Scenario: Return overlap error
    Given candidate availability overlaps an active effective interval
    When the user submits the candidate
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_AVAILABILITY_OVERLAP"

  Scenario: Allow same clock interval for non-overlapping effective periods
    Given one Monday window 09:00 to 12:00 ends on 2026-07-31
    When another Monday window 09:00 to 12:00 starts on 2026-08-01
    Then the new interval shall be accepted

  Scenario: Scheduling caller can validate availability without mutating it
    Given a trusted Scheduling caller invokes availability validation
    When the requested session interval is fully covered by trainer availability
    Then the response shall indicate available true
    And no TrainerAvailability row shall be changed
```

---

# Feature 8: Trainer Course Authorization Lifecycle

**Traceability:** FR-FTM-009

```gherkin
Feature: Manage effective-dated trainer course authorization

  Scenario: Create a valid course authorization
    Given trainer "T-MCT-001" exists and is within scope
    And course "C-HSE-101" exists in Course Catalog
    When an authorized user creates a non-overlapping authorization period
    Then the authorization shall be created
    And the Course record shall not be mutated

  Scenario: Reject missing Course reference
    When the request references non-existent course "C-UNKNOWN"
    Then the response status shall be 404
    And the error code shall be "ERR_CAT_COURSE_NOT_FOUND"

  Scenario: Reject authorization date inversion
    When effectiveStartDate is after effectiveEndDate
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_AUTHORIZATION_EFFECTIVE_DATE_INVALID"

  Scenario: Reject overlapping active authorization for same trainer and course
    Given an Active authorization exists for T-MCT-001 and C-HSE-101 from 2026-01-01 through 2026-12-31
    When another Active authorization is requested from 2026-06-01 through 2027-01-31
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_AUTHORIZATION_OVERLAP"

  Scenario: Reject invalid authorization state transition
    Given an authorization is in a state from which the requested transition is not allowed
    When the transition is requested
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_AUTHORIZATION_TRANSITION_INVALID"

  Scenario: Expired authorization is not eligible
    Given authorization effectiveEndDate was yesterday in Oman business date
    When trainer eligibility is evaluated today
    Then course authorization shall be treated as not effective
```

---

# Feature 9: Eligible Trainer Search

**Traceability:** FR-FTM-010

```gherkin
Feature: Find eligible trainers for course, branch, and time

  Scenario: Return trainer satisfying all eligibility checks
    Given trainer "T-MCT-001" is Active and effective
    And trainer "T-MCT-001" is authorized for "C-HSE-101" at the requested time
    And trainer availability fully covers the requested interval
    And the trainer is in an allowed branch scope
    When eligible trainers are requested
    Then "T-MCT-001" shall be returned as eligible

  Scenario Outline: Exclude trainer failing one eligibility condition
    Given trainer "T-MCT-001" fails condition <condition>
    When eligible trainers are requested
    Then "T-MCT-001" shall not be returned

    Examples:
      | condition              |
      | TRAINER_INACTIVE       |
      | TRAINER_NOT_EFFECTIVE  |
      | COURSE_NOT_AUTHORIZED  |
      | AVAILABILITY_NOT_COVERED |
      | BRANCH_SCOPE_DENIED    |

  Scenario: Reject malformed eligibility input
    When request end time is before start time
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_ELIGIBILITY_INPUT_INVALID"

  Scenario: Dependency failure is not treated as business ineligibility
    Given Course Catalog dependency required for validation is unavailable
    When eligibility search is executed
    Then the response shall fail with "ERR_FTM_DEPENDENCY_UNAVAILABLE"
    And the trainer shall not be falsely recorded as business-ineligible
```

---

# Feature 10: Compensation Rate Configuration

**Traceability:** FR-FTM-011

```gherkin
Feature: Configure effective-dated trainer compensation rates

  Scenario Outline: Accept supported payment basis
    Given user "U-ACC" has permission "trainer.compensation.manage"
    When a valid rate is created with paymentBasis <basis>
    Then the rate shall be created successfully

    Examples:
      | basis       |
      | Per Hour    |
      | Per Session |
      | Per Student |
      | Fixed       |

  Scenario: Reject zero amount
    When a compensation rate amount is 0
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_RATE_AMOUNT_INVALID"

  Scenario: Reject negative amount
    When a compensation rate amount is -1.000
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_RATE_AMOUNT_INVALID"

  Scenario: Preserve three-decimal OMR precision
    When an authorized user saves amount 12.345
    Then the stored and returned amount shall equal 12.345 exactly

  Scenario: Reject invalid effective date range
    When rate effectiveStartDate is after effectiveEndDate
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_RATE_EFFECTIVE_DATE_INVALID"

  Scenario: Reject equal-specificity overlapping rate
    Given an active Batch-specific rate exists for the same trainer, batch, payment basis, and overlapping effective period
    When another conflicting rate is created
    Then the response status shall be 409
    And the error code shall be "ERR_FTM_RATE_OVERLAP"

  Scenario: Generic trainer reader cannot read compensation rate
    Given user "U-TRAINING" lacks "trainer.compensation.read"
    When the user requests trainer compensation rates
    Then the response status shall be 403
    And the error code shall be "ERR_FTM_COMPENSATION_PERMISSION_DENIED" or "ERR_AUTH_PERMISSION_DENIED" according to endpoint contract
```

---

# Feature 11: Compensation Rate Resolution

**Traceability:** FR-FTM-012

```gherkin
Feature: Resolve applicable compensation rate deterministically

  Scenario: Session-specific rate has highest precedence
    Given effective Trainer-level, Batch-specific, and Session-specific rates all exist
    When resolution is requested for the matching Session
    Then the Session-specific rate shall be returned

  Scenario: Batch-specific rate is fallback when Session rate is absent
    Given no effective Session-specific rate exists
    And an effective Batch-specific rate exists
    And an effective Trainer-level rate exists
    When rate resolution is requested
    Then the Batch-specific rate shall be returned

  Scenario: Trainer-level rate is final fallback
    Given no effective Session-specific rate exists
    And no effective Batch-specific rate exists
    And one effective Trainer-level rate exists
    When rate resolution is requested
    Then the Trainer-level rate shall be returned

  Scenario: Missing rate returns not found
    Given no effective candidate exists at any specificity level
    When rate resolution is requested
    Then the response shall indicate no applicable rate
    And the error code shall be "ERR_FTM_RATE_NOT_FOUND" where the contract uses exception semantics

  Scenario: Equal-specificity ambiguity fails closed
    Given two effective equal-specificity candidate rates exist due to data corruption
    When rate resolution is requested
    Then no arbitrary rate shall be selected
    And the error code shall be "ERR_FTM_RATE_AMBIGUOUS"
```

---

# Feature 12: Assignment Eligibility Validation for Training Delivery

**Traceability:** FR-FTM-013

```gherkin
Feature: Validate trainer eligibility before Training Delivery assignment

  Scenario: Valid assignment eligibility response
    Given trainer is Active and effective
    And course authorization is effective
    And availability covers the session interval
    And branch relation is valid
    When Training Delivery validates assignment eligibility
    Then eligible shall be true
    And the response shall contain evaluated checks
    And no BatchTrainer or Session assignment shall be created by Module 09

  Scenario: Course authorization failure
    Given trainer has no effective authorization for the batch course
    When assignment eligibility is validated
    Then eligible shall be false
    And reason shall be "COURSE_NOT_AUTHORIZED"
    And error code may be "ERR_FTM_COURSE_NOT_AUTHORIZED" according to contract mode

  Scenario: Availability not covered
    Given trainer availability does not fully cover the requested interval
    When assignment eligibility is validated
    Then eligible shall be false
    And reason shall be "AVAILABILITY_NOT_COVERED"
    And the error code may be "ERR_FTM_AVAILABILITY_NOT_COVERED"

  Scenario: Reject session and batch mismatch
    Given session "S-MCT-101-01" does not belong to supplied batch
    When assignment eligibility is validated
    Then the response shall fail
    And the error code shall be "ERR_TRD_SESSION_BATCH_MISMATCH"
```

---

# Feature 13: Assignment Reference Read Model

**Traceability:** FR-FTM-015

```gherkin
Feature: View read-only trainer assignment references

  Scenario: Read assignment references
    Given user has permission "trainer.read"
    And trainer is in accessible branch scope
    When the user opens assignment references
    Then Batch and Session references from Training Delivery shall be returned read-only

  Scenario: Trainer Management cannot create assignment through reference endpoint
    When a client attempts POST, PATCH, or DELETE against a read-only assignment-reference route
    Then the operation shall be rejected
    And no BatchTrainer or Session record shall be mutated
```

---

# Feature 14: Soft Delete and Deactivation

**Traceability:** FR-FTM-016

```gherkin
Feature: Soft delete trainer-owned records without destroying history

  Scenario: Soft delete an eligible trainer-owned child record
    Given user has the required manage permission
    And the record is not blocked by active assignment dependency rules
    When the record is deleted through the business action
    Then isDeleted shall become true
    And deletedAt shall be populated
    And the row shall remain in the database
    And the action shall be audited

  Scenario: Normal reads exclude soft-deleted records
    Given a qualification has isDeleted true
    When qualifications are listed normally
    Then the deleted qualification shall not be returned

  Scenario: Block trainer deletion with active assignment impact
    Given trainer has active or future assignment references that block deletion
    When a user attempts the configured trainer soft-delete action
    Then the response shall fail
    And the error code shall be "ERR_FTM_SOFT_DELETE_BLOCKED_BY_ASSIGNMENTS"

  Scenario: Hard-delete operation is unavailable to business actors
    When a business user attempts a physical delete action
    Then the request shall be rejected
    And the database row shall remain intact
```

---

# Feature 15: Reports, Dashboard, and Export

**Traceability:** FR-FTM-017, FR-FTM-019

```gherkin
Feature: View and export trainer operational reports securely

  Scenario: View authorized trainer roster report
    Given user has "trainer.report.view"
    And user has "trainer.report.roster.view"
    When the user requests reportCode "trainer-roster"
    Then the response status shall be 200
    And every row shall be within effective branch scope
    And generatedAt and dataAsOf shall be returned

  Scenario: Reject invalid report code
    When an authorized user requests reportCode "unknown-report"
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_REPORT_CODE_INVALID"

  Scenario: Reject excessive report date range
    When the requested date range exceeds the configured maximum
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_REPORT_RANGE_TOO_LARGE"

  Scenario Outline: Export supported formats
    Given user has report view and "trainer.report.export"
    When the user exports an authorized report as <format>
    Then the export shall be generated in <format>
    And the exported row and field scope shall equal the authorized screen scope
    And the export action shall be audited

    Examples:
      | format |
      | CSV    |
      | XLSX   |
      | PDF    |

  Scenario: Reject export above row limit
    Given the resolved export contains more than the configured maximum rows
    When export is requested
    Then the response shall fail
    And the error code shall be "ERR_FTM_REPORT_EXPORT_LIMIT_EXCEEDED"

  Scenario: Rate-limit repeated export abuse
    Given a user exceeds the configured export rate threshold
    When another export is requested
    Then the response shall fail with "ERR_FTM_EXPORT_RATE_LIMITED"

  Scenario: Neutralize CSV formula injection
    Given a report cell begins with "=HYPERLINK(...)"
    When CSV export is generated
    Then the exported cell shall be neutralized against spreadsheet formula execution
    And the source database value shall remain unchanged

  Scenario: Arabic PDF uses RTL rendering
    Given the selected language is Arabic
    When a PDF report is generated
    Then report headings and table direction shall be RTL
    And Arabic localized labels shall be used where available
```

---

# Feature 16: Audit Sensitive Trainer Actions

**Traceability:** FR-FTM-018

```gherkin
Feature: Preserve immutable audit evidence for sensitive actions

  Scenario Outline: Audit sensitive mutation
    Given an authorized user performs <action>
    When the transaction commits successfully
    Then an audit record shall capture entity type, entity id, action, actor, action time, branch context, old value, new value, and reason where required

    Examples:
      | action                              |
      | Trainer profile update              |
      | Trainer status transition           |
      | Qualification change                |
      | Availability change                 |
      | Course authorization transition     |
      | Compensation rate creation          |
      | Compensation rate update            |
      | Soft delete                         |
      | Sensitive export                    |

  Scenario: Audit history is read-only
    Given user has "trainer.audit.read"
    When the user reads trainer audit history
    Then the response shall be 200
    But no mutation operation shall be exposed for AuditLog records

  Scenario: Missing audit permission denies access
    Given user lacks "trainer.audit.read"
    When the user requests audit history
    Then the response status shall be 403
    And the error code shall be "ERR_AUTH_PERMISSION_DENIED"
```

---

# Feature 17: Branch Isolation

**Traceability:** FR-FTM-019

```gherkin
Feature: Enforce server-side branch isolation for every trainer operation

  Scenario Outline: Block cross-branch access for branch-scoped user
    Given user "U-MCT-BA" is scoped only to "BR-MCT"
    When the user performs <operation> against trainer "T-SOH-001"
    Then no data from "BR-SOH" shall be disclosed or mutated
    And the response shall follow the scope-safe denial policy

    Examples:
      | operation                     |
      | read trainer detail           |
      | update trainer                |
      | change trainer status         |
      | add qualification             |
      | change availability           |
      | manage course authorization   |
      | read compensation rates       |
      | export report                 |
      | read audit history            |

  Scenario: Client branchId cannot expand scope
    Given user "U-MCT-BA" is scoped only to "BR-MCT"
    When the client sends branchId "BR-SOH"
    Then the request shall be denied with "ERR_FTM_BRANCH_SCOPE_DENIED" or scope-safe 404 according to endpoint policy

  Scenario: Client branch filter may narrow authorized scope
    Given user "U-REPORT" may view BR-MCT and BR-SOH
    When the user filters only BR-SOH
    Then only BR-SOH rows shall be returned

  Scenario: Consolidated mode requires explicit permission
    Given a user can individually access BR-MCT and BR-SOH
    But lacks "trainer.report.consolidated.view"
    When consolidated reporting is requested
    Then the response status shall be 403
    And the error code shall be "ERR_FTM_CONSOLIDATED_REPORT_PERMISSION_REQUIRED"

  Scenario: Consolidated permission does not add inaccessible branches
    Given user has consolidated report permission
    And effective branch scope contains BR-MCT and BR-SOH only
    When consolidated reporting is requested
    Then BR-SAL data shall not be included
```

---

# Feature 18: Fine-Grained Authorization Guards

```gherkin
Feature: Enforce fine-grained Module 09 permissions

  Scenario Outline: Deny action when permission is absent
    Given an authenticated user lacks <permission>
    When the user attempts <action>
    Then the response status shall be 403
    And the error code shall be "ERR_AUTH_PERMISSION_DENIED" or the documented module-specific denial code

    Examples:
      | permission                         | action                             |
      | trainer.create                     | create trainer                     |
      | trainer.update                     | update trainer                     |
      | trainer.status.manage              | transition status                  |
      | trainer.qualification.manage       | create qualification               |
      | trainer.availability.manage        | create availability                |
      | trainer.authorization.manage       | create authorization               |
      | trainer.compensation.read          | read rate amount                   |
      | trainer.compensation.manage        | create rate                        |
      | trainer.eligibility.read           | find eligible trainers             |
      | trainer.report.view                | view trainer report                |
      | trainer.report.export              | export report                      |
      | trainer.audit.read                 | read audit history                 |

  Scenario: Menu visibility does not replace API authorization
    Given a user can construct a direct API request
    But lacks the endpoint action permission
    When the direct API request is sent
    Then the API shall deny the request regardless of menu visibility

  Scenario: Accountant compensation access does not grant trainer status mutation
    Given user "U-ACC" has compensation read and manage permissions
    But lacks "trainer.status.manage"
    When the accountant attempts to suspend a trainer
    Then the response status shall be 403
```

---

# Feature 19: Compensation Confidentiality

```gherkin
Feature: Protect compensation data from unauthorized roles

  Scenario: Composite trainer DTO omits compensation fields
    Given the caller has trainer.read but lacks trainer.compensation.read
    When trainer detail is requested
    Then no amount, rate, payment basis, or rate-resolution value shall be present

  Scenario: Compensation report requires two permission gates
    Given the caller has trainer.report.compensation-coverage.view
    But lacks trainer.compensation.read
    When the compensation coverage report is requested
    Then the request shall be denied
    And compensation row counts shall not be leaked through a generic response

  Scenario: Generic report export excludes compensation values
    Given the caller can export trainer roster reports
    But lacks compensation read permission
    When the report is exported
    Then compensation fields shall not exist in the export schema

  Scenario: Metrics do not label compensation amount
    When compensation resolution metrics are emitted
    Then no metric label shall contain trainer name, person identity, or compensation amount
```

---

# Feature 20: Effective Dating Boundaries

```gherkin
Feature: Evaluate trainer records at effective-date boundaries

  Scenario Outline: Evaluate inclusive effective date boundaries
    Given a record has effectiveStartDate 2026-07-01 and effectiveEndDate 2026-07-31
    When evaluated on <date>
    Then effective shall be <effective>

    Examples:
      | date       | effective |
      | 2026-06-30 | false     |
      | 2026-07-01 | true      |
      | 2026-07-15 | true      |
      | 2026-07-31 | true      |
      | 2026-08-01 | false     |

  Scenario: Open-ended effective period remains effective after start
    Given effectiveStartDate is 2026-07-01
    And effectiveEndDate is null
    And status is Active
    And isDeleted is false
    When evaluated on 2027-01-01
    Then the record shall be effective

  Scenario: Deleted record is never current-effective
    Given date range contains the evaluation date
    And status is Active
    But isDeleted is true
    When current-effective logic is evaluated
    Then the record shall be ineffective
```

---

# Feature 21: Domain Event Publication

**Traceability:** FR-FTM-020

```gherkin
Feature: Publish in-process Module 09 domain events after successful commit

  Scenario: Event is published only after database commit
    Given a trainer status transition is valid
    When the database transaction commits
    Then TrainerStatusChanged shall be published after commit

  Scenario: Rolled-back mutation does not publish business event
    Given a trainer update transaction fails before commit
    When the transaction is rolled back
    Then TrainerUpdated shall not be published

  Scenario: Post-commit publication failure is observable
    Given the database mutation commits
    But post-commit event publication fails
    When failure handling runs
    Then the failure shall be logged with correlation context
    And the error condition "ERR_FTM_EVENT_PUBLICATION_FAILED_AFTER_COMMIT" shall be observable according to operations policy
    And the committed trainer data shall not be rolled back by a second destructive transaction
```

---

# Feature 22: Dependency Failure Handling

```gherkin
Feature: Fail safely when dependent bounded contexts are unavailable

  Scenario Outline: Dependency failure returns controlled error
    Given dependency <dependency> is unavailable
    When operation <operation> requires that dependency
    Then the operation shall fail safely
    And the error code shall be "ERR_FTM_DEPENDENCY_UNAVAILABLE" or the documented dependency-specific code
    And no partial Module 09 mutation shall remain committed unless the contract explicitly supports it

    Examples:
      | dependency        | operation                         |
      | Person            | create trainer linked to Person  |
      | Course Catalog    | create course authorization       |
      | Training Delivery | read assignment references        |
      | Scheduling        | cross-check scheduling projection |
      | Document          | resolve evidence projection       |

  Scenario: Missing Batch reference returns controlled error
    When eligibility or compensation resolution references an unknown batch
    Then the error code shall be "ERR_TRD_BATCH_NOT_FOUND"

  Scenario: Missing Session reference returns controlled error
    When eligibility or compensation resolution references an unknown session
    Then the error code shall be "ERR_TRD_SESSION_NOT_FOUND"
```

---

# Feature 23: KPI and Dashboard Calculation Accuracy

```gherkin
Feature: Calculate Module 09 KPIs using documented formulas

  Scenario: Active Trainer Count excludes inactive and deleted profiles
    Given branch BR-MCT has 10 Active effective trainers
    And 2 Inactive trainers
    And 1 Suspended trainer
    And 1 deleted Active trainer row
    When KPI-FTM-001 is calculated
    Then the result shall be 10

  Scenario: Availability Coverage returns null for zero trainer population
    Given branch BR-MCT has zero Active effective trainers
    When KPI-FTM-002 is calculated
    Then the result shall be null
    And the UI shall display "No active trainer population" rather than "0% coverage"

  Scenario: Availability Coverage computes percentage correctly
    Given there are 20 Active effective trainers
    And 15 have at least one valid effective availability window
    When KPI-FTM-002 is calculated
    Then the result shall be 75 percent

  Scenario: Over-utilization is not capped
    Given availableMinutes is 600
    And assignedMinutes is 720
    When KPI-FTM-005 is calculated
    Then utilizationPct shall be 120 percent
    And utilizationStatus shall be "OVER_UTILIZED"

  Scenario: Course coverage gap identifies zero authorization count
    Given course C-HSE-101 is eligible for reporting
    And no Active effective trainer authorization exists in scope
    When authorization coverage is calculated
    Then coverage status shall be "GAP"

  Scenario: Compensation ambiguity is counted separately from missing configuration
    Given one assignment has no rate
    And another assignment has two equal-specificity candidate rates
    When compensation coverage analytics run
    Then the first shall be classified "MISSING"
    And the second shall be classified "AMBIGUOUS"
```

---

# Feature 24: Read Model Staleness and Fallback

```gherkin
Feature: Use reporting read models safely

  Scenario: Report response exposes data freshness
    When a dashboard or report query succeeds
    Then generatedAt shall be returned
    And dataAsOf shall be returned

  Scenario: Eligibility validation does not rely only on stale aggregate view
    Given reporting availability view is stale
    When assignment eligibility is validated transactionally
    Then authoritative availability records and approved domain validation shall determine the result

  Scenario: Stale read model raises operational signal
    Given a read model exceeds its maximum documented staleness
    When health monitoring evaluates reporting freshness
    Then the read model shall be marked degraded
    And ftm_read_model_staleness_seconds shall exceed the configured threshold
```

---

# Feature 25: Bilingual Report Behavior

```gherkin
Feature: Render reports in English and Arabic

  Scenario: English report renders LTR
    Given report language is English
    When the report is rendered
    Then page direction shall be LTR
    And English headings shall be used

  Scenario: Arabic report renders RTL
    Given report language is Arabic
    When the report is rendered
    Then page direction shall be RTL
    And Arabic headings shall be used
    And localized Arabic names shall be preferred when available

  Scenario: Bilingual export separates name columns
    Given bilingual export mode is selected
    When XLSX export is generated
    Then English and Arabic names shall be in separate columns
    And code columns shall remain locale-neutral
```

---

# Feature 26: Pagination, Sorting, and Export Boundaries

```gherkin
Feature: Enforce report query boundaries

  Scenario Outline: Accept supported interactive page sizes
    When a report is requested with pageSize <pageSize>
    Then the request shall succeed

    Examples:
      | pageSize |
      | 25       |
      | 50       |
      | 100      |

  Scenario: Reject page size above 100
    When a report query requests pageSize 101
    Then the response status shall be 400
    And the error code shall be "ERR_FTM_INVALID_QUERY"

  Scenario: Apply deterministic secondary sort
    Given two rows have the same primary sort value
    When report results are sorted
    Then a documented secondary key shall provide stable ordering across repeated requests

  Scenario Outline: Enforce export maximum rows
    Given resolved export row count is <rows>
    When export format is <format>
    Then result shall be <result>

    Examples:
      | rows  | format | result   |
      | 5000  | PDF    | ACCEPTED |
      | 5001  | PDF    | REJECTED |
      | 50000 | XLSX   | ACCEPTED |
      | 50001 | XLSX   | REJECTED |
      | 50000 | CSV    | ACCEPTED |
      | 50001 | CSV    | REJECTED |
```

---

# Feature 27: Authentication Boundaries

```gherkin
Feature: Require authentication for Module 09 API access

  Scenario Outline: Unauthenticated caller is rejected
    Given no valid authenticated session exists
    When the caller requests <resource>
    Then the response status shall be 401
    And the error code shall be "ERR_AUTH_UNAUTHENTICATED"

    Examples:
      | resource                  |
      | trainer list              |
      | trainer detail            |
      | eligible trainer search   |
      | compensation rate         |
      | trainer report            |
      | audit history             |
```

---

# 28. Authorization and Branch Isolation Test Matrix

| Test ID | Actor | Target | Expected |
|---|---|---|---|
| AUTH-001 | Counselor | Trainer list | 403 |
| AUTH-002 | Student | Trainer detail | 403 |
| AUTH-003 | Trainer role | Admin compensation route | 403 |
| AUTH-004 | Accountant with comp read | Compensation list in own branch | 200 |
| AUTH-005 | Accountant without status permission | Status transition | 403 |
| AUTH-006 | Training Coordinator | Eligible trainer search | 200 |
| AUTH-007 | Training Coordinator without comp read | Compensation amount | 403/omitted |
| AUTH-008 | Compliance Officer with audit read | Audit history in scope | 200 |
| AUTH-009 | Branch Admin MCT | Sohar trainer direct ID | scope-safe denial |
| AUTH-010 | Reporting Analyst multi-branch, no consolidated permission | Consolidated report | 403 |
| AUTH-011 | Reporting Analyst with consolidated permission | Authorized MCT+SOH report | 200, no SAL rows |
| AUTH-012 | Export user without export permission | Export route | 403 |
| AUTH-013 | Report user without compensation read | Compensation report | 403 |
| AUTH-014 | Direct API call with hidden menu | Permission present | Action permitted if endpoint permission passes |
| AUTH-015 | Visible menu but missing action permission | Mutation API | 403 |

---

# 29. Boundary and Validation Test Matrix

| Test ID | Boundary | Input | Expected |
|---|---|---|---|
| VAL-001 | page minimum | 0 | `ERR_FTM_INVALID_QUERY` |
| VAL-002 | pageSize minimum | 24 | `ERR_FTM_INVALID_QUERY` |
| VAL-003 | pageSize maximum | 101 | `ERR_FTM_INVALID_QUERY` |
| VAL-004 | effective date equality | start=end | Accepted |
| VAL-005 | date inversion | start>end | Date-specific error |
| VAL-006 | availability adjacency | existing ends 12:00, new starts 12:00 | Accepted |
| VAL-007 | availability 1-minute overlap | 11:59–13:00 vs 09:00–12:00 | Overlap error |
| VAL-008 | rate amount zero | 0.000 | `ERR_FTM_RATE_AMOUNT_INVALID` |
| VAL-009 | rate 3 decimals | 12.345 | Exact persistence |
| VAL-010 | qualification year current year | current Oman year | Accepted |
| VAL-011 | qualification year next year | current year + 1 | Future year error |
| VAL-012 | export PDF 5000 rows | 5000 | Accepted |
| VAL-013 | export PDF 5001 rows | 5001 | Export limit error |
| VAL-014 | open-ended effectiveEndDate | null | Accepted when allowed |
| VAL-014 | stale version | expectedVersion < currentVersion | `ERR_FTM_VERSION_CONFLICT` |
| VAL-015 | deleted active record | isDeleted=true | Not effective / not listed |

---

# 30. Cross-Module Contract Test Matrix

| Test ID | Producer/Consumer | Contract | Expected Ownership Behavior |
|---|---|---|---|
| INT-001 | Person → FTM | Person reference | FTM links Person; does not duplicate identity |
| INT-002 | Course Catalog → FTM | Course existence/read | FTM stores courseId authorization only |
| INT-003 | FTM → Training Delivery | Eligibility validation | FTM validates; Training Delivery assigns |
| INT-004 | FTM → Scheduling | Availability validation | FTM exposes availability result; Scheduling owns timetable conflict |
| INT-005 | Document → FTM | Evidence status projection | FTM reads status; Document owns verification |
| INT-006 | Training Delivery → FTM report | Assignment projection | FTM reports read-only utilization reference |
| INT-007 | Audit → FTM UI | Audit projection | FTM reads immutable history |
| INT-008 | FTM → Communication | Notification request/event | Communication owns provider delivery |
| INT-009 | FTM compensation → future Payroll | Rate reference | No payroll calculation in Module 09 |

---

# 31. FR Traceability Matrix

| FR | Covered Features |
|---|---|
| FR-FTM-001 | Features 1, 17, 18 |
| FR-FTM-002 | Features 2, 17, 21, 22 |
| FR-FTM-003 | Features 3, 17, 19 |
| FR-FTM-004 | Feature 4 |
| FR-FTM-005 | Feature 5 |
| FR-FTM-006 | Feature 6 |
| FR-FTM-007 | Feature 7 |
| FR-FTM-008 | Feature 7 |
| FR-FTM-009 | Feature 8 |
| FR-FTM-010 | Feature 9 |
| FR-FTM-011 | Features 10, 19 |
| FR-FTM-012 | Feature 11 |
| FR-FTM-013 | Feature 12 |
| FR-FTM-014 | Feature 7 |
| FR-FTM-015 | Feature 13 |
| FR-FTM-016 | Feature 14 |
| FR-FTM-017 | Features 15, 23, 24, 25, 26 |
| FR-FTM-018 | Feature 16 |
| FR-FTM-019 | Features 1, 3, 15, 17, 18, 19 |
| FR-FTM-020 | Feature 21 |

---

# 32. Definition of Done for Acceptance Testing

Module 09 shall not be considered acceptance-test complete until:

1. every `FR-FTM-001` through `FR-FTM-020` has at least one positive and one negative automated scenario where applicable;
2. all state transitions are tested against the exact transition matrix;
3. every mutation endpoint has authorization, branch-scope, validation, concurrency, and audit assertions;
4. every list/report endpoint has branch leakage tests;
5. compensation responses are tested for field omission and denial;
6. overlap logic is tested at adjacency, exact-match, containment, partial-overlap, and non-overlapping effective-period boundaries;
7. effective dating is tested before start, on start, inside period, on end, after end, open-ended, inactive, and deleted cases;
8. report exports are tested for CSV, XLSX, PDF, row limits, Arabic RTL rendering, and CSV formula injection defense;
9. dependency failures are tested without false business-ineligibility classifications;
10. post-commit domain event behavior is tested separately from transaction rollback behavior;
11. direct-object cross-branch tests exist for every trainer-owned entity;
12. menu visibility tests do not substitute for API permission tests;
13. read-model staleness does not alter authoritative transactional eligibility outcomes;
14. audit records are asserted for sensitive mutations and exports;
15. no acceptance test requires Module 09 to create Course, Batch, Session, Document verification state, payroll transaction, or notification-provider delivery record.
