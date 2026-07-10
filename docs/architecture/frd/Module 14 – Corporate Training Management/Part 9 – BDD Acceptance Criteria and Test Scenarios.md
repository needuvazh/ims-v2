# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 14 – Corporate Training Management

## Document Control

| Field | Value |
|---|---|
| Module | Module 14 – Corporate Training Management |
| Module Code | CTM |
| Owning Bounded Context | Corporate Training Management |
| Architecture Style | Next.js monorepo modular monolith |
| Test Style | BDD / Gherkin with application-service, API, authorization, integration-boundary, and reporting tests |
| Primary Aggregate | `CorporateAccount` |
| CTM-Owned Entities | `CorporateAccount`, `CorporateContact`, `CorporateContract`, `CorporateParticipant`, `CorporateEnrollment` |
| Source Baselines | DDD Context Map v3.0; ER Model v3.0; ASTI ERP Workflow; Module 14 Overview; Parts 1–8 |
| Status | Draft for review |

---

# 1. Purpose

This document defines the acceptance criteria and test scenarios for Module 14 – Corporate Training Management.

The scenarios verify:

- positive business flows;
- negative and invalid flows;
- boundary conditions;
- lifecycle transitions;
- uniqueness rules;
- identity reuse;
- bulk import behavior;
- Corporate Enrollment orchestration;
- idempotency and concurrency;
- authorization guards;
- branch, account, assignment, and self-scope isolation;
- cross-context delegation;
- reporting read-only behavior;
- audit and notification side effects;
- DDD aggregate ownership boundaries.

The core testing principle is:

> CTM must enforce its own invariants and must delegate foreign-context invariants to their owners. A successful CTM orchestration flow must not imply direct ownership or direct persistence access to another bounded context's aggregate.

---

# 2. Test Conventions

## 2.1 Common Test Personas

| Persona | Description | Default Scope |
|---|---|---|
| `ctmAdminMuscat` | Corporate Training Administrator assigned to Muscat branch | Branch scoped |
| `ctmAdminSalalah` | Corporate Training Administrator assigned to Salalah branch | Branch scoped |
| `accountManagerA` | Account Manager assigned to CorporateAccount A | Account scoped |
| `trainingCoordinatorMuscat` | Training Coordinator in Muscat | Branch scoped |
| `enrollmentOfficerMuscat` | Enrollment Officer in Muscat | Branch scoped |
| `branchManagerMuscat` | Branch Manager for Muscat | Branch/approved child branch scope |
| `financeUserMuscat` | Finance user for Muscat | Branch scoped, Finance permissions |
| `trainerOne` | Trainer assigned to Batch B1 | Assignment scoped |
| `studentOne` | Participant/student linked to Enrollment E1 | Self scoped |
| `executiveViewer` | Executive with consolidated reporting permission | Consolidated read only |
| `auditor` | Auditor with CTM read and audit permissions | Read only |
| `unauthorizedUser` | Authenticated user without CTM permissions | None |

## 2.2 Common Test Data

```text
Branch MUSCAT
Branch SALALAH

Organization ORG-A → Corporate organization
Organization ORG-B → Corporate organization
Organization ORG-NONCORP → Non-corporate organization

CorporateAccount ACCOUNT-A → Organization ORG-A → Muscat scope
CorporateAccount ACCOUNT-B → Organization ORG-B → Salalah scope

Person P1
Person P2
Person P3

CorporateParticipant CP-A1 → ACCOUNT-A + P1
CorporateParticipant CP-A2 → ACCOUNT-A + P2
CorporateParticipant CP-B1 → ACCOUNT-B + P3

Course COURSE-1
Batch BATCH-1 → COURSE-1 → Muscat
Batch BATCH-2 → COURSE-1 → Salalah

Contract CONTRACT-A → ACCOUNT-A
Contract CONTRACT-B → ACCOUNT-B
```

## 2.3 Gherkin Tags

Recommended tags:

```text
@ctm
@account
@contact
@contract
@participant
@import
@corporate-enrollment
@authorization
@branch-isolation
@account-isolation
@self-scope
@trainer-scope
@ddd-ownership
@cross-context
@idempotency
@concurrency
@reporting
@audit
@notification
@boundary
@negative
```

---

# 3. Feature – Corporate Account Management

```gherkin
Feature: Manage corporate accounts
  As an authorized Corporate Training user
  I want to create and manage corporate accounts
  So that ASTI can maintain the corporate customer relationship required for training delivery
```

## Scenario CTM-ACC-001 – Create a valid Corporate Account

```gherkin
@account @positive
Scenario: Create a Corporate Account for a corporate Organization
  Given I am authenticated as "ctmAdminMuscat"
  And I have permission "corporate-training.account.create"
  And Organization "ORG-A" exists
  And Organization "ORG-A" is classified as "CORPORATE"
  And no active CorporateAccount exists for Organization "ORG-A"
  And account code "CORP-001" is unused
  When I create a CorporateAccount with:
    | organizationId | ORG-A      |
    | accountCode    | CORP-001   |
    | accountName    | Company A  |
    | billingCycle   | MONTHLY    |
  Then the command succeeds
  And exactly one CorporateAccount is created
  And the CorporateAccount references Organization "ORG-A"
  And the account status is the approved initial state
  And createdAt and createdBy are populated
  And version is initialized
  And a CorporateAccountCreated event is recorded for post-commit processing
```

## Scenario CTM-ACC-002 – Reject non-corporate Organization

```gherkin
@account @negative @validation @cross-context
Scenario: Reject Corporate Account creation when Organization type is not corporate
  Given I am authenticated with Corporate Account create permission
  And Organization "ORG-NONCORP" exists
  And the Organization context reports its type as "BRANCH"
  When I request creation of a CorporateAccount for "ORG-NONCORP"
  Then the command is rejected with HTTP 422
  And the application error code is "CTM_ORGANIZATION_NOT_CORPORATE"
  And no CorporateAccount is created
  And CTM does not modify the Organization record
```

## Scenario CTM-ACC-003 – Reject duplicate account code

```gherkin
@account @negative @validation
Scenario: Reject a duplicate Corporate Account code
  Given active CorporateAccount "ACCOUNT-A" uses account code "CORP-001"
  When an authorized user creates another account with account code "CORP-001"
  Then the command is rejected with HTTP 409
  And the error code is "CTM_ACCOUNT_CODE_DUPLICATE"
  And the existing account remains unchanged
  And no second account is inserted
```

## Scenario CTM-ACC-004 – Reject duplicate active account for same Organization

```gherkin
@account @negative @boundary
Scenario: Prevent duplicate active CorporateAccount relationship for one Organization
  Given Organization "ORG-A" is linked to active CorporateAccount "ACCOUNT-A"
  When an authorized user attempts to create another active CorporateAccount for "ORG-A"
  Then the command is rejected with HTTP 409
  And the error code is "CTM_ACCOUNT_ALREADY_EXISTS_FOR_ORGANIZATION"
```

## Scenario CTM-ACC-005 – Optimistic concurrency on account update

```gherkin
@account @concurrency @negative
Scenario: Reject stale Corporate Account update
  Given CorporateAccount "ACCOUNT-A" has version 8
  And User One loaded version 8
  And User Two successfully updates the account causing version 9
  When User One submits an update with expected version 8
  Then the update is rejected with HTTP 409
  And the error code is "CTM_CONCURRENT_MODIFICATION"
  And User Two's committed values remain unchanged
```

## Scenario CTM-ACC-006 – Soft archive instead of hard delete

```gherkin
@account @audit
Scenario: Archive a Corporate Account without hard deleting history
  Given I have permission "corporate-training.account.archive"
  And CorporateAccount "ACCOUNT-A" satisfies all archive guards
  When I archive "ACCOUNT-A" with reason "Customer relationship closed"
  Then the account is marked deleted or archived according to repository convention
  And deletedAt is populated
  And historical contacts, contracts, participants, and CorporateEnrollment links remain referentially intact
  And no SQL hard delete is executed against the CorporateAccount row
  And an audit event records actor, reason, old state, and new state
```

