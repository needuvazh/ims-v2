# Functional Requirement Document (Part 9)
## Module 04: Admission & Enrollment Management - BDD Test Scenarios

---

## Feature: Student Profile and Admission Lifecycle

Scenario: Create student profile from matched person
  Given the Registrar is logged in with permission "admission.create"
  And a matching Person exists
  When the Registrar creates a StudentProfile for that Person
  Then the system creates a StudentProfile with a unique studentNumber
  And publishes StudentProfileCreated

Scenario: Reject duplicate person linkage
  Given a StudentProfile already exists for the Person
  When the Registrar attempts to create another StudentProfile
  Then the system rejects the request with error code "ERR_ADM_DUPLICATE_PERSON"

Scenario: Deny cross-branch admission access
  Given the user is restricted to branch "Sohar"
  And an Admission exists in branch "Muscat"
  When the user requests the admission details
  Then the system returns 403 Forbidden

Scenario: Block admission approval when document verification fails
  Given an Admission is ready for approval
  And the Document Management context reports verification failure
  When the Branch Manager approves the admission
  Then the system rejects the approval with error code "ERR_DOC_VERIFICATION_FAILED"

---

## Feature: Enrollment Lifecycle

Scenario: Create enrollment draft
  Given an approved Admission exists
  And an active Course and Batch exist
  When the Registrar creates an enrollment draft
  Then the system creates an Enrollment in Draft status
  And resolves pricing using batch, then branch, then global course pricing

Scenario: Block enrollment approval when batch is full
  Given a Batch is at full capacity
  When the Branch Manager approves the enrollment
  Then the system rejects the action with error code "ERR_ENR_BATCH_FULL"

Scenario: Route full batch to waitlist
  Given a Batch is at full capacity
  And waitlisting is enabled
  When the Branch Manager approves the enrollment
  Then the system creates a waitlist entry in Training Delivery
  And keeps the enrollment pending

Scenario: Confirm enrollment after payment receipt
  Given an Enrollment is Approved and payment validation is required
  And Finance publishes ReceiptGenerated
  When the system processes the receipt event
  Then the system transitions the enrollment to Confirmed
  And sets confirmedAt

Scenario: Drop active enrollment
  Given an Enrollment is Active
  When the Branch Manager drops the enrollment
  Then the system transitions the enrollment to Dropped
  And publishes EnrollmentCancelled

Scenario: Prevent confirmation without payment clearance
  Given an Enrollment is Approved and payment validation is required
  When the system receives no payment clearance
  Then the system blocks confirmation with error code "ERR_ENR_PAYMENT_INCOMPLETE"

Scenario: Soft delete admission preserves audit trail
  Given a draft Admission exists in the active branch
  When the Registrar soft deletes the Admission
  Then the system marks isDeleted as true
  And writes an AuditLog entry

Scenario: Deny report export without permission
  Given the user does not have report.branch_enrollments permission
  When the user requests an enrollment export
  Then the system rejects the request with 403 Forbidden

Scenario: Deny cross-branch student read
  Given the user is scoped to branch "Sohar"
  And a StudentProfile exists in branch "Muscat"
  When the user requests that student profile
  Then the system rejects the request with 403 Forbidden
