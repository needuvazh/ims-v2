## ADDED Requirements

### Requirement: View Certificate-Ready Enrollments
The system SHALL provide a branch-scoped queue of enrollments that have approved completion status in the Exam context, satisfy the required payment validation in the Finance context (if `paymentValidationRequired` is true), and do not already have an active certificate.

#### Scenario: View ready enrollment
- **WHEN** An operator queries the readiness list for branch "BR-A"
- **THEN** Enrollments belonging to "BR-A" with approved completion status and satisfied payment validation are returned, showing student, course, batch, branch, and readiness summary.

#### Scenario: Blocked by completion
- **WHEN** An enrollment completion status is not approved
- **THEN** The enrollment is marked as blocked with reason "COMPLETION_NOT_APPROVED".

#### Scenario: Blocked by payment
- **WHEN** An enrollment requires payment validation and the Finance validation status is not passed
- **THEN** The enrollment is marked as blocked with reason "PAYMENT_VALIDATION_FAILED".

---

### Requirement: Generate Certificate
The system SHALL generate a unique certificate record and render the certificate PDF using the approved hardcoded ASTI template in the requested language (English or Arabic), allocating a unique certificate number and an opaque verification code.

#### Scenario: Generate English certificate successfully
- **WHEN** An operator generates a certificate in "en" for an eligible enrollment
- **THEN** A Certificate is created in "Generated" status, a unique certificate number is allocated, a unique verification code and QR reference are generated, the PDF is rendered and stored, and the event is audited.

#### Scenario: Prevent duplicate active certificate
- **WHEN** A certificate is already generated or issued for an enrollment
- **THEN** Any subsequent standard generation request for the same enrollment is rejected with error code "DUPLICATE_ACTIVE_CERTIFICATE".

---

### Requirement: Issue Certificate
The system SHALL transition a generated certificate to "Issued" status upon explicit operational confirmation, recording the timestamp and authenticated user ID, and requesting delivery.

#### Scenario: Issue generated certificate successfully
- **WHEN** An operator issues a certificate in "Generated" status within their authorized branch
- **THEN** The certificate status becomes "Issued", `issuedDate` is set to the server timestamp, `issuedBy` is set to the operator's user ID, an audit record is logged, and a delivery request is sent to the Communication context.