---

# 4. Feature – Corporate Contact Management

```gherkin
Feature: Manage corporate contacts
  As an authorized account manager
  I want to link shared Person identities as corporate contacts
  So that contact identity is reused without duplication
```

## Scenario CTM-CON-001 – Add a corporate contact using existing Person

```gherkin
@contact @positive
Scenario: Link an existing Person as a CorporateContact
  Given Person "P1" exists
  And CorporateAccount "ACCOUNT-A" is active and in my scope
  And "P1" is not already an active contact for "ACCOUNT-A"
  When I create a CorporateContact for "P1"
  Then a CorporateContact relationship is created
  And no new Person record is created
  And the contact references "P1"
```

## Scenario CTM-CON-002 – Reject duplicate contact relationship

```gherkin
@contact @negative
Scenario: Prevent duplicate active CorporateContact link
  Given Person "P1" is already an active CorporateContact for "ACCOUNT-A"
  When I attempt to add "P1" again to "ACCOUNT-A"
  Then the command fails with HTTP 409
  And the code is "CTM_CONTACT_DUPLICATE"
```

## Scenario CTM-CON-003 – Reassign primary contact atomically

```gherkin
@contact @positive @concurrency
Scenario: Change the primary contact atomically
  Given "CONTACT-1" is the primary contact for "ACCOUNT-A"
  And "CONTACT-2" is an active contact for "ACCOUNT-A"
  When an authorized user sets "CONTACT-2" as primary
  Then "CONTACT-2" becomes primary
  And "CONTACT-1" is no longer primary
  And at no committed point are two active primary contacts present
```

## Scenario CTM-CON-004 – Reject portal enablement when policy is unavailable

```gherkin
@contact @negative
Scenario: Prevent enabling corporate portal access before the portal policy is approved
  Given Corporate Portal authentication policy is not enabled
  When an authorized CTM user enables portalAccessEnabled for a contact
  Then the command fails with code "CTM_PORTAL_ACCESS_POLICY_NOT_ENABLED"
  And portalAccessEnabled remains false
```

---

# 5. Feature – Corporate Contract Management

```gherkin
Feature: Manage corporate contracts
  As an authorized Corporate Training user
  I want to manage contract terms and lifecycle
  So that corporate enrollment coordination can reference valid commercial arrangements
```

## Scenario CTM-CTR-001 – Create a valid draft contract

```gherkin
@contract @positive
Scenario: Create a draft corporate contract
  Given CorporateAccount "ACCOUNT-A" is accessible
  And contract number "CONT-2026-001" is unused
  When I create a contract with:
    | startDate     | 2026-08-01   |
    | endDate       | 2027-07-31   |
    | contractValue | 125000.000   |
    | currency      | OMR          |
    | billingModel  | PER_STUDENT  |
  Then the contract is created in DRAFT state
  And it references "ACCOUNT-A"
  And audit columns are populated
```

## Scenario CTM-CTR-002 – Reject invalid date range

```gherkin
@contract @negative @validation
Scenario Outline: Validate contract date boundaries
  Given I have permission to create a contract
  When I create a contract with start date "<start>" and end date "<end>"
  Then the result is "<result>"
  And when rejected the code is "<code>"

  Examples:
    | start      | end        | result   | code                            |
    | 2026-08-01 | 2026-08-01 | accepted |                                 |
    | 2026-08-01 | 2027-07-31 | accepted |                                 |
    | 2026-08-02 | 2026-08-01 | rejected | CTM_CONTRACT_DATE_RANGE_INVALID |
```

## Scenario CTM-CTR-003 – Reject negative contract value

```gherkin
@contract @negative @boundary
Scenario: Contract value cannot be negative
  When an authorized user submits contractValue "-0.001"
  Then schema validation fails with HTTP 422
  And code "CTM_CONTRACT_VALUE_INVALID" is returned
```

## Scenario CTM-CTR-004 – Allow zero contract value only when business policy permits

```gherkin
@contract @boundary
Scenario: Validate zero-valued contract according to configured CTM policy
  Given contractValue is "0.000"
  When a contract is submitted
  Then the configured contract-value policy is evaluated
  And the result is deterministic
  And the validation is not delegated to the browser
```

## Scenario CTM-CTR-005 – Activate a valid contract

```gherkin
@contract @positive @state-machine
Scenario: Activate a valid draft contract
  Given Contract "CONTRACT-A" is DRAFT
  And its date range is valid
  And I have "corporate-training.contract.status.manage"
  When I transition the contract to ACTIVE
  Then the state becomes ACTIVE
  And the transition is audited
  And CorporateContractActivated is emitted after commit
```

## Scenario CTM-CTR-006 – Reject invalid contract transition

```gherkin
@contract @negative @state-machine
Scenario: Reject transition from TERMINATED to ACTIVE when not allowed
  Given Contract "CONTRACT-A" is TERMINATED
  When I request transition to ACTIVE
  Then the command fails with HTTP 409
  And code "CTM_CONTRACT_INVALID_STATE_TRANSITION" is returned
  And the contract remains TERMINATED
```

## Scenario CTM-CTR-007 – Require reason for suspension

```gherkin
@contract @validation
Scenario: Suspending a contract requires a reason
  Given Contract "CONTRACT-A" is ACTIVE
  When I request transition to SUSPENDED without a reason
  Then the command fails with HTTP 422
  And code "CTM_CONTRACT_REASON_REQUIRED" is returned
```

## Scenario CTM-CTR-008 – Expiring soon calculation uses business date

```gherkin
@contract @boundary @reporting
Scenario: Contract expiry threshold uses configured business date and threshold
  Given the Oman business date is 2026-07-11
  And the configured expiry threshold is 30 days
  And Contract A ends on 2026-08-10
  And Contract B ends on 2026-08-11
  When the contract expiry report is generated
  Then Contract A is classified as expiring within 30 days
  And Contract B is not included in the 30-day bucket
```

---

# 6. Feature – Corporate Participant Management

```gherkin
Feature: Manage corporate participants
  As a Corporate Training coordinator
  I want to maintain employer-specific participant relationships
  So that one Person identity can participate under different employers without duplication
```

## Scenario CTM-PAR-001 – Register participant from existing Person

```gherkin
@participant @positive
Scenario: Create CorporateParticipant relationship for an existing Person
  Given Person "P1" exists
  And Account "ACCOUNT-A" is active and in scope
  And no active CorporateParticipant links "P1" to "ACCOUNT-A"
  When I register "P1" under "ACCOUNT-A"
  Then one CorporateParticipant is created
  And it references Person "P1"
  And it references CorporateAccount "ACCOUNT-A"
  And no duplicate Person is created
```

## Scenario CTM-PAR-002 – Same Person joins a new employer

```gherkin
@participant @ddd-ownership @positive
Scenario: Reuse Person identity when participant joins a different Corporate Account
  Given Person "P1" exists
  And "P1" has historical CorporateParticipant "CP-A1" under "ACCOUNT-A"
  And "P1" is now nominated by "ACCOUNT-B"
  When an authorized user registers the participant relationship for "ACCOUNT-B"
  Then a new CorporateParticipant relationship is created for "ACCOUNT-B"
  And both CorporateParticipant records reference the same Person "P1"
  And no new Person is created
  And historical ACCOUNT-A linkage remains unchanged
```

## Scenario CTM-PAR-003 – Reject duplicate participant relationship

```gherkin
@participant @negative
Scenario: Prevent duplicate active participant link in the same account
  Given active participant "CP-A1" links Person "P1" to "ACCOUNT-A"
  When I register Person "P1" again under "ACCOUNT-A"
  Then the request fails with code "CTM_PARTICIPANT_DUPLICATE"
```

## Scenario CTM-PAR-004 – Employee code uniqueness within account

```gherkin
@participant @boundary @validation
Scenario Outline: Employee code uniqueness is account-scoped
  Given ACCOUNT-A has participant with employee code "EMP-100"
  When Person P2 is registered with employee code "EMP-100" under "<account>"
  Then the result is "<result>"

  Examples:
    | account   | result   |
    | ACCOUNT-A | rejected |
    | ACCOUNT-B | accepted |
```

