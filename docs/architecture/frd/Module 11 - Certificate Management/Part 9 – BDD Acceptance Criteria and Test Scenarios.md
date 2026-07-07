# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 11 – Certificate Management

## 1. Purpose

This document defines executable-style BDD acceptance criteria and test scenarios for Module 11 – Certificate Management. The suite validates the functional requirements, business rules, workflows, API contracts, permission model, validation catalog, notifications, reporting behavior, branch isolation, and DDD ownership constraints defined in Parts 1–8.

The scenarios are written to support automated acceptance testing at application-service, API, integration, and end-to-end UI boundaries. They intentionally distinguish:

- Certificate-owned business rules;
- delegated authoritative decisions from Exam, Result & Completion Management;
- delegated payment truth from Fee, Billing & Receivables Management;
- delegated authorization and branch access from Identity & Access Management;
- shared platform validation concerns;
- read-only reporting projections;
- public verification privacy constraints.

## 2. Test Conventions

### 2.1 Actors

| Actor | Description |
|---|---|
| Certificate Administrator | Internal operator with branch-scoped certificate generation, issuance, registry, reissue, and lifecycle permissions as assigned. |
| Branch Manager | Branch-scoped management approver for reissue decisions and authorized lifecycle actions. |
| Academic Coordinator | Internal academic user with readiness, registry, and workflow visibility according to assigned permissions. |
| Finance User | Finance-context user; may provide payment truth but does not mutate Certificate aggregate unless separately granted Certificate permissions. |
| Compliance Auditor | Read-only audit/compliance user with explicit global or assigned scope. |
| Executive Viewer | Consolidated-report consumer with no transactional mutation rights. |
| Student | Authenticated self-service user restricted to certificates and reissue requests connected to own StudentProfile/Enrollment. |
| Trainer | Authenticated trainer restricted to assigned batch/enrollment certificate status views. |
| Public Verifier | Unauthenticated user of the public verification interface. |
| Certificate Application Service | Module-owned application service orchestrating Certificate aggregate commands. |
| Completion Service Port | Read-only application port to authoritative completion eligibility and approval state. |
| Finance Validation Port | Read-only application port to authoritative payment validation result. |
| IAM Authorization Service | Source of permission and branch-scope decisions. |
| Numbering Service | Configuration-owned numbering-series provider. |
| Audit Service | Audit & Compliance-owned recorder of sensitive actions. |
| Communication Service | Communication context consumer of notification requests. |
| Reporting Projection Builder | Read-only projection process consuming lifecycle facts. |

### 2.2 Canonical Test Data

Unless a scenario overrides these values:

| Fixture | Value |
|---|---|
| Branch A | `BR-A` |
| Branch B | `BR-B` |
| Parent Branch | `BR-HQ` |
| Child Branch | `BR-A` |
| Student A | `STU-A` |
| Enrollment A | `ENR-A`, course `COURSE-A`, batch `BATCH-A`, branch `BR-A` |
| Certificate A | `CERT-A`, verification code `VC-A`, branch derived from `ENR-A` |
| Reissue Request A | `RR-A`, source certificate `CERT-A` |
| Generated certificate state | `Generated` |
| Issued certificate state | `Issued` |
| Revoked certificate state | `Revoked` |
| Reissue states | `PendingReview`, `Approved`, `Rejected`, `Completed` |

### 2.3 Expected Error Semantics

Tests should assert HTTP status and structured business error code where the API boundary is under test. Relevant codes include:

- `UNAUTHENTICATED`
- `PERMISSION_DENIED`
- `BRANCH_SCOPE_DENIED`
- `CONSOLIDATED_SCOPE_DENIED`
- `SELF_SCOPE_DENIED`
- `CERTIFICATE_NOT_FOUND`
- `ENROLLMENT_NOT_FOUND`
- `CERTIFICATE_NOT_ELIGIBLE`
- `COMPLETION_NOT_APPROVED`
- `PAYMENT_VALIDATION_FAILED`
- `DUPLICATE_ACTIVE_CERTIFICATE`
- `CERTIFICATE_ALREADY_ISSUED`
- `CERTIFICATE_ALREADY_REVOKED`
- `INVALID_STATE_TRANSITION`
- `VERSION_CONFLICT`
- `IDEMPOTENCY_KEY_CONFLICT`
- `REISSUE_REASON_REQUIRED`
- `REISSUE_REQUEST_ALREADY_OPEN`
- `REISSUE_APPROVAL_REQUIRED`
- `REISSUE_NOT_APPROVED`
- `REPLACEMENT_ALREADY_GENERATED`
- `REVOCATION_REASON_REQUIRED`
- `INVALID_OR_NOT_FOUND`
- `RATE_LIMIT_EXCEEDED`

## 3. Coverage Traceability Matrix

| Test Area | Primary Requirements / Rules | Main Features Below |
|---|---|---|
| Readiness and eligibility | FR-CERT-001 to FR-CERT-005, FR-CERT-034, FR-CERT-039 | Features 1–2 |
| Generation | FR-CERT-006 to FR-CERT-011, FR-CERT-033, FR-CERT-038 | Feature 2 |
| Issuance and lifecycle | FR-CERT-012, FR-CERT-013, FR-CERT-037 | Feature 3 |
| Registry/detail/download | FR-CERT-014 to FR-CERT-016 | Feature 4 |
| Verification | FR-CERT-017 to FR-CERT-020 | Feature 5 |
| Reissue and replacement | FR-CERT-021 to FR-CERT-026 | Features 6–7 |
| Revocation | FR-CERT-027 | Feature 8 |
| Authorization and branch isolation | FR-CERT-028, FR-CERT-029 | Features 9–10 |
| Audit and notification | FR-CERT-030, FR-CERT-031 | Feature 11 |
| Reporting/read models | FR-CERT-032, FR-CERT-036 | Feature 12 |
| Concurrency, retries, history | FR-CERT-033, FR-CERT-035, FR-CERT-037, FR-CERT-038, FR-CERT-040 | Feature 13 |
| DDD aggregate ownership | DDD Certificate aggregate and context integration rules | Feature 14 |

# 4. Gherkin Acceptance Scenarios

## Feature 1 – Certificate Readiness and Eligibility

