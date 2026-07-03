## ADDED Requirements

### Requirement: Admission Document Capture
The system SHALL allow the admin portal to attach and manage admission-supporting documents for a person, student profile, admission, or enrollment record without owning the underlying document entity.

#### Scenario: Upload document for admission review
- **WHEN** an authorized admissions user uploads a civil ID, passport scan, or other required document against an admission workflow record
- **THEN** the system SHALL create the document through the Documents context, link it to the Module 04 record by reference, and expose the document status to the admin portal.

#### Scenario: Reject document capture outside branch scope
- **WHEN** a user attempts to attach a document to an admission or enrollment record for a branch they are not authorized to access
- **THEN** the system SHALL reject the action with a `403 Forbidden` response and SHALL NOT create or link the document reference.

---

### Requirement: Mandatory Document Verification Gate
The system SHALL require mandatory document verification before admission approval, lead conversion handoff completion, or enrollment confirmation when the workflow declares document evidence as required.

#### Scenario: Block approval when required evidence is missing
- **WHEN** an admission or enrollment approval is requested and at least one required document type is missing, unverified, expired, or rejected
- **THEN** the system SHALL block the approval, return a validation error, and identify the missing document types in the response.

#### Scenario: Allow approval when all required documents are verified
- **WHEN** all required document types for the workflow are present and marked verified in the Documents context
- **THEN** the system SHALL allow the downstream admission or enrollment workflow to proceed.

---

### Requirement: Document Verification Handoff
The system SHALL delegate verification status management to the Documents context and consume verification results as read-only evidence in Module 04 workflows.

#### Scenario: Consume verification result from Documents context
- **WHEN** the Documents context marks a linked document as verified or rejected
- **THEN** the system SHALL read the updated verification status and use it in admission and enrollment gating without mutating the document record directly.

#### Scenario: Record verification-related audit activity
- **WHEN** a user requests document upload, re-upload, verification review, or a document-dependent approval action
- **THEN** the system SHALL write an audit record with the user, branch, record reference, and action taken.

---

### Requirement: Document Access Visibility
The system SHALL expose document status and metadata needed for admissions and enrollment review while masking raw file details from unauthorized users.

#### Scenario: Show document status in admin review screens
- **WHEN** an authorized user opens admission or enrollment detail screens
- **THEN** the system SHALL display document type, verification status, and timestamps needed for workflow review.

#### Scenario: Hide document details from unauthorized users
- **WHEN** a user without admission or enrollment branch access requests document-linked workflow data
- **THEN** the system SHALL omit document metadata and file references and return a `403 Forbidden` response.