## Scenario CTM-PAR-005 – Preserve enrollment history when participant deactivates

```gherkin
@participant @audit @positive
Scenario: Deactivate participant without removing historical training links
  Given participant "CP-A1" has historical CorporateEnrollment links
  When an authorized user deactivates "CP-A1"
  Then the participant status becomes INACTIVE
  And no historical CorporateEnrollment row is deleted
  And no Enrollment row is modified by CTM
  And the state change is audited
```

## Scenario CTM-PAR-006 – Inactive participant cannot start new enrollment

```gherkin
@participant @corporate-enrollment @negative
Scenario: Reject enrollment orchestration for inactive participant
  Given CorporateParticipant "CP-A1" is INACTIVE
  When an authorized user requests a new Corporate Enrollment for "CP-A1"
  Then CTM rejects the request before foreign-context creation
  And code "CTM_PARTICIPANT_INACTIVE" is returned
  And Admission & Enrollment create command is not called
```

---

# 7. Feature – Participant Bulk Import

```gherkin
Feature: Import corporate participants in bulk
  As a Corporate Training coordinator
  I want to validate and commit participant files
  So that high-volume corporate nominations can be processed safely
```

## Scenario CTM-IMP-001 – Validate a fully valid CSV import

```gherkin
@import @positive
Scenario: Validate a valid participant import file
  Given I have participant import permission
  And ACCOUNT-A is in my scope
  And the uploaded CSV has valid headers
  And all rows contain sufficient identity attributes
  And Person matching returns one deterministic result or a valid new-person path per row
  When I validate the import
  Then import status becomes VALIDATED
  And totalRows equals validRows
  And failedRows equals 0
  And no participant rows are committed during validation
```

## Scenario CTM-IMP-002 – Reject unsupported file type

```gherkin
@import @negative
Scenario Outline: Only approved participant import file types are accepted
  When I upload a file with content type "<type>"
  Then the result is "<result>"
  And when rejected code is "CTM_IMPORT_FILE_TYPE_UNSUPPORTED"

  Examples:
    | type                                                                      | result   |
    | text/csv                                                                  | accepted |
    | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet         | accepted |
    | application/pdf                                                           | rejected |
    | image/png                                                                 | rejected |
    | application/x-msdownload                                                  | rejected |
```

## Scenario CTM-IMP-003 – File size boundary

```gherkin
@import @boundary
Scenario Outline: Enforce import file size limit
  Given the configured maximum file size is 26214400 bytes
  When I upload a file of "<bytes>" bytes
  Then the result is "<result>"

  Examples:
    | bytes    | result   |
    | 1        | accepted |
    | 26214400 | accepted |
    | 26214401 | rejected |
```

## Scenario CTM-IMP-004 – Detect duplicate rows inside the file

```gherkin
@import @negative
Scenario: Duplicate participant rows are reported before commit
  Given row 10 and row 24 represent the same identity and same employee code
  When the import is validated
  Then both row references are included in validation diagnostics
  And the duplicate classification uses "CTM_IMPORT_DUPLICATE_ROW"
  And duplicate rows are not committed
```

## Scenario CTM-IMP-005 – Ambiguous Person match requires human resolution

```gherkin
@import @negative @cross-context
Scenario: Do not auto-merge an ambiguous Person identity match
  Given import row 12 matches more than one possible Person
  When the import is validated
  Then row 12 is marked invalid
  And code "CTM_IMPORT_PERSON_MATCH_AMBIGUOUS" is returned
  And CTM does not create a Person merge
  And CTM does not create a CorporateParticipant for row 12
```

## Scenario CTM-IMP-006 – Cannot commit before validation

```gherkin
@import @negative
Scenario: Reject import commit when validation is incomplete
  Given import job "IMP-1" is in VALIDATING state
  When I request commit
  Then the request fails with code "CTM_IMPORT_NOT_VALIDATED"
  And no CorporateParticipant is created
```

## Scenario CTM-IMP-007 – Commit valid rows with deterministic result summary

```gherkin
@import @positive
Scenario: Commit validated rows and preserve invalid rows as rejected
  Given import "IMP-1" has:
    | totalRows | 100 |
    | validRows | 95  |
    | failedRows| 5   |
  When an authorized user commits the validated import
  Then exactly 95 valid rows are processed according to idempotent commit rules
  And the 5 invalid rows are not committed
  And the final result reports committedRows, failedRows, and duplicateRows
  And a CorporateParticipantImportCommitted event is created after commit
```

## Scenario CTM-IMP-008 – Repeated commit with same idempotency key

```gherkin
@import @idempotency
Scenario: Repeating the same import commit does not duplicate participants
  Given import "IMP-1" was committed with idempotency key "KEY-IMPORT-001"
  When the same commit payload is submitted again with "KEY-IMPORT-001"
  Then the prior committed result is returned
  And no new CorporateParticipant rows are inserted
```

## Scenario CTM-IMP-009 – Same idempotency key with different payload fails

```gherkin
@import @idempotency @negative
Scenario: Reject idempotency key reuse for a different payload
  Given "KEY-IMPORT-001" was used for import payload A
  When payload B is submitted with the same key
  Then the request fails with HTTP 409
  And code "CTM_IDEMPOTENCY_CONFLICT" is returned
```

---

# 8. Feature – Single Corporate Enrollment Orchestration

```gherkin
Feature: Orchestrate corporate enrollment
  As an authorized Enrollment Officer or Training Coordinator
  I want CTM to coordinate corporate enrollment
  So that corporate linkage is preserved while Enrollment remains owned by Admission & Enrollment
```

## Scenario CTM-ENR-001 – Successful single Corporate Enrollment orchestration

```gherkin
@corporate-enrollment @positive @cross-context
Scenario: Create CorporateEnrollment linkage after successful owner validations
  Given CorporateParticipant "CP-A1" is ACTIVE under "ACCOUNT-A"
  And Contract "CONTRACT-A" belongs to "ACCOUNT-A" and is usable
  And Course Catalog confirms COURSE-1 is enrollable
  And Training Delivery confirms BATCH-1 belongs to COURSE-1
  And Training Delivery confirms one seat is available
  And Scheduling reports no blocking feasibility conflict
  And Course Catalog resolves valid pricing
  And Finance returns credit validation PASS
  And Admission & Enrollment accepts the create Enrollment command
  And Admission & Enrollment returns Enrollment "E-1001"
  When CTM completes the orchestration
  Then CTM creates one CorporateEnrollment linkage
  And the linkage references ACCOUNT-A
  And the linkage references CP-A1
  And the linkage references E-1001
  And the linkage references CONTRACT-A
  And the Enrollment record remains owned by Admission & Enrollment
  And CorporateEnrollmentCreated is emitted after successful commit
```

## Scenario CTM-ENR-002 – Reject contract/account mismatch

```gherkin
@corporate-enrollment @negative
Scenario: Contract must belong to the same account as participant
  Given CP-A1 belongs to ACCOUNT-A
  And CONTRACT-B belongs to ACCOUNT-B
  When enrollment orchestration is requested for CP-A1 using CONTRACT-B
  Then CTM rejects the request with "CTM_CONTRACT_ACCOUNT_MISMATCH"
  And Course Catalog, Training Delivery, Finance, and Admission & Enrollment create commands are not invoked
```

## Scenario CTM-ENR-003 – Course validation failure is delegated

```gherkin
@corporate-enrollment @negative @cross-context
Scenario: Reject when Course Catalog reports course is not enrollable
  Given CTM-owned participant and contract checks pass
  And Course Catalog returns NOT_ENROLLABLE for COURSE-1
  When the orchestration runs
  Then CTM returns "CTM_COURSE_VALIDATION_FAILED"
  And CTM does not create a CorporateEnrollment link
  And CTM does not implement a second independent course-publish rule
```

## Scenario CTM-ENR-004 – Batch/course mismatch