```gherkin
Feature: Certificate readiness evaluation
  In order to identify enrollments that can proceed to certificate generation
  As an authorized certificate operator
  I want readiness to be calculated from authoritative source-context decisions

  Background:
    Given the user is authenticated
    And the user has permission "certificate.read"
    And the user has access to branch "BR-A"

  Scenario: Eligible enrollment appears in the certificate-ready list
    Given enrollment "ENR-A" exists in branch "BR-A"
    And the Completion context reports completion approved for "ENR-A"
    And the course completion rule requires payment validation
    And the Finance context reports payment validation passed for "ENR-A"
    And no active certificate exists for "ENR-A"
    When the user requests the readiness list
    Then "ENR-A" is returned as ready
    And the response identifies completion as approved
    And the response identifies payment validation as passed
    And no Certificate table mutation occurs

  Scenario: Payment validation is not requested when the course rule does not require payment
    Given enrollment "ENR-A" exists in branch "BR-A"
    And the Completion context reports completion approved for "ENR-A"
    And the course completion rule does not require payment validation
    And no active certificate exists for "ENR-A"
    When the readiness decision is evaluated
    Then the enrollment can be ready without a Finance payment-validation dependency
    And the readiness result records payment gate as not required

  Scenario: Enrollment with unapproved completion is not ready
    Given enrollment "ENR-A" exists
    And the Completion context reports completion status other than approved
    When the user requests readiness for "ENR-A"
    Then the readiness result is not ready
    And the blocking reason includes "COMPLETION_NOT_APPROVED"
    And no Certificate record is created

  Scenario: Required payment gate failure blocks readiness
    Given completion is approved for "ENR-A"
    And payment validation is required
    And the Finance context reports payment validation failed
    When readiness is evaluated
    Then the readiness result is not ready
    And the blocking reason includes "PAYMENT_VALIDATION_FAILED"

  Scenario: Existing active certificate prevents readiness for standard generation
    Given completion and payment gates pass for "ENR-A"
    And an active certificate already exists for "ENR-A"
    When readiness is evaluated
    Then the enrollment is not offered for standard certificate generation
    And the reason indicates a duplicate active certificate condition

  Scenario: Missing enrollment produces a not-found outcome
    Given enrollment "ENR-MISSING" does not exist
    When readiness is requested for "ENR-MISSING"
    Then the request fails with error code "ENROLLMENT_NOT_FOUND"

  Scenario: Inconsistent course or batch reference blocks readiness
    Given enrollment "ENR-A" references course "COURSE-A" and batch "BATCH-A"
    And the source context returns a certificate source snapshot with a mismatched batch
    When readiness is evaluated
    Then the request fails with error code "SOURCE_REFERENCE_INCONSISTENT"
    And no certificate command is enabled

  Scenario: Completion dependency outage does not convert to false eligibility
    Given the Completion service port is unavailable
    When readiness is requested for "ENR-A"
    Then the request fails with error code "COMPLETION_SERVICE_UNAVAILABLE"
    And the system does not return the enrollment as ready

  Scenario: Finance dependency outage blocks a required payment gate
    Given completion is approved
    And payment validation is required
    And the Finance validation port is unavailable
    When readiness is evaluated
    Then the request fails with error code "PAYMENT_VALIDATION_UNAVAILABLE"
    And no certificate is generated

  Scenario Outline: Readiness list supports valid date boundaries
    Given eligible enrollments exist on "<fromDate>" and "<toDate>"
    When the user filters readiness from "<fromDate>" to "<toDate>"
    Then both boundary dates are included according to the API date semantics

    Examples:
      | fromDate   | toDate     |
      | 2026-01-01 | 2026-01-01 |
      | 2026-01-01 | 2026-12-31 |
```

## Feature 2 – Certificate Generation

```gherkin
Feature: Generate a certificate
  In order to create an official certificate artifact candidate
  As an authorized Certificate Administrator
  I want to generate exactly one valid certificate transaction from an eligible enrollment

  Background:
    Given the operator is authenticated
    And the operator has permission "certificate.generate"
    And the operator has branch access to "BR-A"
    And enrollment "ENR-A" belongs to "BR-A"
    And completion is approved for "ENR-A"
    And all required payment validation has passed
    And no prohibited duplicate active certificate exists

  Scenario: Generate an English certificate successfully
    Given an active numbering series is available
    And verification-code generation can allocate a unique value
    And the certificate renderer is available
    When the operator generates a certificate for "ENR-A" in language "en"
    Then exactly one Certificate record is created
    And the Certificate is linked to enrollment "ENR-A"
    And the Certificate stores the correct student, course, and batch references
    And a unique certificate number is stored
    And a unique verification code is stored
    And a QR verification URL is stored
    And a certificate artifact URL is stored
    And the lifecycle state is "Generated"
    And the sensitive action is auditable

  Scenario: Generate an Arabic certificate successfully
    Given the source data required for Arabic rendering is available
    When the operator generates a certificate for "ENR-A" in language "ar"
    Then the certificate language is "ar"
    And the rendered artifact uses Arabic certificate presentation rules
    And identifiers remain exact and are not transliterated

  Scenario Outline: Unsupported language values are rejected
    When the operator attempts generation with language "<language>"
    Then generation fails with error code "UNSUPPORTED_CERTIFICATE_LANGUAGE"
    And no Certificate record is created

    Examples:
      | language |
      | fr       |
      | de       |
      | en-US    |
      | empty    |

  Scenario: Duplicate active certificate is rejected
    Given an active certificate already exists for "ENR-A"
    When the operator submits a new standard generation command
    Then the request fails with error code "DUPLICATE_ACTIVE_CERTIFICATE"
    And no second active certificate is created

  Scenario: Missing numbering configuration prevents partial certificate creation
    Given no active numbering series can allocate a certificate number
    When the operator generates a certificate
    Then the request fails with error code "CERTIFICATE_NUMBERING_UNAVAILABLE"
    And no partially initialized Certificate record is committed

  Scenario: Certificate number uniqueness conflict is handled safely
    Given the numbering allocation returns a certificate number that violates uniqueness
    When generation commits
    Then the operation fails with error code "CERTIFICATE_NUMBER_CONFLICT"
    And the transaction does not leave two certificates with the same number

  Scenario: Verification code uniqueness conflict is handled safely
    Given verification-code generation produces an already-used value
    When certificate generation attempts to commit
    Then the operation retries according to bounded retry policy or fails with "VERIFICATION_CODE_CONFLICT"
    And no two certificates share the same verification code

  Scenario: Renderer failure does not issue a certificate
    Given certificate numbering succeeds
    And artifact rendering fails
    When generation is executed
    Then the command fails with error code "CERTIFICATE_RENDER_FAILED"
    And no Certificate is left in "Issued" state
    And transactional persistence follows the defined atomicity boundary

  Scenario: Source state is revalidated at command time
    Given readiness was previously displayed as ready
    And before generation the Completion context changes authoritative state to not approved
    When the operator executes generation
    Then the command re-reads authoritative completion state
    And generation fails with "COMPLETION_NOT_APPROVED"
    And no Certificate record is created

  Scenario: Payment state is revalidated at command time
    Given readiness was previously displayed as ready
    And payment validation is required
    And before generation the Finance context reports payment validation failed
    When generation is executed
    Then generation fails with "PAYMENT_VALIDATION_FAILED"
    And no Certificate is created

  Scenario: Idempotent retry returns the previously generated certificate
    Given a generation command with idempotency key "GEN-KEY-1" succeeded for "ENR-A"
    When the identical command is retried with idempotency key "GEN-KEY-1"
    Then no new Certificate record is created
    And the original generated certificate response is returned or referenced

  Scenario: Reusing an idempotency key with a different payload is rejected
    Given idempotency key "GEN-KEY-1" was used for enrollment "ENR-A" and language "en"
    When the key is reused for a different enrollment or language
    Then the request fails with error code "IDEMPOTENCY_KEY_CONFLICT"

  Scenario: Concurrent generation requests create at most one standard certificate
    Given two valid generation commands for "ENR-A" arrive concurrently
    When both transactions attempt to create the active standard certificate
    Then at most one generation succeeds
    And the other receives a duplicate or concurrency conflict response
    And exactly one active standard Certificate exists for the enrollment
```

## Feature 3 – Certificate Issuance and Lifecycle State