```gherkin
@corporate-enrollment @negative @cross-context
Scenario: Reject when Training Delivery reports batch belongs to another course
  Given COURSE-1 is valid
  And Training Delivery reports BATCH-1 belongs to COURSE-2
  When enrollment is requested for COURSE-1 and BATCH-1
  Then the flow fails with "CTM_BATCH_COURSE_MISMATCH"
  And no Enrollment creation command is issued
```

## Scenario CTM-ENR-005 – Capacity exhausted at boundary

```gherkin
@corporate-enrollment @boundary @cross-context
Scenario: Reject when the final batch seat is no longer available
  Given a pricing preview was obtained earlier
  And BATCH-1 had one seat when the preview was shown
  And another enrollment consumes the last seat before commit
  And Training Delivery reports capacity unavailable during authoritative commit validation
  When CTM resumes orchestration
  Then the request fails with "CTM_BATCH_CAPACITY_EXCEEDED"
  And CTM does not rely on the stale UI preview
  And no CorporateEnrollment link is created
```

## Scenario CTM-ENR-006 – Finance credit block

```gherkin
@corporate-enrollment @negative @cross-context
Scenario: Block enrollment when Finance returns blocking credit decision
  Given CTM participant, contract, course, batch, and schedule checks pass
  And Finance returns:
    | decision | BLOCK |
    | reason   | CREDIT_LIMIT_EXCEEDED |
  When CTM processes the validation result
  Then the orchestration fails with "CTM_CORPORATE_CREDIT_BLOCKED"
  And Admission & Enrollment create command is not issued
  And CTM stores or logs only the approved decision reference needed for traceability
  And CTM does not recalculate available credit
```

## Scenario CTM-ENR-007 – Finance timeout fails closed

```gherkin
@corporate-enrollment @negative @cross-context
Scenario: Credit validation timeout is not treated as approval
  Given all pre-credit checks pass
  And Finance credit validation times out
  When CTM handles the dependency failure
  Then the request fails with "CTM_DEPENDENCY_UNAVAILABLE"
  And credit is not assumed to pass
  And no Enrollment creation command is called
```

## Scenario CTM-ENR-008 – Pricing preview becomes stale

```gherkin
@corporate-enrollment @boundary
Scenario: Re-resolve pricing when preview token is stale
  Given a user viewed price preview token "PRICE-TOKEN-1"
  And Course Catalog marks that token stale after a pricing change
  When enrollment orchestration is submitted with "PRICE-TOKEN-1"
  Then CTM requests fresh authoritative pricing
  And the user is not enrolled using stale preview values
  And any changed price follows the approved confirmation policy
```

## Scenario CTM-ENR-009 – Idempotent enrollment request

```gherkin
@corporate-enrollment @idempotency
Scenario: Retried enrollment orchestration does not create duplicate Enrollment or CorporateEnrollment
  Given request payload A completed successfully with idempotency key "ENR-KEY-001"
  And owner context returned Enrollment E-1001
  When the same payload is retried with "ENR-KEY-001"
  Then CTM returns the prior result
  And Admission & Enrollment is not asked to create another Enrollment
  And no second CorporateEnrollment linkage is created
```

---

# 9. Feature – DDD Ownership and Aggregate Boundary

```gherkin
Feature: Preserve DDD aggregate ownership boundaries
  As the architecture owner
  I want Corporate Training orchestration to respect bounded-context ownership
  So that CTM does not become a second owner of Enrollment or downstream aggregates
```

## Scenario CTM-DDD-001 – CTM must not directly persist Enrollment

```gherkin
@ddd-ownership @corporate-enrollment @critical
Scenario: Corporate Training delegates Enrollment creation to Admission and Enrollment
  Given CorporateParticipant "CP-A1" is valid
  And all Course, Batch, Schedule, Pricing, and Credit validations pass
  And CTM has permission to orchestrate corporate enrollment
  When CTM requests creation of a learning enrollment
  Then CTM calls the Admission & Enrollment application service
  And CTM does not execute INSERT or UPDATE against the Enrollment table
  And Admission & Enrollment validates the Enrollment aggregate invariants
  And Admission & Enrollment creates or links StudentProfile for the shared Person as required
  And Admission & Enrollment returns the created Enrollment identifier
  And only then CTM creates its CorporateEnrollment linkage
```

## Scenario CTM-DDD-002 – CTM cannot mutate Enrollment status through CorporateEnrollment API

```gherkin
@ddd-ownership @negative
Scenario: CorporateEnrollment billing endpoint cannot change Enrollment lifecycle state
  Given CorporateEnrollment CE-1 references Enrollment E-1
  And E-1 is ACTIVE in Admission & Enrollment
  When a user calls the CTM billing status transition endpoint with toStatus "BILLED"
  Then only CTM billing coordination state is evaluated
  And Enrollment E-1 remains ACTIVE
  And CTM does not issue direct Enrollment status mutation
```

## Scenario CTM-DDD-003 – CTM does not compute completion eligibility

```gherkin
@ddd-ownership @cross-context
Scenario: Completion status is consumed from Exam and Completion context
  Given a corporate participant has attendance and exam data
  When CTM Account 360 requests completion status
  Then CTM reads an approved Completion projection
  And CTM does not calculate completion approval from raw attendance and result tables
  And no CTM command marks the Enrollment completed
```

## Scenario CTM-DDD-004 – CTM does not create Finance ledger state

```gherkin
@ddd-ownership @cross-context
Scenario: CTM billing coordination does not replace Invoice status
  Given CorporateEnrollment CE-1 is READY_FOR_BILLING
  When a Finance invoice is generated by Finance context
  And Finance confirms the invoice reference
  Then CTM may transition coordination state according to its rules
  But CTM never creates or updates Invoice, Payment, Receipt, Refund, or Receivable records directly
```

---

# 10. Feature – Bulk Corporate Enrollment

## Scenario CTM-BENR-001 – Validate and create a valid bulk enrollment group

```gherkin
@corporate-enrollment @bulk @positive
Scenario: Bulk enroll valid participants
  Given 20 active CorporateParticipants belong to ACCOUNT-A
  And CONTRACT-A is valid
  And COURSE-1 and BATCH-1 are valid
  And Training Delivery confirms at least 20 available seats
  And Finance credit validation passes for the requested value
  When an authorized user submits the bulk enrollment request
  Then each participant result is deterministic
  And owner context creates valid Enrollment aggregates
  And CTM creates corresponding CorporateEnrollment links for successful rows
  And the response summarizes requested, successful, and failed counts
```

## Scenario CTM-BENR-002 – Reject participant from another account

```gherkin
@corporate-enrollment @bulk @negative
Scenario: All participants in a bulk request must belong to the selected account
  Given CP-A1 belongs to ACCOUNT-A
  And CP-B1 belongs to ACCOUNT-B
  When a bulk request for ACCOUNT-A includes CP-A1 and CP-B1
  Then CP-B1 fails validation with account-scope mismatch
  And the system follows the approved validate-before-commit policy
  And no silent reassignment of CP-B1 occurs
```

## Scenario CTM-BENR-003 – Exact capacity boundary

```gherkin
@corporate-enrollment @bulk @boundary
Scenario Outline: Validate bulk request against authoritative available capacity
  Given BATCH-1 has exactly 10 available seats
  When a bulk request contains "<count>" valid participants
  Then the capacity result is "<result>"

  Examples:
    | count | result   |
    | 9     | accepted |
    | 10    | accepted |
    | 11    | rejected |
```

## Scenario CTM-BENR-004 – Duplicate participant IDs in request

```gherkin
@corporate-enrollment @bulk @negative
Scenario: Duplicate participant IDs cannot create duplicate enrollments
  Given the request contains CP-A1 twice
  When bulk validation runs
  Then the duplicate input is rejected or deterministically deduplicated according to the API contract
  And at most one Enrollment creation command is sent for CP-A1
  And at most one CorporateEnrollment link is created
```

---

# 11. Feature – Billing Coordination State

## Scenario CTM-BIL-001 – Move to READY_FOR_BILLING

```gherkin
@billing @positive
Scenario: Mark corporate enrollment ready for billing
  Given CorporateEnrollment CE-1 is in NOT_READY
  And business preconditions for billing readiness are satisfied
  And I have "corporate-training.enrollment.billing-status.manage"
  When I transition CE-1 to READY_FOR_BILLING
  Then the CTM billing status changes
  And CorporateEnrollmentBillingReady is emitted after commit
  And no Invoice is created by CTM
```

## Scenario CTM-BIL-002 – Cannot mark BILLED without Finance confirmation

```gherkin
@billing @negative @cross-context
Scenario: Finance confirmation is required before BILLED
  Given CE-1 is BILLING_REQUESTED
  And Finance has not returned an invoice confirmation
  When a user attempts to set CTM billing status to BILLED
  Then the command fails with "CTM_FINANCE_CONFIRMATION_REQUIRED"
  And CTM state remains BILLING_REQUESTED
```

## Scenario CTM-BIL-003 – ON_HOLD requires reason

```gherkin
@billing @validation
Scenario: Billing hold transition requires reason
  Given CE-1 can transition to ON_HOLD
  When the command omits a reason
  Then validation fails
  And CE-1 state is unchanged
```

---

# 12. Feature – Reconciliation and Repair

## Scenario CTM-REC-001 – Detect mismatched CorporateEnrollment linkage

```gherkin
@reconciliation @positive
Scenario: Detect an account-participant-enrollment mismatch
  Given CorporateEnrollment CE-1 references participant CP-A1
  And authoritative Enrollment E-2 resolves to a different participant relationship
  When the reconciliation process checks CE-1
  Then an exception is recorded in the reconciliation read model
  And severity and detectedAt are populated
  And CorporateEnrollmentLinkMismatchDetected is emitted for notification processing
```

## Scenario CTM-REC-002 – Repair a deterministic mismatch

```gherkin
@reconciliation @audit @positive
Scenario: Authorized repair updates only CTM-owned linkage
  Given a reconciliation case proves CE-1 should reference E-1001
  And E-1001 exists in Admission & Enrollment
  And participant/account relationships match
  And I have "corporate-training.reconciliation.repair"
  When I repair CE-1 with a detailed reason and expected version
  Then CTM updates only the CTM-owned linkage
  And old and new values are audited
  And the Enrollment aggregate is not modified
  And CorporateEnrollmentLinkRepaired is emitted after commit
```

## Scenario CTM-REC-003 – Reject unsafe repair target

```gherkin
@reconciliation @negative
Scenario: Reject repair when target Enrollment belongs to a mismatched participant
  Given CE-1 belongs to CP-A1
  And proposed Enrollment E-999 belongs to another participant
  When repair is requested
  Then the command fails with "CTM_RECONCILIATION_TARGET_INVALID"
  And no linkage is changed
```

---

# 13. Feature – Authentication and Permission Guards

```gherkin
Feature: Enforce CTM authorization
  Every CTM endpoint must enforce authentication and fine-grained permission
```

## Scenario CTM-AUTH-001 – Unauthenticated request

```gherkin
@authorization @negative
Scenario: Reject unauthenticated CTM request
  Given I have no authenticated session
  When I request GET /api/v1/corporate-training/accounts
  Then the response status is 401
  And the code is "AUTHENTICATION_REQUIRED"
  And no account data is returned
```

## Scenario CTM-AUTH-002 – Authenticated user lacks action permission

```gherkin
@authorization @negative
Scenario: Reject account creation without create permission
  Given I am authenticated
  And I do not have "corporate-training.account.create"
  When I submit a valid create account payload
  Then the response status is 403
  And code "CTM_PERMISSION_DENIED" is returned
  And no CorporateAccount is created
```

## Scenario CTM-AUTH-003 – Read permission does not imply update permission

```gherkin
@authorization
Scenario: Read-only account user cannot mutate account
  Given I have "corporate-training.account.read"
  And I do not have "corporate-training.account.update"
  When I PATCH ACCOUNT-A
  Then the response is 403
  And the account remains unchanged
```

## Scenario CTM-AUTH-004 – Menu permission is not action permission

```gherkin
@authorization
Scenario: Visible menu capability does not authorize API command
  Given I have "menu.corporate-training.accounts"
  And I do not have "corporate-training.account.update"
  When I directly call the account update API
  Then the request is denied with 403
```

## Scenario CTM-AUTH-005 – Consolidated report permission does not imply mutation

```gherkin
@authorization @reporting
Scenario: Executive consolidated viewer cannot update Corporate Account
  Given I am "executiveViewer"
  And I have consolidated report permissions
  And I do not have account update permission
  When I attempt to update ACCOUNT-A
  Then the request is rejected with 403
  And consolidated visibility does not widen mutation scope
```

---

# 14. Feature – Branch Data Isolation

```gherkin
Feature: Enforce server-side branch isolation
  A branch-scoped user must not read or mutate data outside the authorized branch set
```

## Scenario CTM-BR-001 – Branch user reads own branch data

```gherkin
@branch-isolation @positive
Scenario: Muscat CTM admin can read Muscat-scoped account data
  Given "ctmAdminMuscat" is assigned only to Muscat
  And ACCOUNT-A is authorized for Muscat under the approved account-branch policy
  When the user requests ACCOUNT-A
  Then the response is 200
```

## Scenario CTM-BR-002 – Branch user cannot read another branch account

```gherkin
@branch-isolation @negative
Scenario: Muscat user cannot read Salalah account by guessing ID
  Given "ctmAdminMuscat" is assigned only to Muscat
  And ACCOUNT-B is scoped to Salalah
  When the user requests GET /accounts/ACCOUNT-B
  Then the request is denied with 403 or scope-safe 404 according to security policy
  And no ACCOUNT-B fields are returned
```

## Scenario CTM-BR-003 – Query parameter cannot bypass branch scope

```gherkin
@branch-isolation @negative
Scenario: Client-supplied branchId cannot widen access
  Given I am assigned only to Muscat
  When I call the account search API with branchId "SALALAH"
  Then the server intersects the request with my authorized branch set
  And Salalah-only records are not returned
  And the browser-provided branchId is not treated as authorization evidence
```

## Scenario CTM-BR-004 – Mutation is blocked outside branch scope

```gherkin
@branch-isolation @negative
Scenario: Muscat admin cannot update Salalah participant
  Given CP-B1 is scoped through ACCOUNT-B to Salalah
  And I am assigned only to Muscat
  And I possess participant update permission
  When I PATCH CP-B1
  Then the response is 403
  And code "CTM_BRANCH_SCOPE_DENIED" or "CTM_ACCOUNT_SCOPE_DENIED" is returned
  And CP-B1 remains unchanged
```

## Scenario CTM-BR-005 – Child branch access is conditional

```gherkin
@branch-isolation
Scenario Outline: Parent branch access to child branch depends on IAM branch policy
  Given a parent-branch user has canViewChildBranches "<flag>"
  And the target record belongs to an authorized child branch
  When the user requests the record
  Then access is "<result>"

  Examples:
    | flag  | result  |
    | true  | allowed |
    | false | denied  |
```

## Scenario CTM-BR-006 – Consolidated report access does not expose raw unauthorized export

```gherkin
@branch-isolation @reporting
Scenario: Consolidated metrics do not automatically permit unrestricted raw export
  Given executiveViewer can view consolidated KPI widgets
  And executiveViewer lacks participant register report permission
  When the user requests a participant-level XLSX export
  Then the export request is denied
  And no file is generated
```

## Scenario CTM-BR-007 – Known branch-model gap must fail safe

```gherkin
@branch-isolation @critical
Scenario: Pre-enrollment account with unresolved branch ownership is not treated as globally visible
  Given ACCOUNT-X has no approved Account-to-Branch authorization mapping
  And a branch-scoped user requests ACCOUNT-X
  When the server cannot resolve authorized scope
  Then access fails closed
  And ACCOUNT-X is not returned as globally accessible
```

---

# 15. Feature – Corporate Account Scope Isolation

## Scenario CTM-SCOPE-001 – Account Manager reads assigned account only