```gherkin
Feature: Issue and control certificate lifecycle state

  Background:
    Given certificate "CERT-A" belongs to branch "BR-A"
    And the operator is authenticated
    And the operator has branch access to "BR-A"

  Scenario: Issue a generated certificate successfully
    Given "CERT-A" is in state "Generated"
    And the operator has permission "certificate.issue"
    And the artifact is available
    And authoritative gates still pass
    When the operator issues "CERT-A"
    Then its state becomes "Issued"
    And issued date is recorded
    And issued-by identity is recorded
    And the issuance transition is audited

  Scenario: Certificate cannot be issued directly from no record
    Given no certificate exists for identifier "CERT-MISSING"
    When issue is requested
    Then the request fails with "CERTIFICATE_NOT_FOUND"

  Scenario: Certificate cannot skip generation
    Given an attempt is made to represent a nonexistent certificate directly as issued
    When the issue command executes
    Then the command is rejected as an invalid lifecycle operation

  Scenario: Revoked certificate cannot be reissued by backward state transition
    Given "CERT-A" is in state "Revoked"
    And the operator has permission "certificate.issue"
    When the operator requests issuance
    Then the command fails with "INVALID_STATE_TRANSITION"
    And the state remains "Revoked"

  Scenario: Issue retry is idempotent
    Given "CERT-A" is already "Issued"
    And the same completed issue command is retried
    When the retry is processed
    Then no duplicate issuance transition is recorded
    And original issuance metadata is preserved

  Scenario: Stale version prevents lost update during issuance
    Given "CERT-A" has current version 8
    When an issue command is submitted with expected version 7
    Then the request fails with "VERSION_CONFLICT"
    And no lifecycle mutation occurs

  Scenario: Generated certificate cannot be issued after authoritative eligibility becomes invalid
    Given "CERT-A" is "Generated"
    And the Completion context no longer reports approved completion
    When issuance is requested
    Then issuance is rejected
    And the Certificate remains "Generated"
```

## Feature 4 – Registry, Detail, Search, and Artifact Download

```gherkin
Feature: Search and retrieve certificates

  Scenario: Authorized branch user searches certificate registry
    Given the user has "certificate.read"
    And the user is assigned to "BR-A"
    When the user searches certificates by certificate number, student, course, batch, language, status, and date range
    Then only matching certificates inside the effective branch scope are returned
    And pagination metadata is returned
    And results use deterministic ordering

  Scenario Outline: Supported sort fields sort deterministically
    Given multiple certificates match the query
    When the user sorts by "<sortField>" in "<direction>" order
    Then results are sorted by the requested field
    And a stable unique tie-breaker is applied

    Examples:
      | sortField        | direction |
      | certificateNumber | asc      |
      | issuedDate        | desc     |
      | createdAt         | desc     |

  Scenario: Unsupported sort field is rejected
    When a user requests sort field "passwordHash"
    Then the request fails with "UNSUPPORTED_SORT_FIELD"

  Scenario: Invalid date range is rejected
    When the user filters from "2026-12-31" to "2026-01-01"
    Then the request fails with "INVALID_DATE_RANGE"

  Scenario: Empty registry returns an explicit empty result
    Given no accessible certificates match the filters
    When the user searches the registry
    Then the result contains zero rows
    And pagination count is zero
    And the API does not return an error

  Scenario: Authorized user views certificate detail
    Given the user has "certificate.read"
    And "CERT-A" is within branch scope
    When the user opens certificate detail
    Then the Certificate-owned lifecycle data is returned
    And cross-context display fields are read-only projections

  Scenario: Artifact download succeeds for authorized user
    Given the user has "certificate.download"
    And "CERT-A" is within scope
    And its artifact is available
    When the user downloads the artifact
    Then the service returns or redirects to an authorized artifact access response

  Scenario: Missing artifact is reported explicitly
    Given "CERT-A" exists
    And no usable artifact is available
    When an authorized user requests download
    Then the request fails with "CERTIFICATE_ARTIFACT_UNAVAILABLE"

  Scenario: Student can view own certificate
    Given student "STU-A" is authenticated
    And the student has "certificate.student.read-own"
    And "CERT-A" belongs to an enrollment owned by "STU-A"
    When the student lists own certificates
    Then "CERT-A" is returned

  Scenario: Student cannot view another student's certificate
    Given student "STU-A" is authenticated
    And "CERT-B" belongs to student "STU-B"
    When student "STU-A" requests "CERT-B" detail
    Then access fails with "SELF_SCOPE_DENIED" or a privacy-preserving not-found response

  Scenario: Trainer can only view certificate status for assigned training scope
    Given trainer "TRAINER-A" is assigned to "BATCH-A"
    And the trainer has "certificate.trainer-status.read"
    When the trainer requests certificate status for assigned batch enrollments
    Then status rows for "BATCH-A" may be returned
    And certificates from unassigned batch "BATCH-B" are excluded
```

## Feature 5 – Public Certificate Verification

```gherkin
Feature: Public certificate verification
  In order to validate certificate authenticity without exposing private records
  As a Public Verifier
  I want a minimal verification response

  Scenario: Issued certificate verifies as valid
    Given certificate "CERT-A" is in state "Issued"
    And verification code "VC-A" belongs to "CERT-A"
    When the public verifier submits "VC-A"
    Then the verification outcome is "VALID"
    And only the approved minimal public fields are returned
    And a verification attempt may be recorded

  Scenario: Revoked certificate does not verify as valid
    Given certificate "CERT-A" is "Revoked"
    When verification code "VC-A" is submitted
    Then the response does not report the credential as valid
    And the outcome follows the privacy-safe invalid/revoked policy

  Scenario: Unknown verification code returns privacy-preserving outcome
    When code "VC-UNKNOWN" is submitted
    Then the response uses "INVALID_OR_NOT_FOUND"
    And it does not reveal whether a nearby certificate number exists

  Scenario: Generated but unissued certificate is not publicly valid
    Given "CERT-A" is in state "Generated"
    When its verification code is submitted publicly
    Then the outcome is not "VALID"

  Scenario: QR verification resolves through the same verification rule
    Given the QR reference resolves to verification code "VC-A"
    When the verifier scans the QR code
    Then the system applies the same lifecycle validity rules as direct code verification

  Scenario Outline: Verification input validation rejects malformed values
    When the verifier submits verification code "<code>"
    Then the request is rejected or returned as invalid according to public validation policy

    Examples:
      | code |
      |      |
      | x    |
      | <script>alert(1)</script> |
      | value exceeding maximum length |

  Scenario: Public verification response does not expose sensitive internal fields
    Given a valid issued certificate
    When it is verified publicly
    Then the response does not include internal user IDs
    And it does not include branch access metadata
    And it does not include payment details
    And it does not include audit history
    And it does not include private contact information

  Scenario: Repeated abusive verification attempts are rate limited
    Given a client exceeds the configured public verification rate threshold
    When another verification request is submitted
    Then the request fails with "RATE_LIMIT_EXCEEDED"

  Scenario: Verification attempt logging failure does not change certificate lifecycle
    Given "CERT-A" is "Issued"
    And verification-attempt persistence fails
    When public verification is evaluated successfully
    Then the Certificate state remains "Issued"
    And verification policy determines whether response delivery continues or fails safely
    And no Certificate lifecycle mutation occurs
```

## Feature 6 – Certificate Reissue Request Submission and Decision