```gherkin
@account-isolation
Scenario: Account manager cannot read unassigned account
  Given accountManagerA is assigned to ACCOUNT-A
  And ACCOUNT-B is not assigned
  When accountManagerA requests ACCOUNT-B
  Then access is denied
```

## Scenario CTM-SCOPE-002 – Account Manager search returns only portfolio accounts

```gherkin
@account-isolation
Scenario: Account-scoped search filters server-side
  Given accountManagerA is assigned ACCOUNT-A
  When the user searches all active accounts
  Then ACCOUNT-A may be returned
  And ACCOUNT-B is not returned
```

---

# 16. Feature – Student Self Scope

## Scenario CTM-SELF-001 – Student reads own corporate training status

```gherkin
@self-scope @positive
Scenario: Student can view own corporate training status
  Given studentOne maps to Person P1 and Enrollment E1
  And E1 is linked to CP-A1
  When studentOne requests own corporate training status
  Then the response includes only records related to studentOne
```

## Scenario CTM-SELF-002 – Student cannot request another student's status

```gherkin
@self-scope @negative
Scenario: Student cannot access another participant by changing enrollmentId
  Given studentOne owns E1
  And E2 belongs to another Person
  When studentOne requests status for E2
  Then access is denied
  And no E2 details are returned
```

---

# 17. Feature – Trainer Assignment Scope

## Scenario CTM-TRN-001 – Trainer views assigned roster

```gherkin
@trainer-scope @positive
Scenario: Trainer reads roster for assigned corporate batch
  Given trainerOne is assigned to BATCH-1
  When trainerOne requests the BATCH-1 corporate roster
  Then only participants enrolled in the assigned batch are returned
  And identity fields are minimized according to trainer permissions
```

## Scenario CTM-TRN-002 – Trainer cannot view unassigned batch roster

```gherkin
@trainer-scope @negative
Scenario: Trainer cannot access another trainer's batch
  Given trainerOne is not assigned to BATCH-2
  When trainerOne requests BATCH-2 roster
  Then the request is denied
```

## Scenario CTM-TRN-003 – Trainer roster is read-only in CTM

```gherkin
@trainer-scope @ddd-ownership
Scenario: Trainer CTM roster screen does not mark attendance
  Given trainerOne is viewing an assigned CTM roster
  When the trainer needs to mark attendance
  Then the CTM screen routes to or invokes the Attendance-owned capability
  And CTM does not update AttendanceRecord directly
```

---

# 18. Feature – Sensitive Field Authorization

## Scenario CTM-SEC-001 – Mask Civil ID without sensitive permission

```gherkin
@authorization @security
Scenario: Participant identity is masked for normal readers
  Given I have participant read permission
  And I do not have "corporate-training.participant.identity-sensitive.read"
  When I read a participant report
  Then full Civil ID is omitted or masked
```

## Scenario CTM-SEC-002 – Contract commercial fields require additional permission

```gherkin
@authorization @security
Scenario: Hide contract value from operational reader
  Given I have contract read permission
  And I lack "corporate-training.contract.commercial.read"
  When I read contract detail
  Then contract lifecycle fields are visible
  But contractValue and protected payment terms are omitted or masked
```

## Scenario CTM-SEC-003 – Export applies same field restrictions

```gherkin
@authorization @reporting
Scenario: Export cannot reveal columns hidden in interactive report
  Given I lack finance-sensitive and identity-sensitive permissions
  When I export a report I am otherwise authorized to view
  Then the exported file excludes or masks the same protected fields
```

---

# 19. Feature – Reports and Read Models

## Scenario CTM-RPT-001 – Operational report uses server-side filters

```gherkin
@reporting @positive
Scenario: Generate Contract Status report
  Given I have contract status report permission
  And I am scoped to Muscat
  When I filter:
    | status       | ACTIVE     |
    | expiryWindow | 30         |
  Then only authorized Muscat contracts matching the filter are returned
  And sorting and pagination are applied server-side
```

## Scenario CTM-RPT-002 – Read model is explicitly read-only

```gherkin
@reporting @ddd-ownership @critical
Scenario: Attempt to update reporting view is prohibited
  Given vw_ctm_enrollment_lifecycle contains a row for CE-1
  When an application command attempts to change enrollmentStatus by updating the read model
  Then the operation is rejected
  And the authoritative Enrollment row remains unchanged
  And state changes must use the Admission & Enrollment application service
```

## Scenario CTM-RPT-003 – Staleness metadata is shown

```gherkin
@reporting
Scenario: Eventually consistent widget displays refresh timestamp
  Given Finance projection was refreshed at 2026-07-11T09:00:00+04:00
  When a user views Outstanding Receivables at 09:30
  Then the widget displays Finance data as of 09:00
  And it does not label the value as real-time
```

## Scenario CTM-RPT-004 – Export requires both report and export permissions

```gherkin
@reporting @authorization
Scenario Outline: Report export authorization requires two capabilities
  Given report permission is "<reportPerm>"
  And export permission is "<exportPerm>"
  When export is requested
  Then result is "<result>"

  Examples:
    | reportPerm | exportPerm | result  |
    | true       | true       | allowed |
    | true       | false      | denied  |
    | false      | true       | denied  |
    | false      | false      | denied  |
```

## Scenario CTM-RPT-005 – Consolidated dashboard requires additive scope

```gherkin
@reporting @authorization
Scenario: Consolidated dashboard requires permission and consolidated flag
  Given user has "corporate-training.dashboard.executive.read"
  But canViewConsolidated is false
  When the executive dashboard is requested
  Then access is denied with "CTM_CONSOLIDATED_SCOPE_DENIED"
```

---

# 20. Feature – Notification Side Effects

## Scenario CTM-NOT-001 – Notification only after transaction commit

```gherkin
@notification @positive
Scenario: Contract activation notification is requested after commit
  Given a valid contract activation transaction
  When the transaction commits
  Then CorporateContractActivated is published
  And Communication context may create the notification request
```

## Scenario CTM-NOT-002 – Rollback produces no success notification

```gherkin
@notification @negative
Scenario: Failed participant commit does not send success notification
  Given import commit starts
  And the CTM transaction rolls back
  When event processing is inspected
  Then CorporateParticipantImportCommitted is not published as a successful event
  And no success notification is sent
```

## Scenario CTM-NOT-003 – Notification failure does not roll back business state

```gherkin
@notification @cross-context
Scenario: Communication provider failure does not undo committed CTM state
  Given Contract A was successfully activated and committed
  And Communication delivery fails
  When the failure is recorded
  Then Contract A remains ACTIVE
  And Communication owns retry and delivery log behavior
```

## Scenario CTM-NOT-004 – Do not expose sensitive identity in payload

```gherkin
@notification @security
Scenario: Participant notification event excludes full sensitive identifiers
  Given a participant has Civil ID and passport data
  When CorporateEnrollmentCreated is emitted
  Then the event payload includes participantPersonId and required business references
  But does not include full Civil ID or passport image/data
```

---

# 21. Feature – Audit Requirements

## Scenario CTM-AUD-001 – Sensitive lifecycle change is audited

```gherkin
@audit
Scenario: Contract suspension captures complete audit evidence
  Given Contract A is ACTIVE
  When authorized user suspends it with reason "Commercial hold"
  Then audit evidence includes:
    | actor         | authenticated user |
    | entityType    | CorporateContract  |
    | entityId      | Contract A         |
    | oldValue      | ACTIVE             |
    | newValue      | SUSPENDED          |
    | reason        | Commercial hold    |
    | correlationId | non-empty          |
  And the audit record is written through the approved audit convention
```

## Scenario CTM-AUD-002 – Rejected authorization does not mutate data

```gherkin
@audit @authorization
Scenario: Unauthorized repair attempt leaves linkage unchanged
  Given user lacks reconciliation repair permission
  When the user submits a valid repair payload
  Then access is denied
  And no CTM linkage is changed
  And security logging follows platform policy
```

---

# 22. Feature – API Validation Boundaries

## Scenario CTM-VAL-001 – Unknown enum value rejected

```gherkin
@validation @negative
Scenario: Reject unknown billing model
  When a contract payload contains billingModel "PER_PLANET"
  Then schema validation returns 422
  And no contract is created
```