```gherkin
Feature: Certificate reissue request workflow

  Scenario: Student submits a valid reissue request for own certificate
    Given student "STU-A" is authenticated
    And has "certificate.student.reissue-own"
    And "CERT-A" belongs to "STU-A"
    And no prohibited open reissue request exists
    When the student submits a non-empty valid reason
    Then one CertificateReissueRequest is created in "PendingReview"
    And requestedBy identifies the authenticated requester
    And the source Certificate is unchanged

  Scenario: Internal authorized user submits a reissue request
    Given the user has "certificate.reissue.submit"
    And the source Certificate is inside branch scope
    When the user submits a valid reason
    Then a "PendingReview" request is created

  Scenario: Missing reason is rejected
    When a reissue request is submitted without a reason
    Then the request fails with "REISSUE_REASON_REQUIRED"
    And no request is created

  Scenario: Reason exceeding configured maximum is rejected
    When a reissue reason exceeds the permitted length
    Then the request fails with "REISSUE_REASON_INVALID_LENGTH"

  Scenario: Duplicate open reissue request is rejected
    Given "RR-A" is already "PendingReview" for "CERT-A"
    When another open request is submitted for the same certificate under the duplicate-open rule
    Then the request fails with "REISSUE_REQUEST_ALREADY_OPEN"

  Scenario: Authorized approver approves pending request
    Given "RR-A" is "PendingReview"
    And the approver has "certificate.reissue.approve"
    And the request is within branch scope
    When the approver approves "RR-A"
    Then its state becomes "Approved"
    And approvedBy is recorded
    And approvedAt is recorded
    And the decision is audited

  Scenario: Authorized approver rejects pending request
    Given "RR-A" is "PendingReview"
    And the approver has "certificate.reissue.reject"
    And required rejection remarks are supplied
    When the approver rejects the request
    Then its state becomes "Rejected"
    And the decision is auditable

  Scenario: Required rejection remarks are enforced
    Given rejection remarks are mandatory by policy
    When an approver rejects without remarks
    Then the request fails with "REISSUE_REJECTION_REMARKS_REQUIRED"
    And the request stays "PendingReview"

  Scenario: Completed request cannot return to pending review
    Given "RR-A" is "Completed"
    When an authorized user attempts to reset it to "PendingReview"
    Then the command fails with "INVALID_STATE_TRANSITION"

  Scenario: Rejected request cannot be directly approved under current workflow
    Given "RR-A" is "Rejected"
    When an approval command is submitted
    Then the command fails with "REISSUE_REQUEST_TERMINAL" or "INVALID_STATE_TRANSITION"
```

## Feature 7 – Replacement Certificate Generation and Lineage

```gherkin
Feature: Generate replacement certificate from approved reissue request

  Background:
    Given reissue request "RR-A" references certificate "CERT-A"
    And the operator has permission "certificate.reissue.generate"
    And the operator is within effective branch scope

  Scenario: Generate replacement from approved request
    Given "RR-A" is "Approved"
    And `newCertificateId` is empty
    And required source references remain valid
    And numbering configuration is available
    When the operator generates the replacement
    Then exactly one new Certificate is created
    And "RR-A" is linked to the new Certificate through `newCertificateId`
    And "RR-A" becomes "Completed"
    And original certificate "CERT-A" remains queryable
    And lineage from original to request to replacement is preserved

  Scenario: Pending request cannot generate replacement
    Given "RR-A" is "PendingReview"
    When replacement generation is requested
    Then the command fails with "REISSUE_APPROVAL_REQUIRED"
    And no replacement Certificate is created

  Scenario: Rejected request cannot generate replacement
    Given "RR-A" is "Rejected"
    When replacement generation is requested
    Then the command fails with "REISSUE_NOT_APPROVED"

  Scenario: Completed request cannot create a second replacement
    Given "RR-A" is "Completed"
    And `newCertificateId` already references "CERT-REPLACEMENT-1"
    When replacement generation is retried
    Then no second replacement is created
    And the existing replacement is returned or referenced

  Scenario: Conflicting lineage is rejected
    Given "RR-A" is approved
    And a concurrent process has linked a different replacement certificate
    When another replacement command tries to link a new replacement
    Then the command fails with "REPLACEMENT_LINEAGE_CONFLICT" or "VERSION_CONFLICT"
    And exactly one `newCertificateId` remains authoritative

  Scenario: Original certificate history is preserved after replacement
    Given replacement generation completed
    When an auditor queries lifecycle lineage
    Then the original Certificate remains queryable
    And the ReissueRequest remains queryable
    And the replacement Certificate remains queryable
    And no hard delete has occurred
```

## Feature 8 – Certificate Revocation

```gherkin
Feature: Revoke an issued certificate

  Background:
    Given "CERT-A" belongs to branch "BR-A"
    And the user is authenticated
    And the user has permission "certificate.revoke"
    And the user has branch access to "BR-A"

  Scenario: Revoke issued certificate with valid reason
    Given "CERT-A" is "Issued"
    When the user revokes it with a valid reason
    Then the Certificate lifecycle state becomes "Revoked"
    And the old state, new state, actor, timestamp, and reason are auditable
    And public verification no longer reports the certificate as valid

  Scenario: Revocation reason is mandatory
    Given "CERT-A" is "Issued"
    When revocation is requested without a reason
    Then the request fails with "REVOCATION_REASON_REQUIRED"
    And the Certificate remains "Issued"

  Scenario: Excessively long revocation reason is rejected
    When revocation is requested with a reason exceeding the configured maximum
    Then the request fails with "REVOCATION_REASON_INVALID_LENGTH"

  Scenario: Generated certificate cannot use issued-certificate revocation transition
    Given "CERT-A" is "Generated"
    When revocation is requested
    Then the request fails with "INVALID_STATE_TRANSITION"

  Scenario: Revoked certificate cannot be restored to Issued
    Given "CERT-A" is "Revoked"
    When a lifecycle command attempts to restore "Issued"
    Then the command fails with "INVALID_STATE_TRANSITION"

  Scenario: Idempotent revoke retry does not create misleading duplicate transitions
    Given "CERT-A" is already "Revoked"
    And the same completed revoke command is retried
    Then the state remains "Revoked"
    And no duplicate business transition is created
```

## Feature 9 – Authorization Guards

```gherkin
Feature: Fine-grained authorization guards

  Scenario Outline: Transactional endpoint rejects user without required permission
    Given the user is authenticated
    And the user has branch access to the target record
    And the user does not have permission "<permission>"
    When the user invokes "<operation>"
    Then the request fails with "PERMISSION_DENIED"
    And no Certificate-owned transactional entity is mutated

    Examples:
      | operation              | permission                    |
      | generate certificate   | certificate.generate          |
      | issue certificate      | certificate.issue             |
      | revoke certificate     | certificate.revoke            |
      | approve reissue        | certificate.reissue.approve   |
      | reject reissue         | certificate.reissue.reject    |
      | generate replacement   | certificate.reissue.generate  |
      | request notification   | certificate.notification.request |

  Scenario Outline: Read endpoint rejects user without required permission
    Given the user is authenticated
    And the user does not have permission "<permission>"
    When the user requests "<resource>"
    Then the request fails with "PERMISSION_DENIED"

    Examples:
      | resource               | permission                              |
      | certificate registry   | certificate.read                        |
      | certificate artifact   | certificate.download                    |
      | reissue queue          | certificate.reissue.read                |
      | verification activity  | certificate.verification.activity.read  |
      | lifecycle audit        | certificate.audit.read                  |
      | executive report       | certificate.report.executive            |

  Scenario: Unauthenticated internal request is rejected
    Given no authenticated identity exists
    When a request is made to an internal Certificate API
    Then the request fails with "UNAUTHENTICATED"

  Scenario: Menu visibility does not grant action permission
    Given a user can see the Certificate Registry menu
    And the user has "certificate.menu.registry"
    And the user does not have "certificate.issue"
    When the user attempts to issue a certificate by calling the API directly
    Then the request fails with "PERMISSION_DENIED"

  Scenario: Finance role alone does not grant Certificate mutation rights
    Given a Finance User can provide authoritative payment status through Finance context
    And the Finance User does not have "certificate.generate"
    When the Finance User calls certificate generation
    Then the request fails with "PERMISSION_DENIED"

  Scenario: Executive report permission does not grant transactional write access
    Given the Executive Viewer has "certificate.report.executive"
    And consolidated-report entitlement
    When the Executive Viewer attempts to revoke a certificate
    Then the command fails with "PERMISSION_DENIED"

  Scenario: Public verifier can verify without internal IAM permission
    Given the public verification endpoint is enabled
    When an unauthenticated verifier submits a verification code
    Then the request is evaluated under public verification policy
    And internal permission "certificate.verify.internal" is not required
```

## Feature 10 – Branch Data Isolation and Scope

```gherkin
Feature: Server-side branch data isolation
  In order to prevent cross-branch data leakage
  All internal Certificate queries and commands must enforce IAM-derived scope on the server

  Scenario: Branch A user can read Branch A certificate
    Given user "USER-A" is assigned to "BR-A"
    And has "certificate.read"
    And "CERT-A" belongs to enrollment branch "BR-A"
    When "USER-A" requests "CERT-A"
    Then access is allowed

  Scenario: Branch A user cannot read Branch B certificate by direct ID
    Given user "USER-A" is assigned only to "BR-A"
    And "CERT-B" belongs to "BR-B"
    When "USER-A" requests `/certificates/CERT-B`
    Then access fails with "BRANCH_SCOPE_DENIED" or privacy-preserving not-found semantics
    And no Branch B certificate data is returned

  Scenario: Branch A user cannot issue Branch B certificate by direct API call
    Given the user has "certificate.issue"
    And is assigned only to "BR-A"
    And "CERT-B" belongs to "BR-B"
    When the user calls the issue endpoint for "CERT-B"
    Then the request fails with "BRANCH_SCOPE_DENIED"
    And "CERT-B" remains unchanged

  Scenario: Branch filter cannot expand scope beyond IAM assignment
    Given a user is assigned only to "BR-A"
    When the user supplies query parameter branchId="BR-B"
    Then the server does not trust the client filter as authorization
    And the request is rejected or returns no Branch B data

  Scenario: Parent branch user can access child branch when IAM allows child access
    Given user "HQ-USER" is assigned to "BR-HQ"
    And IAM grants child-branch access
    And "BR-A" is a child of "BR-HQ"
    When the user queries certificates in "BR-A"
    Then access is allowed within the IAM-expanded effective scope

  Scenario: Parent branch user cannot access child branch when child access is disabled
    Given user "HQ-USER" is assigned to "BR-HQ"
    And IAM does not grant child-branch access
    When the user requests a certificate in "BR-A"
    Then access fails with "BRANCH_SCOPE_DENIED"

  Scenario: Child branch user cannot infer parent branch records
    Given user "USER-A" is assigned only to child branch "BR-A"
    And "CERT-HQ" belongs to "BR-HQ"
    When "USER-A" searches and pages the registry
    Then "CERT-HQ" is absent from rows and aggregate counts

  Scenario: Consolidated report requires report permission and consolidated entitlement
    Given the user has "certificate.report.executive"
    But IAM does not grant consolidated-report entitlement
    When the user requests a consolidated certificate KPI report
    Then the request fails with "CONSOLIDATED_SCOPE_DENIED"

  Scenario: Consolidated entitlement without report permission is insufficient
    Given IAM grants consolidated-report entitlement
    But the user lacks "certificate.report.executive"
    When the user requests the executive certificate report
    Then the request fails with "PERMISSION_DENIED"

  Scenario: Global auditor access requires explicit global scope
    Given an auditor has "certificate.audit.read"
    But does not have explicit global access and only has "BR-A"
    When the auditor queries lifecycle records
    Then only "BR-A" records are returned

  Scenario: Public verification is not a branch-listing bypass
    Given a public verifier knows no branch credentials
    When the verifier calls public verification
    Then the response contains only minimal verification data
    And no branch registry, branch counts, or branch-filtered browsing API is exposed
```

## Feature 11 – Audit and Notification Integration

```gherkin
Feature: Audit sensitive actions and request notifications

  Scenario Outline: Sensitive state change is auditable
    Given an authorized user successfully performs "<action>"
    When the transaction commits
    Then audit information records entity type and entity ID
    And records action "<action>"
    And records performedBy and performedAt
    And records old and new state where applicable
    And records reason where required

    Examples:
      | action                |
      | certificate generated |
      | certificate issued    |
      | certificate revoked   |
      | reissue approved      |
      | reissue rejected      |
      | replacement generated |

  Scenario: Revocation audit captures mandatory reason
    Given an issued certificate is revoked successfully
    When audit history is read by an authorized auditor
    Then the revocation reason is available in the approved audit representation

  Scenario: Certificate module does not directly write NotificationLog
    Given a certificate issuance succeeds
    When notification processing is triggered
    Then Certificate Management creates or publishes a notification request/event contract
    And Communication context owns delivery attempt and NotificationLog persistence

  Scenario: Notification request failure does not roll back issued certificate
    Given certificate issuance transaction succeeds
    And Communication request submission fails after the certificate commit boundary
    When the failure is handled
    Then the certificate remains "Issued"
    And the failure is observable as "NOTIFICATION_REQUEST_FAILED"
    And retry handling does not repeat the issuance transition

  Scenario: Duplicate notification request is deduplicated by event identity
    Given a certificate-issued notification request was accepted for event "EVENT-1"
    When the same event is retried
    Then Communication integration does not create duplicate end-user messages beyond configured deduplication behavior

  Scenario: Verification activity is auditable/readable only with permission
    Given verification attempts exist for "CERT-A"
    And the user lacks "certificate.verification.activity.read"
    When the user requests verification activity
    Then the request fails with "PERMISSION_DENIED"
```

## Feature 12 – Reports, KPIs, and Read-Only Read Models

```gherkin
Feature: Certificate reporting and analytics

  Scenario: Branch-scoped operational dashboard returns only accessible branch facts
    Given the user has the required dashboard/report permission
    And IAM scope contains only "BR-A"
    When the user opens the Certificate operational dashboard
    Then all KPI counts and widget rows are derived only from "BR-A" facts

  Scenario: Consolidated executive KPI requires consolidated scope
    Given the user has executive report permission
    And IAM grants consolidated-report entitlement
    When the user requests consolidated Certificate KPIs
    Then metrics may aggregate all branches in the permitted consolidated scope

  Scenario: Registry report supports filters and deterministic sort
    Given certificates exist across statuses, languages, courses, batches, and dates
    When an authorized user filters and sorts the Registry Report
    Then returned rows satisfy all filters
    And sorting uses supported fields plus a deterministic tie-breaker

  Scenario Outline: Authorized report export produces expected format
    Given the user has "certificate.report.export"
    And the user can access the underlying report
    When the user exports as "<format>"
    Then the system produces an export in "<format>"
    And branch and field-level security remains applied

    Examples:
      | format |
      | CSV    |
      | XLSX   |
      | PDF    |

  Scenario: Export permission alone cannot bypass report access
    Given the user has "certificate.report.export"
    But lacks permission for the requested verification activity report
    When export is requested
    Then the request fails with "PERMISSION_DENIED"

  Scenario: Read model is read-only
    Given `certificate_registry_read` is available
    When a client attempts a lifecycle mutation through the reporting surface
    Then no mutation endpoint is available
    And Certificate transactional tables remain the only authoritative write target for Certificate commands

  Scenario: Stale read model does not authorize a command
    Given a readiness projection shows "ENR-A" as ready
    But authoritative Completion state changed to not approved
    When generation is submitted
    Then the command revalidates authoritative state
    And generation is rejected
    And the stale projection is not treated as command authority

  Scenario: MetricSnapshot does not replace Certificate transaction state
    Given a KPI snapshot reports 100 issued certificates
    And one authoritative Certificate has since been revoked
    When a revocation-sensitive business decision is made
    Then the decision reads authoritative Certificate state
    And does not infer validity from the snapshot
```

## Feature 13 – Concurrency, Idempotency, Soft Delete, and Historical Integrity