## Scenario CTM-VAL-002 – Trim normalized input

```gherkin
@validation
Scenario: Normalize account name whitespace
  When accountName is submitted as "  Company A  "
  Then the stored normalized value is "Company A"
```

## Scenario CTM-VAL-003 – Empty optional string normalized

```gherkin
@validation
Scenario: Optional blank department is not persisted as meaningful value
  When participant department is submitted as whitespace only
  Then the value is normalized according to schema convention
  And whitespace-only business data is not treated as a department
```

## Scenario CTM-VAL-004 – Maximum page size boundary

```gherkin
@boundary @reporting
Scenario Outline: Enforce interactive report page size limit
  When pageSize "<size>" is requested
  Then the result is "<result>"

  Examples:
    | size | result   |
    | 1    | accepted |
    | 20   | accepted |
    | 100  | accepted |
    | 101  | rejected |
```

---

# 23. Feature – Cross-Context Failure Handling

## Scenario CTM-DEP-001 – Person resolution unavailable

```gherkin
@cross-context @negative
Scenario: Participant registration stops when Person owner is unavailable
  Given CTM receives valid participant employer metadata
  And Person identity resolution service is unavailable
  When registration is attempted
  Then CTM returns a dependency failure
  And CTM does not create an unlinked duplicate Person representation
  And CTM does not create CorporateParticipant without an approved Person reference
```

## Scenario CTM-DEP-002 – Enrollment owner rejects invariant

```gherkin
@cross-context @negative @ddd-ownership
Scenario: CTM propagates owner rejection without bypassing it
  Given CTM local checks pass
  And Admission & Enrollment rejects the create command because an Enrollment invariant fails
  When CTM receives the rejection
  Then CTM returns "CTM_ENROLLMENT_CREATION_FAILED" with correlation reference
  And CTM does not insert an Enrollment directly
  And no CorporateEnrollment linkage is created
```

## Scenario CTM-DEP-003 – Completion projection unavailable

```gherkin
@cross-context @reporting
Scenario: Account 360 reports completion data unavailable rather than inventing status
  Given CTM account and enrollment data are available
  And Completion projection is temporarily unavailable
  When Account 360 is loaded
  Then CTM-owned sections remain available if contract permits partial read
  And Completion section is marked unavailable or stale
  And CTM does not infer completion from attendance alone
```

---

# 24. Feature – State Machine Boundary Tests

## Scenario CTM-SM-001 – Account lifecycle transition matrix is authoritative

```gherkin
@state-machine @boundary
Scenario Outline: Account transition follows approved matrix
  Given CorporateAccount is "<from>"
  When authorized transition to "<to>" is requested
  Then result is "<result>"

  Examples:
    | from      | to        | result  |
    | DRAFT     | ACTIVE    | allowed |
    | ACTIVE    | SUSPENDED | allowed |
    | SUSPENDED | ACTIVE    | allowed |
    | CLOSED    | ACTIVE    | denied  |
```

The exact matrix must match Part 2. Any implementation difference is a test failure.

## Scenario CTM-SM-002 – Participant history survives all allowed status changes

```gherkin
@state-machine @participant
Scenario: Participant lifecycle never transfers historical enrollment links
  Given CP-A1 has three historical CorporateEnrollment links
  When CP-A1 moves through an allowed deactivate/reactivate lifecycle
  Then all three historical links remain attached to CP-A1
  And no link is transferred to another CorporateAccount
```

---

# 25. Feature – Data Integrity and Referential Behavior

## Scenario CTM-DATA-001 – Restrict deletion of referenced Person

```gherkin
@data-integrity
Scenario: CTM relationship does not cascade-delete Person
  Given CorporateParticipant CP-A1 references Person P1
  When CTM participant is deactivated or archived
  Then Person P1 is not deleted
```

## Scenario CTM-DATA-002 – Restrict account hard deletion with children

```gherkin
@data-integrity
Scenario: Historical child relationships survive account archival
  Given ACCOUNT-A has contacts, contracts, participants, and CorporateEnrollment links
  When ACCOUNT-A is archived through approved soft-delete flow
  Then child history remains queryable for authorized audit/reporting use
  And no cascade hard delete removes those records
```

## Scenario CTM-DATA-003 – Duplicate CorporateEnrollment link blocked

```gherkin
@data-integrity @negative
Scenario: Same Enrollment cannot be linked twice in conflicting CTM relationships
  Given CorporateEnrollment CE-1 already links Enrollment E-1 under the approved uniqueness rule
  When another command attempts to create a conflicting link for E-1
  Then the command fails with "CTM_CORPORATE_ENROLLMENT_DUPLICATE"
```

---

# 26. Feature – Bilingual and Localization Acceptance

## Scenario CTM-I18N-001 – English report renders LTR

```gherkin
@i18n
Scenario: English Corporate Account report uses LTR layout
  Given user language is English
  When the Account Summary report is rendered
  Then labels use English localized values
  And layout direction is left-to-right
  And OMR amounts use approved formatting
```

## Scenario CTM-I18N-002 – Arabic PDF export renders RTL

```gherkin
@i18n @reporting
Scenario: Arabic report export supports RTL
  Given user language is Arabic
  When an authorized PDF report is generated
  Then page direction is right-to-left
  And Arabic labels are used where configured
  And numeric values remain readable
  And Unicode Arabic text is preserved
```

---

# 27. Test Case Matrix – Authorization Guards

| Test ID | Endpoint/Capability | Required Permission | Negative Test | Expected Result |
|---|---|---|---|---|
| AUTH-TC-001 | Search accounts | `corporate-training.account.read` | No permission | 403 |
| AUTH-TC-002 | Create account | `corporate-training.account.create` | Read only | 403 |
| AUTH-TC-003 | Update account | `corporate-training.account.update` | Menu only | 403 |
| AUTH-TC-004 | Account status | `corporate-training.account.status.manage` | Update permission only | 403 |
| AUTH-TC-005 | Archive account | `corporate-training.account.archive` | Status permission only | 403 |
| AUTH-TC-006 | Create contact | `corporate-training.contact.create` | Contact read only | 403 |
| AUTH-TC-007 | Set primary contact | `corporate-training.contact.primary.manage` | Contact update only | 403 |
| AUTH-TC-008 | Create contract | `corporate-training.contract.create` | Contract read only | 403 |
| AUTH-TC-009 | Contract transition | `corporate-training.contract.status.manage` | Contract update only | 403 |
| AUTH-TC-010 | Create participant | `corporate-training.participant.create` | Participant read only | 403 |
| AUTH-TC-011 | Commit import | `corporate-training.participant.import.commit` | Import validate only | 403 |
| AUTH-TC-012 | Single enrollment | `corporate-training.enrollment.create` | Enrollment read only | 403 |
| AUTH-TC-013 | Bulk enrollment | `corporate-training.enrollment.bulk.create` | Single create only | 403 |
| AUTH-TC-014 | Billing transition | `corporate-training.enrollment.billing-status.manage` | Enrollment create only | 403 |
| AUTH-TC-015 | Reconciliation repair | `corporate-training.reconciliation.repair` | Reconciliation read only | 403 |
| AUTH-TC-016 | Report export | report permission + `corporate-training.report.export` | Only one of two | 403 |
| AUTH-TC-017 | Consolidated dashboard | dashboard permission + consolidated scope | Missing scope flag | 403 |
| AUTH-TC-018 | Sensitive identity | `participant.identity-sensitive.read` | Base read only | Mask/omit |
| AUTH-TC-019 | Commercial terms | `contract.commercial.read` | Base read only | Mask/omit |
| AUTH-TC-020 | Student own status | `student.corporate-training.self.read` | Another student's ID | 403/safe 404 |
| AUTH-TC-021 | Trainer roster | `trainer.corporate-training.roster.read` + assignment | Unassigned batch | 403 |

---

# 28. Test Case Matrix – Branch and Scope Isolation