```gherkin
Feature: Protect certificate lifecycle integrity under retries and concurrent actions

  Scenario: Concurrent issue commands do not duplicate issuance transition
    Given "CERT-A" is "Generated" at version 4
    When two issue commands execute concurrently using expected version 4
    Then at most one state transition succeeds
    And the other fails with "VERSION_CONFLICT" or returns the completed idempotent result
    And issued metadata has one authoritative value

  Scenario: Concurrent revoke commands preserve one authoritative transition
    Given "CERT-A" is "Issued"
    When two revoke commands with the same valid reason race
    Then one authoritative revocation transition is committed
    And retries do not create contradictory states

  Scenario: Reissue decision race cannot approve and reject simultaneously
    Given "RR-A" is "PendingReview" at version 3
    When an approval and rejection command execute concurrently
    Then exactly one terminal decision wins
    And the losing command fails with "VERSION_CONFLICT" or terminal-state error

  Scenario: Concurrent replacement generation creates one lineage target
    Given "RR-A" is "Approved"
    And `newCertificateId` is empty
    When two replacement generation commands race
    Then exactly one replacement becomes linked to `newCertificateId`
    And no ambiguous lineage is committed

  Scenario: Soft-deleted historical records are not hard-deleted by normal operations
    Given a Certificate record is administratively soft-deleted under repository convention
    When normal cleanup or lifecycle commands run
    Then the database row remains historically recoverable according to retention policy
    And related audit history is preserved

  Scenario: Soft delete is not equivalent to revocation
    Given an issued certificate is soft-deleted administratively
    When business validity is evaluated
    Then the system does not silently treat soft-delete metadata as the Revoked lifecycle transition
    And lifecycle semantics remain explicit

  Scenario: Historical reissue lineage survives original replacement lifecycle changes
    Given "CERT-A" has replacement "CERT-R1" through "RR-A"
    When either certificate later changes permitted lifecycle state
    Then the original request lineage remains queryable
    And no cascade delete removes historical certificates
```

## Feature 14 – DDD Ownership and Aggregate Boundary Compliance

```gherkin
Feature: Preserve DDD ownership boundaries for Certificate Management
  In order to keep bounded contexts consistent
  Certificate Management must own Certificate lifecycle behavior without mutating Completion, Finance, IAM, or Reporting transaction data

  Scenario: Certificate generation consumes completion approval but does not mutate CourseCompletion
    Given CourseCompletion for "ENR-A" is owned by Exam, Result & Completion Management
    And the Completion context reports the enrollment as approved
    When Certificate Management generates a certificate
    Then a Certificate-owned transaction may be created
    But no CourseCompletion row is inserted, updated, approved, or deleted by Certificate Management
    And no CompletionApproval record is created by the Certificate command

  Scenario: Certificate issuance consumes payment validation but does not mark invoices paid
    Given payment truth is owned by Fee, Billing & Receivables Management
    And Finance reports that the required payment gate passes
    When Certificate Management issues a certificate
    Then the Certificate lifecycle may transition to "Issued"
    But no Invoice, Payment, Receipt, Refund, or Receivable record is modified by Certificate Management

  Scenario: Failed payment validation cannot be overridden by Certificate command payload
    Given Finance reports payment validation failed for "ENR-A"
    And a client sends `paymentCompleted=true` in a certificate-generation request payload
    When Certificate Management processes the command
    Then the client-supplied payment flag is ignored or rejected as unsupported
    And authoritative Finance validation determines the outcome
    And generation fails with "PAYMENT_VALIDATION_FAILED"

  Scenario: Failed completion approval cannot be overridden by Certificate command payload
    Given Completion reports completion not approved
    And a client sends `completionApproved=true` to the Certificate API
    When generation is attempted
    Then authoritative Completion state is used
    And no certificate is generated

  Scenario: Certificate revocation mutates only Certificate-owned lifecycle state and audit integration
    Given "CERT-A" is "Issued"
    When an authorized revocation succeeds
    Then Certificate-owned lifecycle state changes to "Revoked"
    And the Audit context records the sensitive action through its contract
    But Enrollment status is not changed
    And CourseCompletion approval is not changed
    And Finance records are not changed

  Scenario: Reporting projection cannot issue a certificate
    Given a row exists in `certificate_registry_read`
    When a reporting process or user attempts to change the row from Generated to Issued
    Then the read model rejects or provides no write capability
    And issuance requires the Certificate aggregate application service

  Scenario: Certificate module does not own IAM role assignment
    Given a user lacks "certificate.issue"
    When Certificate Management receives an issue request
    Then it asks IAM-derived authorization policy for the decision
    And it does not assign a role or permission to the user
    And the command is denied

  Scenario: Communication delivery status is not written by Certificate aggregate
    Given Certificate issuance produces a notification request
    When Communication delivery succeeds or fails
    Then NotificationLog and deliveryStatus are owned and updated by Communication context
    And Certificate state remains independent of delivery status

  Scenario: Enrollment remains the central learning-lifecycle reference
    Given a certificate is generated for student "STU-A", course "COURSE-A", and batch "BATCH-A"
    When the Certificate is persisted
    Then it links to enrollment "ENR-A"
    And enrollment remains the central business transaction connecting student, course, and batch
    And the Certificate module does not create a parallel learning-lifecycle aggregate
```

# 5. API-Level Acceptance Matrix

| Endpoint | Positive Test | Negative / Validation Test | Authorization Test | Branch/Self Scope Test |
|---|---|---|---|---|
| `GET /api/v1/certificates/readiness` | Returns eligible rows | Invalid filters/date range | Missing `certificate.read` | Excludes inaccessible branches |
| `GET /api/v1/certificates/readiness/{enrollmentId}` | Returns readiness decision | Missing enrollment | Unauthenticated/permission denied | Cross-branch enrollment denied |
| `POST /api/v1/certificates` | Generates eligible certificate | Completion/payment/duplicate/language failure | Missing `certificate.generate` | Cross-branch generation denied |
| `GET /api/v1/certificates` | Paginated registry | Unsupported sort/date filter | Missing `certificate.read` | Branch filter cannot expand scope |
| `GET /api/v1/certificates/{certificateId}` | Returns detail | Unknown ID | Missing read permission | Cross-branch direct-ID denied |
| `GET /api/v1/certificates/{certificateId}/artifact` | Returns artifact access | Artifact unavailable | Missing download permission | Cross-branch denied |
| `POST /api/v1/certificates/{certificateId}/issue` | Generated→Issued | Invalid state/stale version | Missing issue permission | Cross-branch denied |
| `POST /api/v1/certificates/{certificateId}/revoke` | Issued→Revoked | Missing reason/invalid state | Missing revoke permission | Cross-branch denied |
| `GET /api/v1/certificates/{certificateId}/verification-activity` | Returns activity | Unknown ID | Missing activity permission | Cross-branch/global rules enforced |
| `GET /api/v1/certificates/{certificateId}/lifecycle` | Returns lifecycle | Unknown ID | Missing audit permission | Effective audit scope enforced |
| `POST /api/v1/certificate-reissue-requests` | Creates pending request | Empty reason/open duplicate | Missing submit permission | Cross-branch source denied |
| `GET /api/v1/certificate-reissue-requests` | Lists queue | Invalid filters | Missing reissue read | Branch isolation enforced |
| `GET /api/v1/certificate-reissue-requests/{requestId}` | Returns request detail | Unknown ID | Missing reissue read | Cross-branch denied |
| `POST /api/v1/certificate-reissue-requests/{requestId}/approve` | Pending→Approved | Terminal/stale version | Missing approve permission | Cross-branch denied |
| `POST /api/v1/certificate-reissue-requests/{requestId}/reject` | Pending→Rejected | Missing remarks when required | Missing reject permission | Cross-branch denied |
| `POST /api/v1/certificate-reissue-requests/{requestId}/replacement` | Approved→Completed | Not approved/already generated | Missing generate permission | Cross-branch denied |
| `POST /api/public/v1/certificates/verify` | Valid verification | Malformed/unknown/rate limit | Public policy; no internal IAM required | No registry browsing capability |
| `GET /api/public/v1/certificates/verify/{verificationCode}` | Valid verification | Unknown/malformed | Public policy | Minimal data only |
| `GET /api/v1/me/certificates` | Lists own certificates | Empty self result | Auth required | Other students excluded |
| `GET /api/v1/me/certificates/{certificateId}` | Own detail | Unknown ID | Self permission | Other student denied |
| `GET /api/v1/me/certificates/{certificateId}/artifact` | Own artifact | Artifact missing | Self download permission | Other student denied |
| `POST /api/v1/me/certificate-reissue-requests` | Own request | Invalid reason/duplicate | Self reissue permission | Other student's cert denied |
| `GET /api/v1/me/certificate-reissue-requests` | Own requests | Empty result | Auth/self permission | Other students excluded |
| `GET /api/v1/trainer/certificates/status` | Assigned scope status | Invalid filter | Trainer permission | Unassigned batches excluded |
| `GET /api/v1/certificates/dashboard` | Scoped widgets | Invalid date range | Dashboard/report permission | Branch/consolidated rules enforced |
| `GET /api/v1/certificates/reports/registry` | Filtered report | Invalid sort/date | Report permission | Scoped rows and counts |
| `POST /api/v1/certificates/reports/registry/export` | CSV/XLSX/PDF | Unsupported format | Report + export permissions | Scope retained in export |
| `POST /api/v1/certificates/{certificateId}/notifications` | Requests notification | Invalid event/template payload | Notification permission | Cross-branch denied |

# 6. Authorization Guard Test Cases

| Test ID | Given | When | Expected |
|---|---|---|---|
| AUTH-CERT-001 | Unauthenticated request | Access internal API | `UNAUTHENTICATED`; no data/mutation |
| AUTH-CERT-002 | Authenticated, no `certificate.generate` | POST generation | `PERMISSION_DENIED`; no Certificate created |
| AUTH-CERT-003 | Menu permission only | Call issue API | Denied; menu visibility never authorizes action |
| AUTH-CERT-004 | Read permission only | Revoke issued certificate | Denied; state unchanged |
| AUTH-CERT-005 | Reissue read only | Approve request | Denied; request remains PendingReview |
| AUTH-CERT-006 | Report export only | Export inaccessible report | Denied; export permission not sufficient alone |
| AUTH-CERT-007 | Executive report permission, no consolidated entitlement | Consolidated report | `CONSOLIDATED_SCOPE_DENIED` |
| AUTH-CERT-008 | Consolidated entitlement, no report permission | Consolidated report | `PERMISSION_DENIED` |
| AUTH-CERT-009 | Student own-read permission | Read another student's certificate | `SELF_SCOPE_DENIED` or privacy-safe not found |
| AUTH-CERT-010 | Trainer status permission | Read unassigned batch | Data excluded/denied according to endpoint contract |
| AUTH-CERT-011 | Finance role without Certificate grant | Generate certificate | Denied; role identity does not imply Certificate permission |
| AUTH-CERT-012 | Auditor with scoped audit permission | Read outside scope | Denied/excluded unless explicit global scope exists |
| AUTH-CERT-013 | Public anonymous user | Call public verify | Allowed under rate/input policy |
| AUTH-CERT-014 | Public anonymous user | Call internal registry | `UNAUTHENTICATED` |

# 7. Branch Isolation Test Cases

| Test ID | Scenario | Expected Result |
|---|---|---|
| BRANCH-CERT-001 | BR-A user lists registry containing BR-A and BR-B data | Only BR-A rows/counts returned |
| BRANCH-CERT-002 | BR-A user requests BR-B certificate by known ID | Denied or privacy-safe not found; no BR-B payload |
| BRANCH-CERT-003 | BR-A issuer calls issue for BR-B certificate | `BRANCH_SCOPE_DENIED`; target unchanged |
| BRANCH-CERT-004 | BR-A revoker calls revoke for BR-B certificate | Denied; target remains Issued |
| BRANCH-CERT-005 | BR-A reissue approver opens BR-B request | Denied or excluded |
| BRANCH-CERT-006 | Client sends branchId=BR-B while assigned only BR-A | Filter cannot expand server scope |
| BRANCH-CERT-007 | Parent user with `canViewChildBranches=true` requests child | Allowed |
| BRANCH-CERT-008 | Parent user with child access disabled requests child | Denied |
| BRANCH-CERT-009 | Child user requests parent branch data | Denied unless separately assigned |
| BRANCH-CERT-010 | Multi-branch user switches to assigned branch | Data limited to selected/effective allowed scope |
| BRANCH-CERT-011 | Consolidated report without `canViewConsolidated` | `CONSOLIDATED_SCOPE_DENIED` |
| BRANCH-CERT-012 | Export report under BR-A scope | Export contains no BR-B rows or aggregate leakage |
| BRANCH-CERT-013 | Dashboard KPI under BR-A scope | KPI numerator and denominator both scoped to BR-A |
| BRANCH-CERT-014 | Direct artifact URL attempt for BR-B certificate | Application authorization or short-lived secured artifact policy prevents bypass |
| BRANCH-CERT-015 | Public verification of a valid code | Minimal verification response; no branch browsing or cross-branch enumeration |

# 8. Boundary and Validation Test Matrix

| Test ID | Boundary | Expected |
|---|---|---|
| VAL-CERT-001 | Empty certificate language | Validation error or default only if contract explicitly defines default; must not silently accept unsupported value |
| VAL-CERT-002 | Language `en` | Accepted |
| VAL-CERT-003 | Language `ar` | Accepted |
| VAL-CERT-004 | Any other language | `UNSUPPORTED_CERTIFICATE_LANGUAGE` |
| VAL-CERT-005 | Reissue reason empty/whitespace | `REISSUE_REASON_REQUIRED` |
| VAL-CERT-006 | Reissue reason at configured minimum | Accepted |
| VAL-CERT-007 | Reissue reason at configured maximum | Accepted |
| VAL-CERT-008 | Reissue reason above maximum | `REISSUE_REASON_INVALID_LENGTH` |
| VAL-CERT-009 | Revocation reason empty | `REVOCATION_REASON_REQUIRED` |
| VAL-CERT-010 | Revocation reason at maximum | Accepted |
| VAL-CERT-011 | Revocation reason above maximum | `REVOCATION_REASON_INVALID_LENGTH` |
| VAL-CERT-012 | fromDate equals toDate | Accepted; single-day semantics apply |
| VAL-CERT-013 | fromDate before toDate | Accepted |
| VAL-CERT-014 | fromDate after toDate | `INVALID_DATE_RANGE` |
| VAL-CERT-015 | page size zero | Validation error |
| VAL-CERT-016 | page size above configured maximum | Validation error or capped only if contract explicitly states capping |
| VAL-CERT-017 | unsupported sort field | `UNSUPPORTED_SORT_FIELD` |
| VAL-CERT-018 | empty verification code | Public-safe invalid/validation response |
| VAL-CERT-019 | verification code above maximum length | Rejected before lookup |
| VAL-CERT-020 | stale expected version | `VERSION_CONFLICT` |
| VAL-CERT-021 | same idempotency key, same payload | Existing success returned; no duplicate mutation |
| VAL-CERT-022 | same idempotency key, different payload | `IDEMPOTENCY_KEY_CONFLICT` |