| Test ID | User Scope | Target Scope | Operation | Expected |
|---|---|---|---|---|
| ISO-TC-001 | Muscat | Muscat | Read account | Allow |
| ISO-TC-002 | Muscat | Salalah | Read account | Deny |
| ISO-TC-003 | Muscat | Salalah | Update participant | Deny |
| ISO-TC-004 | Muscat + child access | Child branch | Read | Allow |
| ISO-TC-005 | Muscat without child access | Child branch | Read | Deny |
| ISO-TC-006 | Account A portfolio | Account A | Read | Allow |
| ISO-TC-007 | Account A portfolio | Account B | Read | Deny |
| ISO-TC-008 | Student P1 | Enrollment P1 | Self read | Allow |
| ISO-TC-009 | Student P1 | Enrollment P2 | Self read | Deny |
| ISO-TC-010 | Trainer B1 | Batch B1 | Roster read | Allow |
| ISO-TC-011 | Trainer B1 | Batch B2 | Roster read | Deny |
| ISO-TC-012 | Consolidated read | Cross-branch report | Read aggregate | Allow |
| ISO-TC-013 | Consolidated read | Cross-branch account update | Mutate | Deny |
| ISO-TC-014 | Unknown account branch mapping | Any branch user | Read | Fail closed |
| ISO-TC-015 | User alters branchId query | Unauthorized branch | Search | No leakage |

---

# 29. Test Case Matrix – Validation Boundary Coverage

| Rule Area | Min | Max/Boundary | Invalid | Duplicate | Concurrency |
|---|---|---|---|---|---|
| Account code | Valid minimum | Valid maximum | Invalid format | Duplicate code | Version conflict |
| Account name | 2 chars | 200 chars | Blank/whitespace | N/A | Version conflict |
| Contract date | Same day | Long valid range | end < start | N/A | Version conflict |
| Contract value | 0 policy | Max precision/value | Negative/overflow | N/A | Version conflict |
| Contact primary | One | One | Two primary | Duplicate person link | Atomic switch |
| Employee code | 1 char | 100 chars | Invalid normalized value | Same account duplicate | Update conflict |
| Import file | 1 byte | 25 MiB | >25 MiB | Same job/key | Idempotency |
| Bulk participant count | 1 | 500 | 0 or 501 | Duplicate IDs | Capacity race |
| Page size | 1 | 100 | 0 or 101 | N/A | N/A |
| Idempotency key | 8 chars | 128 chars | Too short/long | Same key diff payload | Conflict |

---

# 30. Integration Contract Test Requirements

The following contract tests are mandatory.

## 30.1 Organization Management

Verify:

- Organization lookup response;
- organization type classification;
- not-found behavior;
- authorization-safe response.

## 30.2 Person/Party Owner

Verify:

- exact identity match;
- no match;
- ambiguous match;
- same Person reused across employers;
- no CTM duplicate identity creation.

## 30.3 Course Catalog

Verify:

- course valid;
- unpublished/not enrollable;
- pricing resolution success;
- pricing failure;
- stale preview token.

## 30.4 Training Delivery

Verify:

- batch belongs to course;
- batch mismatch;
- exact capacity available;
- insufficient capacity;
- concurrent seat consumption behavior.

## 30.5 Scheduling

Verify:

- no conflict;
- trainer conflict;
- classroom conflict;
- holiday conflict;
- dependency timeout.

## 30.6 Finance

Verify:

- credit PASS;
- credit WARN where policy allows continuation;
- credit BLOCK;
- timeout;
- invoice confirmation for BILLED transition;
- Finance projection read authorization.

## 30.7 Admission & Enrollment

Verify:

- StudentProfile resolve/link;
- StudentProfile creation through owner;
- Enrollment success;
- invariant rejection;
- idempotent create behavior;
- no CTM direct table persistence.

---

# 31. Non-Regression Scenarios for Known Architecture Gaps

## Scenario CTM-GAP-001 – Nomination entity is not silently created

```gherkin
@gap @negative
Scenario: UI or API cannot persist an unapproved CorporateNomination aggregate
  Given the DDD/ER decision for CorporateNomination is unresolved
  When a client attempts an undocumented CTM nomination CRUD endpoint
  Then the route does not exist or returns controlled not-supported behavior
  And no ad hoc nomination table is written
```

## Scenario CTM-GAP-002 – Project closure state is not overloaded onto Account or Contract

```gherkin
@gap
Scenario: Training project closure cannot be simulated by closing CorporateAccount
  Given a corporate training delivery is complete
  When a user requests project closure
  Then CTM does not transition CorporateAccount to CLOSED merely to represent project closure
  And CTM does not overload CorporateContract status
  And the unresolved aggregate decision remains explicit
```

## Scenario CTM-GAP-003 – Costing report does not invent authoritative profitability

```gherkin
@gap @reporting
Scenario: Profitability KPI is withheld until costing ownership is approved
  Given trainer, venue, travel, and other cost ownership are unresolved
  When an executive dashboard is requested
  Then CTM does not present an authoritative profit percentage calculated from incomplete ad hoc data
```

---

# 32. End-to-End Acceptance Scenario

```gherkin
@e2e @ctm @critical
Scenario: Corporate customer lifecycle from account to training-status visibility
  Given authorized CTM staff create CorporateAccount ACCOUNT-A from corporate Organization ORG-A
  And an existing Person is linked as the primary CorporateContact
  And a valid CorporateContract is created and activated
  And participant Person identities are resolved without duplication
  And CorporateParticipants are registered under ACCOUNT-A
  And Course Catalog validates the requested Course
  And Training Delivery validates the Batch and capacity
  And Scheduling validates feasibility
  And Finance validates corporate credit
  And Admission & Enrollment creates Enrollment aggregates
  When CTM creates CorporateEnrollment linkage records
  Then CTM Account 360 shows the linked participant and enrollment status
  And Training Delivery remains authoritative for batch delivery
  And Attendance remains authoritative for attendance
  And Completion remains authoritative for completion approval
  And Certificate remains authoritative for certificate issue
  And Finance remains authoritative for invoice and receivable status
  And reporting projections are read-only
  And all reads and writes remain restricted by permission and scope
  And sensitive lifecycle changes are auditable
```

---

# 33. Acceptance Exit Criteria

Module 14 Part 9 acceptance is satisfied only when:

1. all CTM-owned aggregate/entity scenarios pass;
2. all negative validation scenarios return stable error codes;
3. all authorization guard tests pass;
4. all branch/account/self/assignment isolation tests pass;
5. direct URL/ID tampering cannot bypass scope;
6. stale version updates are rejected;
7. idempotent commands do not duplicate business records;
8. cross-context validation failures fail safely;
9. CTM does not directly create or mutate Enrollment;
10. CTM does not directly mutate Finance, Attendance, Completion, Certificate, Document, IAM, or Audit-owned transactional records;
11. read models are verified as read-only;
12. notifications occur only after successful business commit;
13. notification delivery failure does not roll back CTM business state;
14. soft-delete behavior preserves historical references;
15. known unresolved DDD/ER gaps are not silently implemented as new aggregates.

---

# 34. Final DDD Consistency Proof

The test suite proves the Corporate Training bounded context is implemented as follows:

```text
Corporate Training owns:
    CorporateAccount
    CorporateContact relationship
    CorporateContract
    CorporateParticipant
    CorporateEnrollment linkage
    CTM billing coordination status
    import workflow
    reconciliation workflow

Admission & Enrollment owns:
    StudentProfile lifecycle
    Enrollment aggregate
    Enrollment status transitions

Other contexts own:
    Course and pricing
    Batch and capacity
    Scheduling conflicts
    Finance credit and ledger
    Attendance
    Completion
    Certificate
    Documents
    IAM permissions
    Audit persistence
    Notification delivery
```

The critical architecture acceptance test is `CTM-DDD-001`: CTM may orchestrate a corporate enrollment, but it must obtain the Enrollment identifier by calling the Admission & Enrollment application boundary and may create only its own CorporateEnrollment linkage afterward.

Any implementation in which CTM directly inserts or updates the `Enrollment` aggregate is a failure of Module 14 acceptance, even if the user-visible workflow appears to succeed.