# 9. State Transition Test Matrix

## 9.1 Certificate State

| From | Command | To | Expected |
|---|---|---|---|
| None | Generate eligible certificate | Generated | Allowed |
| None | Issue | Issued | Forbidden |
| None | Revoke | Revoked | Forbidden |
| Generated | Issue | Issued | Allowed with guards |
| Generated | Revoke | Revoked | Forbidden under current workflow |
| Generated | Generate retry same command | Generated | Idempotent, no duplicate |
| Issued | Revoke | Revoked | Allowed with permission and reason |
| Issued | Issue retry | Issued | Idempotent |
| Issued | Move to Generated | Generated | Forbidden |
| Revoked | Revoke retry | Revoked | Idempotent |
| Revoked | Issue | Issued | Forbidden |
| Revoked | Generate reset | Generated | Forbidden |

## 9.2 Reissue Request State

| From | Command | To | Expected |
|---|---|---|---|
| None | Submit | PendingReview | Allowed |
| PendingReview | Approve | Approved | Allowed |
| PendingReview | Reject | Rejected | Allowed |
| PendingReview | Generate replacement | Completed | Forbidden |
| Approved | Generate replacement | Completed | Allowed |
| Approved | Approval retry | Approved | Idempotent |
| Rejected | Approve | Approved | Forbidden under current model |
| Rejected | Generate replacement | Completed | Forbidden |
| Completed | Reset | PendingReview | Forbidden |
| Completed | Replacement retry | Completed | Idempotent, no second replacement |

# 10. Cross-Context Contract Tests

| Test ID | Contract | Verification |
|---|---|---|
| XCTX-CERT-001 | Completion eligibility | Certificate generation reads approved completion result; does not update Completion tables |
| XCTX-CERT-002 | Payment validation | Certificate command reads pass/fail result; does not update Invoice/Payment/Receipt/Receivable |
| XCTX-CERT-003 | Number allocation | Certificate requests next number through Configuration-owned contract; does not directly mutate NumberingSeries outside defined port |
| XCTX-CERT-004 | IAM authorization | Server checks permission and effective branch scope for every internal operation |
| XCTX-CERT-005 | Audit | Sensitive action emits/requests audit recording; Certificate does not become owner of AuditLog |
| XCTX-CERT-006 | Communication | Certificate emits notification request/event; Communication owns NotificationLog and delivery status |
| XCTX-CERT-007 | Reporting | Certificate lifecycle facts feed read-only projections; projections cannot mutate transactional tables |
| XCTX-CERT-008 | Enrollment reference | Certificate links to Enrollment and does not create alternate student-course-batch lifecycle ownership |

# 11. Non-Functional Acceptance Scenarios Relevant to Functional Correctness

```gherkin
Feature: Operational correctness under failure

  Scenario: Dependency timeout does not create half-issued certificate
    Given an issuance command requires authoritative gate revalidation
    And the required source-context dependency times out before decision
    When issuance is attempted
    Then the command fails safely
    And Certificate state remains unchanged

  Scenario: Audit recording failure follows configured sensitive-action consistency policy
    Given a sensitive lifecycle transition requires audit recording
    And the Audit integration fails
    When the transition reaches its defined consistency boundary
    Then behavior matches the configured atomic/fail-closed policy
    And the system never reports an unauditable successful sensitive action contrary to policy

  Scenario: Reporting publication failure does not corrupt transactional state
    Given a Certificate lifecycle transaction has committed
    And publication to reporting projection fails
    Then authoritative Certificate state remains correct
    And the failure is observable as "REPORTING_PUBLICATION_FAILED"
    And projection recovery can replay/rebuild without rewriting Certificate business state
```

# 12. Required Test Data Isolation Rules

1. Each automated test must create isolated Certificate, Enrollment reference, and ReissueRequest identifiers.
2. Branch-scope tests must include at least two sibling branches and one parent/child branch relationship.
3. Public verification tests must use verification codes that cannot collide across parallel runs.
4. Concurrency tests must use transactional barriers or deterministic synchronization rather than timing-only assertions.
5. Idempotency tests must persist and reuse the same idempotency key within the configured retention window.
6. Reporting tests must distinguish transactional source time from projection refresh time.
7. Tests must never mutate Completion or Finance fixtures through Certificate APIs; upstream authoritative fixture setup must use those contexts' own test builders or integration stubs.
8. Soft-delete tests must verify the underlying row/history remains preserved according to repository conventions.

# 13. Definition of Done for Part 9 Acceptance Coverage

Module 11 acceptance coverage is complete only when:

- every Certificate-owned command has positive, negative, permission, scope, and state-transition tests;
- every public verification flow has privacy, malformed-input, revoked-state, and rate-limit tests;
- every reissue transition has allowed and forbidden-transition tests;
- direct-ID and list-query branch isolation are both tested;
- parent/child branch access is tested in both allowed and denied configurations;
- student self-scope and trainer assignment scope are tested;
- idempotency and optimistic-concurrency races are tested;
- read-model staleness cannot authorize transactional commands;
- cross-context tests prove Completion and Finance are read as authoritative dependencies but are not mutated by Certificate commands;
- audit and notification side effects preserve context ownership;
- no test assumes a Prisma enum name that has not been verified against `schema.prisma`;
- unresolved ER/DDD gaps are not hidden by tests that invent unsupported persistence structures.

# 14. DDD and ER Consistency Confirmation

The scenarios in this document preserve the following source-model constraints:

- `Certificate` is the core aggregate root for issuance, verification, reissue-related lineage, and revocation behavior.
- Certificate generation and issuance depend on an existing central `Enrollment` reference.
- Exam, Result & Completion Management owns completion evaluation and approval.
- Fee, Billing & Receivables Management owns payment truth.
- Identity & Access Management owns role/permission and branch-access decisions.
- Audit & Compliance owns audit persistence and approval-history records.
- Communication owns notification templates, delivery attempts, and notification logs.
- Reporting read models are read-only consumers and do not replace `Certificate`, `CertificateVerification`, or `CertificateReissueRequest` transactional tables.

Known source-model gaps remain explicit test assumptions requiring later schema confirmation:

1. `Certificate.certificateStatus` semantic states are required by this FRD, but exact persistence enum names remain to be validated.
2. `CertificateReissueRequest.status` semantic states are required by this FRD, but exact persistence enum names remain to be validated.
3. DDD mentions `CertificateIssueLog`, but the ER baseline has no corresponding entity; no independent CRUD behavior is tested for it.
4. QR behavior is tested through the Certificate verification reference because the ER stores `qrCodeUrl` directly on Certificate.
5. Revocation metadata structure requires schema resolution; acceptance tests assert lifecycle status plus mandatory audit reason, without inventing unapproved columns.
6. Enrollment-to-Certificate replacement cardinality remains a source-model ambiguity; replacement tests assert lineage integrity and exactly one replacement per completed reissue request without assuming an unapproved global uniqueness constraint on `Certificate.enrollmentId`.
7. Prisma-level physical schema validation remains pending until `packages/database/prisma/schema.prisma` is available.

## Final Acceptance Statement

The acceptance suite demonstrates that Certificate Management owns and protects the Certificate aggregate lifecycle while collaborating with, but not taking ownership of, Completion, Finance, IAM, Audit, Communication, Configuration, Enrollment, and Reporting concerns. At least one explicit DDD ownership proof is provided in Feature 14, and the suite contains dedicated authorization and branch-isolation tests required for production acceptance.
